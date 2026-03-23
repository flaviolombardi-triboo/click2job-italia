import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const url = body.url;
    if (!url) return Response.json({ error: 'url required' }, { status: 400 });

    const fetchRes = await fetch(url, {
      headers: { 'User-Agent': 'Click2Job-Bot/1.0' },
      signal: AbortSignal.timeout(20000),
    });

    if (!fetchRes.ok) {
      return Response.json({ error: `HTTP ${fetchRes.status}` }, { status: 400 });
    }

    const contentType = fetchRes.headers.get('content-type') || '';
    const isGzip =
      contentType.includes('gzip') ||
      url.endsWith('.gz') ||
      fetchRes.headers.get('content-encoding') === 'gzip';

    // Read ONLY first 50KB of raw bytes from stream
    const reader = fetchRes.body.getReader();
    const rawChunks = [];
    let totalRawBytes = 0;
    const MAX_RAW = 50000; // 50KB raw
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      rawChunks.push(value);
      totalRawBytes += value.length;
      if (totalRawBytes >= MAX_RAW) break;
    }
    reader.cancel();

    const rawMerged = new Uint8Array(totalRawBytes);
    let rawOffset = 0;
    for (const c of rawChunks) { rawMerged.set(c, rawOffset); rawOffset += c.length; }

    let xmlText = '';

    if (isGzip) {
      // Decompress only the small raw chunk
      const ds = new DecompressionStream('gzip');
      const writer = ds.writable.getWriter();
      const dsReader = ds.readable.getReader();

      writer.write(rawMerged).catch(() => {});
      writer.close().catch(() => {});

      const decompChunks = [];
      let decompTotal = 0;
      const MAX_DECOMP = 30000;
      try {
        while (decompTotal < MAX_DECOMP) {
          const { done, value } = await Promise.race([
            dsReader.read(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000)),
          ]);
          if (done) break;
          decompChunks.push(value);
          decompTotal += value.length;
        }
      } catch (_) {
        // partial decomp is fine
      }

      const merged = new Uint8Array(decompTotal);
      let offset = 0;
      for (const c of decompChunks) { merged.set(c, offset); offset += c.length; }
      xmlText = new TextDecoder().decode(merged);
    } else {
      xmlText = new TextDecoder().decode(rawMerged);
    }

    const sample = xmlText.substring(0, 6000);

    // Count tags
    const tagMatches = [...sample.matchAll(/<([a-zA-Z][a-zA-Z0-9_:-]*)[\s>/]/g)];
    const tagCounts = {};
    for (const m of tagMatches) {
      tagCounts[m[1]] = (tagCounts[m[1]] || 0) + 1;
    }
    const sortedTags = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]);

    const rootMatch = sample.match(/<([a-zA-Z][a-zA-Z0-9_:-]*)[^>]*>/);
    const rootTag = rootMatch ? rootMatch[1] : null;

    return Response.json({
      is_gzip: isGzip,
      content_type: contentType,
      sample_xml: sample,
      root_tag: rootTag,
      tag_counts: sortedTags.slice(0, 30),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});