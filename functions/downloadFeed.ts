/**
 * downloadFeed.js
 *
 * Scarica un feed XML(.gz) con fetch, decomprime in streaming tramite
 * DecompressionStream, fa parsing incrementale dei tag job (configurabile)
 * senza mai caricare l'intero contenuto in memoria.
 * Supporta field_mapping per trasformazioni custom dei campi.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

function extractField(jobXml, field) {
  const re = new RegExp(`<${field}[^>]*>([\\s\\S]*?)<\\/${field}>`, 'i');
  const m = jobXml.match(re);
  if (!m) return undefined;
  return m[1]
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, '')
    .trim() || undefined;
}

/**
 * Pulisce il testo XML rimuovendo CDATA, tag HTML e spazi eccessivi.
 */
function cleanXmlText(raw) {
  return raw
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#\d+;/g, ' ')
    .replace(/<br\s*\/?>/gi, ' ').replace(/<p[^>]*>/gi, ' ').replace(/<\/p>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * Estrae un attributo da un tag di apertura XML.
 * es. <job id="123"> -> extractAttr(tag, 'id') => '123'
 */
function extractAttr(openTag, attr) {
  const re = new RegExp(`${attr}\\s*=\\s*["']([^"']+)["']`, 'i');
  const m = openTag.match(re);
  return m ? m[1].trim() : undefined;
}

/**
 * Estrae tutti i campi XML da un blocco job.
 * Gestisce: tag annidati, CDATA, attributi, namespace, HTML entities.
 */
function parseJobXml(jobXml, openTagFull) {
  const job = {};

  // Estrai attributi dal tag di apertura (es. id="123" ref="abc")
  if (openTagFull) {
    const attrRe = /([a-zA-Z_][a-zA-Z0-9_:-]*)=["']([^"']+)["']/g;
    let am;
    while ((am = attrRe.exec(openTagFull)) !== null) {
      const key = am[1].toLowerCase().replace(/:/g, '_');
      if (!job[key]) job[key] = am[2].trim();
    }
  }

  // Parsing iterativo NON-ricorsivo: estrae tutti i tag di qualsiasi livello
  // Priorità: tag di primo livello, poi annidati come fallback
  const allTagRe = /<([a-zA-Z_][a-zA-Z0-9_:-]*)(?:[^>]*)>([\s\S]*?)<\/\1>/g;
  let m;
  while ((m = allTagRe.exec(jobXml)) !== null) {
    const rawField = m[1];
    const field = rawField.toLowerCase().replace(/:/g, '_');
    const rawVal = m[2];

    // Salta se il valore contiene altri tag (non è foglia) — verrà catturato nelle iterazioni interne
    const isLeaf = !/<[a-zA-Z_]/.test(rawVal);

    let val;
    if (isLeaf) {
      val = cleanXmlText(rawVal);
    } else {
      // Nodo con figli: prova a estrarre il testo diretto (ignorando sottotag)
      val = cleanXmlText(rawVal.replace(/<[^>]+>[\s\S]*?<\/[^>]+>/g, ''));
      if (!val) {
        // Usa tutto il testo pulito dal nodo
        val = cleanXmlText(rawVal);
      }
    }

    if (!val) continue;

    // Truncate descrizioni lunghe
    if (['description', 'summary', 'body', 'detail', 'content', 'jobdescription', 'job_description', 'responsabilities', 'duties'].includes(field) && val.length > 1500) {
      val = val.substring(0, 1500);
    }

    // Non sovrascrivere un valore già trovato (primo match wins)
    if (!job[field]) job[field] = val;

    // Alias comuni: normalizza verso nomi standard
    const aliases = {
      jobtitle: 'title', job_title: 'title', positiontitle: 'title', position: 'title',
      referencenumber: 'id', ref: 'id', jobid: 'id', job_id: 'id', vacancyid: 'id',
      companyname: 'company', employer: 'company', advertiser: 'company', client: 'company',
      city: 'location', town: 'location', place: 'location', municipality: 'location',
      jobtype: 'contract_type', contracttype: 'contract_type', job_type: 'contract_type', employment_type: 'contract_type',
      workhours: 'work_schedule', schedule: 'work_schedule', hours: 'work_schedule',
      jobcategory: 'category', job_category: 'category', sector: 'category', function: 'category',
      jobdescription: 'description', job_description: 'description',
      applyurl: 'apply_url', apply_link: 'apply_url', link: 'apply_url', url: 'apply_url', joburl: 'apply_url',
      salary: 'salary_min', salarymin: 'salary_min', salarymax: 'salary_max',
      requirements: 'requirements', qualifications: 'requirements',
    };
    if (aliases[field] && !job[aliases[field]]) {
      job[aliases[field]] = job[field];
    }
  }

  // Considera il record valido se ha titolo oppure un ID riconoscibile
  return (job.title || job.id || job.referencenumber || job.jobid || job.vacancyid) ? job : null;
}

/**
 * Legge lo stream decomprimendo se gz.
 * Usa il jobTag configurabile per trovare i blocchi (default: "job").
 */
async function* streamParseJobs(readableStream, isGzip, jobTag = 'job') {
  let source = readableStream;
  if (isGzip) {
    source = readableStream.pipeThrough(new DecompressionStream('gzip'));
  }

  const reader = source.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  const MAX_BUF = 500 * 1024;
  const openTag = `<${jobTag}`;
  const closeTag = `</${jobTag}>`;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      while (true) {
        const start = buffer.indexOf(openTag);
        const end = buffer.indexOf(closeTag);
        if (start === -1 || end === -1 || end < start) break;

        const closeOfOpenTag = buffer.indexOf('>', start);
        const jobXml = buffer.slice(closeOfOpenTag + 1, end);
        buffer = buffer.slice(end + closeTag.length);

        const job = parseJobXml(jobXml);
        if (job) yield job;
      }

      if (buffer.length > MAX_BUF) {
        buffer = buffer.slice(-50 * 1024);
      }
    }
    // Process any remaining buffer
    while (true) {
      const start = buffer.indexOf(openTag);
      const end = buffer.indexOf(closeTag);
      if (start === -1 || end === -1 || end < start) break;
      const closeOfOpenTag = buffer.indexOf('>', start);
      const jobXml = buffer.slice(closeOfOpenTag + 1, end);
      buffer = buffer.slice(end + closeTag.length);
      const job = parseJobXml(jobXml);
      if (job) yield job;
    }
  } catch (_) {
    // Stream ended — ok
  } finally {
    reader.releaseLock();
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const targetFeedId = body.feed_id || null;

    try {
      const user = await base44.auth.me();
      if (user?.role !== 'admin') {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }
    } catch (_) { /* scheduler */ }

    const client = base44.asServiceRole;

    const feeds = await client.entities.XMLFeed.filter({ status: 'active' });
    if (!feeds || feeds.length === 0) {
      return Response.json({ message: 'No active feeds', feeds_processed: 0 });
    }

    const feedsToProcess = targetFeedId
      ? feeds.filter((f) => f.id === targetFeedId)
      : feeds;

    const results = [];

    for (const feed of feedsToProcess) {
      try {
        // Delete old pending chunks for this feed
        const oldChunks = await client.entities.FeedChunk.filter({ feed_id: feed.id, status: 'pending' });
        for (const c of oldChunks) {
          await client.entities.FeedChunk.delete(c.id);
        }

        const fetchRes = await fetch(feed.url, {
          headers: { 'User-Agent': 'Click2Job-Bot/1.0' },
          signal: AbortSignal.timeout(60000),
        });
        if (!fetchRes.ok) throw new Error(`HTTP ${fetchRes.status}`);

        const isGzip =
          (fetchRes.headers.get('content-type') || '').includes('gzip') ||
          feed.url.endsWith('.gz') ||
          fetchRes.headers.get('content-encoding') === 'gzip';

        const jobTag = feed.job_tag || 'job';

        const CHUNK_SIZE = 10;
        const MAX_JOBS = 2000;
        const MAX_CHUNKS_PER_RUN = 20;
        let currentChunk = [];
        let chunkIndex = 0;
        let totalJobs = 0;
        let chunksCreated = 0;

        for await (const job of streamParseJobs(fetchRes.body, isGzip, jobTag)) {
          currentChunk.push(job);
          totalJobs++;

          if (currentChunk.length >= CHUNK_SIZE) {
            await client.entities.FeedChunk.create({
              feed_id: feed.id,
              feed_name: feed.name,
              chunk_index: chunkIndex++,
              xml_content: JSON.stringify(currentChunk),
              status: 'pending',
              jobs_imported: 0,
            });
            chunksCreated++;
            currentChunk = [];
            if (chunksCreated % 5 === 0) await new Promise(r => setTimeout(r, 2000));
          }

          if (totalJobs >= MAX_JOBS || chunksCreated >= MAX_CHUNKS_PER_RUN) break;
        }

        if (currentChunk.length > 0) {
          await client.entities.FeedChunk.create({
            feed_id: feed.id,
            feed_name: feed.name,
            chunk_index: chunkIndex,
            xml_content: JSON.stringify(currentChunk),
            status: 'pending',
            jobs_imported: 0,
          });
          chunksCreated++;
        }

        if (totalJobs === 0) {
          await client.entities.XMLFeed.update(feed.id, { status: 'error' });
          results.push({ feed: feed.name, error: 'Nessun job trovato nel feed' });
          continue;
        }

        await client.entities.XMLFeed.update(feed.id, { status: 'active' });

        results.push({
          feed: feed.name,
          total_jobs_found: totalJobs,
          chunks_created: chunksCreated,
        });
      } catch (err) {
        await client.entities.XMLFeed.update(feed.id, { status: 'error' }).catch(() => {});
        results.push({ feed: feed.name, error: err.message });
      }
    }

    return Response.json({ success: true, results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});