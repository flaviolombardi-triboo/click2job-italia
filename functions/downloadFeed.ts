/**
 * downloadFeed.js
 * 
 * Scarica un feed XML(.gz), lo divide in chunk da 25 job ciascuno,
 * salva ogni chunk come record FeedChunk con status="pending".
 * 
 * Viene chiamato ogni 4 ore dall'automation, oppure manualmente passando feed_id.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Parse XML natively usando regex (nessuna dipendenza esterna)
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
      'state', 'country', 'type', 'jobtype', 'job_type',
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

    if (job.title || job.id) {
      jobs.push(job);
    }
  }
  return jobs;
}

function chunkArray(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
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
      try {
        // Delete old pending/error chunks for this feed to avoid re-processing stale data
        const oldChunks = await client.entities.FeedChunk.filter({ feed_id: feed.id, status: 'pending' });
        for (const c of oldChunks) {
          await client.entities.FeedChunk.delete(c.id);
        }

        // Fetch feed
        const fetchRes = await fetch(feed.url, {
          headers: { 'User-Agent': 'Click2Job-Bot/1.0' },
          signal: AbortSignal.timeout(30000),
        });

        if (!fetchRes.ok) throw new Error(`HTTP ${fetchRes.status}`);

        const contentType = fetchRes.headers.get('content-type') || '';
        const isGzip =
          contentType.includes('gzip') ||
          feed.url.endsWith('.gz') ||
          fetchRes.headers.get('content-encoding') === 'gzip';

        // Stream and decompress in chunks, stop at 5MB decompressed
        const MAX_DECOMP_BYTES = 5 * 1024 * 1024;
        let xmlText = '';

        if (isGzip) {
          // Download full compressed buffer
          const rawBuffer = await fetchRes.arrayBuffer();
          const rawBytes = new Uint8Array(rawBuffer);

          // Decompress: pipe compressed bytes through DecompressionStream
          // We read from the readable side while writing on the writable side concurrently
          const ds = new DecompressionStream('gzip');
          const reader = ds.readable.getReader();
          const writer = ds.writable.getWriter();

          const decompChunks = [];
          let decompTotal = 0;

          // Start reading decompressed output concurrently
          const readPromise = (async () => {
            try {
              while (decompTotal < MAX_DECOMP_BYTES) {
                const { done, value } = await reader.read();
                if (done) break;
                decompChunks.push(value);
                decompTotal += value.length;
              }
            } catch (_) {
              // ignore checksum/truncation errors — we have the data already
            }
          })();

          // Write all compressed data then close writer
          try {
            await writer.write(rawBytes);
            await writer.close();
          } catch (_) {
            // ignore close errors
          }

          // Wait for reader to finish
          await readPromise;

          const merged = new Uint8Array(decompTotal);
          let off = 0;
          for (const c of decompChunks) { merged.set(c, off); off += c.length; }
          xmlText = new TextDecoder().decode(merged);
        } else {
          const rawBuffer = await fetchRes.arrayBuffer();
          xmlText = new TextDecoder().decode(new Uint8Array(rawBuffer));
        }

        // Parse all jobs from XML
        const allJobs = extractJobsFromXml(xmlText);
        xmlText = null; // free memory

        if (allJobs.length === 0) {
          await client.entities.XMLFeed.update(feed.id, { status: 'error' });
          results.push({ feed: feed.name, error: 'Nessun job trovato nel feed' });
          continue;
        }

        // Divide in chunks of 25
        const jobChunks = chunkArray(allJobs, 25);

        // Save each chunk as FeedChunk record
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

        await client.entities.XMLFeed.update(feed.id, {
          status: 'active',
        });

        results.push({
          feed: feed.name,
          total_jobs_found: allJobs.length,
          chunks_created: jobChunks.length,
        });
      } catch (err) {
        await client.entities.XMLFeed.update(feed.id, { status: 'error' });
        results.push({ feed: feed.name, error: err.message });
      }
    }

    return Response.json({ success: true, results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});