import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Read body FIRST before anything else
    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    const targetFeedId = body.feed_id || null;

    // Auth check
    try {
      const user = await base44.auth.me();
      if (user?.role !== 'admin') {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }
    } catch (_) {
      // No user = called from scheduler, allowed
    }

    const client = base44.asServiceRole;

    // Get feeds
    const feeds = await client.entities.XMLFeed.filter({ status: 'active' });

    if (!feeds || feeds.length === 0) {
      return Response.json({ message: 'No active feeds found', imported: 0 });
    }

    const feedsToProcess = targetFeedId
      ? feeds.filter((f) => f.id === targetFeedId)
      : feeds;

    if (feedsToProcess.length === 0) {
      return Response.json({ message: 'Feed not found', imported: 0 });
    }

    let totalImported = 0;
    const results = [];

    for (const feed of feedsToProcess) {
      try {
        // Fetch feed XML
        const fetchRes = await fetch(feed.url, {
          headers: { 'User-Agent': 'Click2Job-Bot/1.0' },
          signal: AbortSignal.timeout(15000),
        });

        if (!fetchRes.ok) {
          throw new Error(`HTTP ${fetchRes.status} fetching feed`);
        }

        let xmlText = '';

        const contentType = fetchRes.headers.get('content-type') || '';
        const isGzip =
          contentType.includes('gzip') ||
          feed.url.endsWith('.gz') ||
          fetchRes.headers.get('content-encoding') === 'gzip';

        if (isGzip) {
          const buffer = await fetchRes.arrayBuffer();
          const ds = new DecompressionStream('gzip');
          const writer = ds.writable.getWriter();
          const reader = ds.readable.getReader();
          writer.write(new Uint8Array(buffer));
          writer.close();
          const chunks = [];
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            chunks.push(value);
          }
          const total = chunks.reduce((acc, c) => acc + c.length, 0);
          const merged = new Uint8Array(total);
          let offset = 0;
          for (const c of chunks) { merged.set(c, offset); offset += c.length; }
          xmlText = new TextDecoder().decode(merged);
        } else {
          xmlText = await fetchRes.text();
        }

        // Use only first 12000 chars to reduce LLM token/memory usage
        const xmlSample = xmlText.substring(0, 12000);
        xmlText = null; // free memory

        // Use LLM to parse
        const llmResult = await client.integrations.Core.InvokeLLM({
          prompt: `Sei un parser di feed XML per offerte di lavoro. Analizza il seguente XML e estrai tutti gli annunci di lavoro presenti (max 30 annunci).

Per ogni annuncio estrai (se disponibili):
- title: titolo posizione (obbligatorio)
- company: nome azienda
- location: città/sede
- region: regione italiana
- category: categoria/settore
- description: descrizione (max 500 caratteri)
- requirements: requisiti (max 300 caratteri)
- apply_url: URL candidatura
- external_id: ID univoco nel feed
- contract_type: SOLO uno tra: tempo_indeterminato, tempo_determinato, apprendistato, stage, partita_iva, collaborazione, somministrazione
- work_schedule: SOLO full_time oppure part_time
- salary_min: numero intero
- salary_max: numero intero

XML:
${xmlSample}`,
          response_json_schema: {
            type: 'object',
            properties: {
              jobs: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    title: { type: 'string' },
                    company: { type: 'string' },
                    location: { type: 'string' },
                    region: { type: 'string' },
                    category: { type: 'string' },
                    description: { type: 'string' },
                    requirements: { type: 'string' },
                    apply_url: { type: 'string' },
                    external_id: { type: 'string' },
                    contract_type: { type: 'string' },
                    work_schedule: { type: 'string' },
                    salary_min: { type: 'number' },
                    salary_max: { type: 'number' },
                  },
                  required: ['title'],
                },
              },
            },
          },
        });

        const jobs = llmResult?.jobs || [];

        if (jobs.length === 0) {
          results.push({ feed: feed.name, imported: 0, error: 'Nessun annuncio trovato nel feed' });
          await client.entities.XMLFeed.update(feed.id, { status: 'error' });
          continue;
        }

        // Deduplicate
        const existingJobs = await client.entities.JobOffer.filter({ source: feed.name });
        const existingIds = new Set(existingJobs.map((j) => j.external_id).filter(Boolean));

        const jobsToCreate = jobs
          .filter((j) => {
            if (!j.title) return false;
            const extId = j.external_id ? `${feed.id}_${j.external_id}` : null;
            if (extId && existingIds.has(extId)) return false;
            return true;
          })
          .map((j) => ({
            ...j,
            external_id: j.external_id ? `${feed.id}_${j.external_id}` : undefined,
            source: feed.name,
            is_active: true,
            is_featured: false,
          }));

        if (jobsToCreate.length > 0) {
          await client.entities.JobOffer.bulkCreate(jobsToCreate);
        }

        await client.entities.XMLFeed.update(feed.id, {
          last_import_date: new Date().toISOString(),
          total_jobs_imported: (feed.total_jobs_imported || 0) + jobsToCreate.length,
          status: 'active',
        });

        totalImported += jobsToCreate.length;
        results.push({ feed: feed.name, imported: jobsToCreate.length, skipped: jobs.length - jobsToCreate.length });
      } catch (feedError) {
        await client.entities.XMLFeed.update(feed.id, { status: 'error' });
        results.push({ feed: feed.name, imported: 0, error: feedError.message });
      }
    }

    return Response.json({
      success: true,
      total_imported: totalImported,
      results,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});