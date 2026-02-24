/**
 * downloadFeed.js
 *
 * Scarica un feed XML(.gz), lo salva in /tmp, lo decomprime con Deno,
 * fa parsing XML nativo, divide in chunk da 25 job e salva FeedChunk records.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Parse jobs from XML text using regex — no external deps
function extractJobsFromXml(xmlText) {
  const jobs = [];
  const jobRegex = /<job>([\s\S]*?)<\/job>/gi;
  let match;
  while ((match = jobRegex.exec(xmlText)) !== null) {
    const jobXml = match[1];
    const job = {};
    const fields = [
      'id', 'company', 'title', 'description', 'category', 'location',
      'region', 'salary', 'url', 'contract_type', 'work_schedule',
      'salary_min', 'salary_max', 'expiry_date', 'date', 'city',
      'state', 'country', 'type', 'jobtype', 'job_type', 'referencenumber',
    ];
    for (const field of fields) {
      const re = new RegExp(`<${field}[^>]*>([\\s\\S]*?)<\\/${field}>`, 'i');
      const fm = jobXml.match(re);
      if (fm) {
        job[field] = fm[1]
          .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
          .replace(/<[^>]+>/g, '')
          .trim();
      }
    }
    if (job.title || job.id) jobs.push(job);
  }
  return jobs;
}

function chunkArray(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
  return chunks;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const targetFeedId = body.feed_id || null;

    // Auth: allow admin or scheduler (no user)
    try {
      const user = await base44.auth.me();
      if (user?.role !== 'admin') {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }
    } catch (_) {
      // scheduler — ok
    }

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
      const tmpGz = `/tmp/feed_${feed.id}.gz`;
      const tmpXml = `/tmp/feed_${feed.id}.xml`;

      try {
        // Delete old pending chunks for this feed
        const oldChunks = await client.entities.FeedChunk.filter({ feed_id: feed.id, status: 'pending' });
        for (const c of oldChunks) {
          await client.entities.FeedChunk.delete(c.id);
        }

        // Step 1: Download the compressed file to /tmp
        const fetchRes = await fetch(feed.url, {
          headers: { 'User-Agent': 'Click2Job-Bot/1.0' },
          signal: AbortSignal.timeout(60000),
        });
        if (!fetchRes.ok) throw new Error(`HTTP ${fetchRes.status}`);

        const isGzip =
          (fetchRes.headers.get('content-type') || '').includes('gzip') ||
          feed.url.endsWith('.gz') ||
          fetchRes.headers.get('content-encoding') === 'gzip';

        if (isGzip) {
          // Write compressed bytes to /tmp
          const file = await Deno.open(tmpGz, { write: true, create: true, truncate: true });
          await fetchRes.body.pipeTo(file.writable);

          // Decompress using Deno subprocess: gunzip -c
          const cmd = new Deno.Command('gunzip', { args: ['-c', tmpGz], stdout: 'piped', stderr: 'piped' });
          const proc = cmd.spawn();
          const { stdout, stderr } = await proc.output();

          if (stdout.length === 0) {
            const errMsg = new TextDecoder().decode(stderr);
            throw new Error(`gunzip failed: ${errMsg}`);
          }

          // Write decompressed XML to /tmp
          await Deno.writeFile(tmpXml, stdout);

          // Cleanup gz
          await Deno.remove(tmpGz).catch(() => {});

          // Read XML (limit to 10MB)
          const stat = await Deno.stat(tmpXml);
          const readSize = Math.min(stat.size, 10 * 1024 * 1024);
          const xmlBytes = new Uint8Array(readSize);
          const xmlFile = await Deno.open(tmpXml, { read: true });
          await xmlFile.read(xmlBytes);
          xmlFile.close();
          await Deno.remove(tmpXml).catch(() => {});

          var xmlText = new TextDecoder().decode(xmlBytes);
        } else {
          const rawBuffer = await fetchRes.arrayBuffer();
          var xmlText = new TextDecoder().decode(new Uint8Array(rawBuffer));
        }

        // Parse jobs
        const allJobs = extractJobsFromXml(xmlText);
        xmlText = null; // free memory

        if (allJobs.length === 0) {
          await client.entities.XMLFeed.update(feed.id, { status: 'error' });
          results.push({ feed: feed.name, error: 'Nessun job trovato nel feed' });
          continue;
        }

        // Create chunks of 25 jobs each
        const jobChunks = chunkArray(allJobs, 25);

        for (let i = 0; i < jobChunks.length; i++) {
          await client.entities.FeedChunk.create({
            feed_id: feed.id,
            feed_name: feed.name,
            chunk_index: i,
            xml_content: JSON.stringify(jobChunks[i]),
            status: 'pending',
            jobs_imported: 0,
          });
        }

        await client.entities.XMLFeed.update(feed.id, { status: 'active' });

        results.push({
          feed: feed.name,
          total_jobs_found: allJobs.length,
          chunks_created: jobChunks.length,
        });
      } catch (err) {
        // Cleanup tmp files on error
        await Deno.remove(tmpGz).catch(() => {});
        await Deno.remove(tmpXml).catch(() => {});
        await client.entities.XMLFeed.update(feed.id, { status: 'error' }).catch(() => {});
        results.push({ feed: feed.name, error: err.message });
      }
    }

    return Response.json({ success: true, results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});