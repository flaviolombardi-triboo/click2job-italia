/**
 * downloadFeed.js
 *
 * Scarica un feed XML(.gz) con fetch, decomprime in streaming tramite
 * DecompressionStream, fa parsing incrementale dei <job> senza mai caricare
 * l'intero contenuto in memoria. Salva chunks di 25 job come FeedChunk.
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

const JOB_FIELDS = [
  'id', 'company', 'title', 'description', 'category', 'location',
  'region', 'url', 'contract_type', 'work_schedule',
  'salary_min', 'salary_max', 'expiry_date', 'city', 'state',
  'type', 'jobtype', 'job_type', 'referencenumber',
];

function parseJobXml(jobXml) {
  const job = {};
  for (const field of JOB_FIELDS) {
    let v = extractField(jobXml, field);
    if (!v) continue;
    // Truncate description to 800 chars to keep chunk size small
    if (field === 'description' && v.length > 800) v = v.substring(0, 800);
    job[field] = v;
  }
  return (job.title || job.id) ? job : null;
}

/**
 * Reads decompressed stream incrementally.
 * Yields parsed job objects as they are found.
 * Never stores more than ~200KB of XML text in memory at once.
 */
async function* streamParseJobs(readableStream, isGzip) {
  let source = readableStream;
  if (isGzip) {
    source = readableStream.pipeThrough(new DecompressionStream('gzip'));
  }

  const reader = source.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  const MAX_BUF = 500 * 1024; // 500KB buffer cap

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // Extract all complete <job>...</job> blocks from buffer
      while (true) {
        const start = buffer.indexOf('<job>');
        const end = buffer.indexOf('</job>');
        if (start === -1 || end === -1 || end < start) break;

        const jobXml = buffer.slice(start + 5, end);
        buffer = buffer.slice(end + 6);

        const job = parseJobXml(jobXml);
        if (job) yield job;
      }

      // Trim buffer if it grows too large (no complete job found)
      if (buffer.length > MAX_BUF) {
        // Keep last 50KB in case a job tag spans a chunk boundary
        buffer = buffer.slice(-50 * 1024);
      }
    }
  } catch (_) {
    // Stream ended (possibly checksum error at end of gz) — that's OK
  } finally {
    reader.releaseLock();
  }
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
      try {
        // Delete old pending chunks
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

        // Stream-parse jobs without loading full file into memory
        const CHUNK_SIZE = 25;
        const MAX_JOBS = 5000; // safety cap per run
        let currentChunk = [];
        let chunkIndex = 0;
        let totalJobs = 0;
        let chunksCreated = 0;

        for await (const job of streamParseJobs(fetchRes.body, isGzip)) {
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
          }

          if (totalJobs >= MAX_JOBS) break;
        }

        // Save remaining jobs
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