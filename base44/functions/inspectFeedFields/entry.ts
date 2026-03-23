/**
 * inspectFeedFields.js
 *
 * Scarica i primi N job di un feed e restituisce i campi trovati
 * e un campione dei valori, per aiutare l'admin a configurare il field_mapping.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

function extractAllFields(jobXml) {
  const fields = {};
  const tagRe = /<([a-zA-Z_][a-zA-Z0-9_:-]*)[^>]*>([\s\S]*?)<\/\1>/g;
  let m;
  while ((m = tagRe.exec(jobXml)) !== null) {
    const field = m[1].toLowerCase();
    const val = m[2]
      .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
      .replace(/<[^>]+>/g, '')
      .trim();
    if (val && !fields[field]) {
      fields[field] = val.substring(0, 100);
    }
  }
  return fields;
}

async function* streamParseJobs(readableStream, isGzip, jobTag = 'job') {
  let source = readableStream;
  if (isGzip) {
    source = readableStream.pipeThrough(new DecompressionStream('gzip'));
  }
  const reader = source.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  const MAX_BUF = 300 * 1024;
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
        yield jobXml;
      }
      if (buffer.length > MAX_BUF) buffer = buffer.slice(-50 * 1024);
    }
  } catch (_) { /* ok */ } finally {
    reader.releaseLock();
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { feed_id } = body;

    const user = await base44.auth.me();
    if (user?.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const client = base44.asServiceRole;
    const feeds = await client.entities.XMLFeed.filter({ id: feed_id });
    const feed = feeds?.[0];
    if (!feed) return Response.json({ error: 'Feed not found' }, { status: 404 });

    const fetchRes = await fetch(feed.url, {
      headers: { 'User-Agent': 'Click2Job-Bot/1.0' },
      signal: AbortSignal.timeout(30000),
    });
    if (!fetchRes.ok) throw new Error(`HTTP ${fetchRes.status}`);

    const isGzip =
      (fetchRes.headers.get('content-type') || '').includes('gzip') ||
      feed.url.endsWith('.gz') ||
      fetchRes.headers.get('content-encoding') === 'gzip';

    const jobTag = feed.job_tag || 'job';
    const sampleJobs = [];
    const allFieldNames = new Set();

    for await (const jobXml of streamParseJobs(fetchRes.body, isGzip, jobTag)) {
      const fields = extractAllFields(jobXml);
      sampleJobs.push(fields);
      Object.keys(fields).forEach(k => allFieldNames.add(k));
      if (sampleJobs.length >= 3) break;
    }

    return Response.json({
      success: true,
      feed_name: feed.name,
      job_tag: jobTag,
      field_names: Array.from(allFieldNames).sort(),
      sample_jobs: sampleJobs,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});