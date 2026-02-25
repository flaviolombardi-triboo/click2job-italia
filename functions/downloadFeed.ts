/**
 * downloadFeed.js
 *
 * Scarica un feed XML(.gz), fa parsing streaming senza caricare tutto in memoria.
 * Chunk size = 50 job. Usa bulkCreate per creare tutti i chunk in un colpo solo.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// ─── Text cleaning ────────────────────────────────────────────────────────────

function cleanXmlText(raw) {
  if (!raw) return '';
  return raw
    // Unwrap CDATA
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    // Named entities
    .replace(/&nbsp;/gi, ' ')
    .replace(/&lt;/gi, '<').replace(/&gt;/gi, '>')
    .replace(/&amp;/gi, '&').replace(/&quot;/gi, '"').replace(/&apos;/gi, "'")
    .replace(/&mdash;/gi, '—').replace(/&ndash;/gi, '–')
    .replace(/&laquo;/gi, '«').replace(/&raquo;/gi, '»')
    .replace(/&rsquo;/gi, "'").replace(/&lsquo;/gi, "'")
    .replace(/&rdquo;/gi, '"').replace(/&ldquo;/gi, '"')
    // Numeric entities (decimal & hex)
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(parseInt(d, 10)))
    // Common HTML block/inline tags → whitespace
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/?(p|li|div|ul|ol|h[1-6]|tr|td|th)[^>]*>/gi, ' ')
    // Strip remaining tags
    .replace(/<[^>]+>/g, '')
    // Collapse whitespace
    .replace(/\s{2,}/g, ' ')
    .trim();
}

// ─── XML attribute extraction ─────────────────────────────────────────────────

function extractAttrs(openTag) {
  const attrs = {};
  const re = /([a-zA-Z_][a-zA-Z0-9_:-]*)=["']([^"']*)["']/g;
  let m;
  while ((m = re.exec(openTag)) !== null) {
    const key = m[1].toLowerCase().replace(/[:-]/g, '_');
    if (!attrs[key]) attrs[key] = m[2].trim();
  }
  return attrs;
}

// ─── Job XML parser ───────────────────────────────────────────────────────────

const ALIASES = {
  jobtitle: 'title', job_title: 'title', positiontitle: 'title', position: 'title', name: 'title',
  referencenumber: 'id', ref: 'id', jobid: 'id', job_id: 'id', vacancyid: 'id', reference: 'id', reqid: 'id', requisitionid: 'id',
  companyname: 'company', employer: 'company', advertiser: 'company', client: 'company', organization: 'company',
  city: 'location', town: 'location', place: 'location', municipality: 'location', worktown: 'location', worklocation: 'location',
  jobtype: 'contract_type', contracttype: 'contract_type', job_type: 'contract_type', employment_type: 'contract_type', worktype: 'contract_type',
  workhours: 'work_schedule', schedule: 'work_schedule', hours: 'work_schedule', workschedule: 'work_schedule',
  jobcategory: 'category', job_category: 'category', sector: 'category', function: 'category', discipline: 'category', area: 'category',
  jobdescription: 'description', job_description: 'description', body: 'description', detail: 'description', content: 'description', summary: 'description',
  applyurl: 'apply_url', apply_link: 'apply_url', link: 'apply_url', url: 'apply_url', joburl: 'apply_url', applicationurl: 'apply_url', href: 'apply_url',
  salary: 'salary_min', salarymin: 'salary_min', minsalary: 'salary_min',
  salarymax: 'salary_max', maxsalary: 'salary_max',
  requirements: 'requirements', qualifications: 'requirements', skills: 'requirements',
  state: 'region', province: 'region',
  expiry: 'expiry_date', deadline: 'expiry_date', expirydate: 'expiry_date', closingdate: 'expiry_date',
};

const LONG_FIELDS = new Set(['description', 'summary', 'body', 'detail', 'content', 'jobdescription', 'job_description', 'requirements', 'qualifications']);

function parseJobXml(jobXml, openTagFull) {
  const job = {};

  // Attributes on the opening tag (e.g. <job id="123">)
  if (openTagFull) {
    Object.assign(job, extractAttrs(openTagFull));
  }

  // Match ALL tags recursively — greedy depth-first via simple regex pass
  // We iterate with a while loop collecting ALL occurrences (including nested)
  const tagRe = /<([a-zA-Z_][a-zA-Z0-9_:-]*)(?:\s[^>]*)?>([^<]*(?:(?!<\/\1>)<[^>]*>(?:[^<]|<(?!\/\1>))*)*[^<]*)<\/\1>/g;

  // Simpler and faster: just extract every leaf tag value
  const leafRe = /<([a-zA-Z_][a-zA-Z0-9_:-]*)(?:[^>]*)>([\s\S]*?)<\/\1>/g;
  let m;
  while ((m = leafRe.exec(jobXml)) !== null) {
    const rawField = m[1];
    const field = rawField.toLowerCase().replace(/[:-]/g, '_');
    let val = cleanXmlText(m[2]);

    if (!val) continue;

    // Truncate long fields at parse time to keep chunk sizes manageable
    if (LONG_FIELDS.has(field)) val = val.substring(0, 1500);

    // First-value wins
    if (!job[field]) job[field] = val;

    // Populate aliases
    const alias = ALIASES[field];
    if (alias && !job[alias]) job[alias] = job[field];
  }

  return (job.title || job.id || job.vacancyid || job.jobid) ? job : null;
}

// ─── Streaming parser ─────────────────────────────────────────────────────────

async function* streamParseJobs(readableStream, isGzip, jobTag = 'job') {
  let source = readableStream;
  if (isGzip) source = readableStream.pipeThrough(new DecompressionStream('gzip'));

  const reader = source.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  const MAX_BUF = 1024 * 1024; // 1 MB safety cap
  const openTag = `<${jobTag}`;
  const closeTag = `</${jobTag}>`;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      yield* drainBuffer();
      // Prevent unbounded buffer growth
      if (buffer.length > MAX_BUF) buffer = buffer.slice(-100 * 1024);
    }
    // Drain remainder
    yield* drainBuffer();
  } catch (_) {
    // Stream ended
  } finally {
    reader.releaseLock();
  }

  function* drainBuffer() {
    while (true) {
      const start = buffer.indexOf(openTag);
      if (start === -1) break;
      const end = buffer.indexOf(closeTag, start);
      if (end === -1) break;
      const openTagEnd = buffer.indexOf('>', start);
      if (openTagEnd === -1 || openTagEnd > end) break;
      const openTagFull = buffer.slice(start + 1, openTagEnd); // e.g. "job id='1' ..."
      const jobXml = buffer.slice(openTagEnd + 1, end);
      buffer = buffer.slice(end + closeTag.length);
      const job = parseJobXml(jobXml, openTagFull);
      if (job) yield job;
    }
  }
}

// ─── HTTP handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const targetFeedId = body.feed_id || null;

    try {
      const user = await base44.auth.me();
      if (user && user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });
    } catch (_) { /* no user = scheduler call, allow through */ }

    const client = base44.asServiceRole;
    const feedsRaw = await client.entities.XMLFeed.filter({ status: 'active' }, 'created_date', 50);
    const feeds = Array.isArray(feedsRaw) ? feedsRaw : [];
    if (feeds.length === 0) return Response.json({ message: 'No active feeds', feeds_processed: 0 });

    const feedsToProcess = targetFeedId ? feeds.filter((f) => f.id === targetFeedId) : feeds;
    const results = [];

    for (const feed of feedsToProcess) {
      try {
        // Delete old pending chunks for this feed — con retry su rate limit SDK
        let oldChunks = [];
        for (let att = 0; att < 5; att++) {
          try {
            const raw = await client.entities.FeedChunk.filter({ feed_id: feed.id, status: 'pending' }, 'created_date', 500);
            oldChunks = Array.isArray(raw) ? raw : [];
            break;
          } catch (e) {
            if (/rate.?limit|429/i.test(e.message) && att < 4) {
              await new Promise(r => setTimeout(r, 5000 * (att + 1)));
            } else throw e;
          }
        }
        for (const c of oldChunks) {
          let deleted = false;
          for (let att = 0; att < 5 && !deleted; att++) {
            try {
              await client.entities.FeedChunk.delete(c.id);
              deleted = true;
            } catch (e) {
              if (/rate.?limit|429/i.test(e.message) && att < 4) {
                await new Promise(r => setTimeout(r, 3000 * (att + 1)));
              } else throw e;
            }
          }
        }

        // Fetch con retry automatico su rate limit (sia HTTP 429 che errori SDK con testo rate limit)
        let fetchRes = null;
        let rateLimitSkip = false;

        const MAX_FETCH_RETRIES = 3;
        for (let attempt = 0; attempt < MAX_FETCH_RETRIES; attempt++) {
          try {
            const res = await fetch(feed.url, {
              headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Click2Job-Bot/1.0)', 'Accept': 'application/xml,text/xml,*/*' },
              signal: AbortSignal.timeout(90000),
            });

            if (res.status === 429 || res.status === 503) {
              console.log(`[${feed.name}] HTTP ${res.status} — attendo ${10 * (attempt + 1)}s (tentativo ${attempt + 1}/${MAX_FETCH_RETRIES})`);
              if (attempt < MAX_FETCH_RETRIES - 1) {
                await new Promise(r => setTimeout(r, 10000 * (attempt + 1)));
                continue;
              }
              rateLimitSkip = true;
              break;
            }

            if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
            fetchRes = res;
            break;
          } catch (fetchErr) {
            const msg = String(fetchErr.message || '');
            const isRl = /rate.?limit|too many|throttl|429/i.test(msg);
            console.log(`[${feed.name}] Fetch error (tentativo ${attempt + 1}): ${msg} isRateLimit=${isRl}`);
            if (isRl || attempt < MAX_FETCH_RETRIES - 1) {
              if (attempt < MAX_FETCH_RETRIES - 1) {
                await new Promise(r => setTimeout(r, 10000 * (attempt + 1)));
                continue;
              }
              if (isRl) { rateLimitSkip = true; break; }
            }
            throw fetchErr;
          }
        }

        // Rate limit persistente dopo tutti i retry: il feed rimane 'active', il prossimo ciclo riproverà
        if (rateLimitSkip || !fetchRes) {
          console.log(`[${feed.name}] Rate limit persistente — feed lasciato active, verrà riprovato al prossimo ciclo`);
          results.push({ feed: feed.name, skipped: 'rate_limit', message: 'Rate limit persistente, verrà riprovato al prossimo ciclo' });
          continue;
        }

        const contentType = fetchRes.headers.get('content-type') || '';
        const contentEncoding = fetchRes.headers.get('content-encoding') || '';
        const isGzip = contentType.includes('gzip') || feed.url.endsWith('.gz') || contentEncoding === 'gzip';
        const jobTag = (feed.job_tag || 'job').trim();

        const CHUNK_SIZE = 3;       // 3 job per chunk → evita il limite di dimensione campo
        const MAX_JOBS = 5000;      // fino a 5000 job per feed per run
        let currentChunk = [];
        let chunkIndex = 0;
        let totalJobs = 0;
        const chunksToCreate = []; // accumula tutto, poi bulkCreate

        for await (const job of streamParseJobs(fetchRes.body, isGzip, jobTag)) {
          currentChunk.push(job);
          totalJobs++;
          if (currentChunk.length >= CHUNK_SIZE) {
            chunksToCreate.push({
              feed_id: feed.id,
              feed_name: feed.name,
              chunk_index: chunkIndex++,
              xml_content: JSON.stringify(currentChunk),
              status: 'pending',
              jobs_imported: 0,
            });
            currentChunk = [];
          }
          if (totalJobs >= MAX_JOBS) break;
        }
        if (currentChunk.length > 0) {
          chunksToCreate.push({
            feed_id: feed.id,
            feed_name: feed.name,
            chunk_index: chunkIndex,
            xml_content: JSON.stringify(currentChunk),
            status: 'pending',
            jobs_imported: 0,
          });
        }

        if (totalJobs === 0) {
          await client.entities.XMLFeed.update(feed.id, { status: 'error' });
          results.push({ feed: feed.name, error: 'Nessun job trovato nel feed — verifica il job_tag configurato' });
          continue;
        }

        // Crea tutti i chunk in una sola chiamata bulk
        await client.entities.FeedChunk.bulkCreate(chunksToCreate);
        await client.entities.XMLFeed.update(feed.id, { status: 'active' });

        results.push({ feed: feed.name, total_jobs_found: totalJobs, chunks_created: chunksToCreate.length });
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