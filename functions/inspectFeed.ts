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

    let xmlText = '';

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
        // Stop after ~200KB to avoid memory issues
        const totalSoFar = chunks.reduce((a, c) => a + c.length, 0);
        if (totalSoFar > 200000) break;
      }
      const total = chunks.reduce((acc, c) => acc + c.length, 0);
      const merged = new Uint8Array(total);
      let offset = 0;
      for (const c of chunks) { merged.set(c, offset); offset += c.length; }
      xmlText = new TextDecoder().decode(merged);
    } else {
      // Read only first 200KB
      const reader = fetchRes.body.getReader();
      const chunks = [];
      let totalBytes = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        totalBytes += value.length;
        if (totalBytes > 200000) break;
      }
      const merged = new Uint8Array(totalBytes);
      let offset = 0;
      for (const c of chunks) { merged.set(c, offset); offset += c.length; }
      xmlText = new TextDecoder().decode(merged);
    }

    // Extract first 8000 chars sample
    const sample = xmlText.substring(0, 8000);

    // Try to detect root element and repeating item tag
    const rootMatch = sample.match(/<([a-zA-Z][a-zA-Z0-9_:-]*)[^>]*>/);
    const rootTag = rootMatch ? rootMatch[1] : null;

    // Find all unique tags in the first 3000 chars
    const tagMatches = [...sample.substring(0, 3000).matchAll(/<([a-zA-Z][a-zA-Z0-9_:-]*)[\s>]/g)];
    const tagCounts = {};
    for (const m of tagMatches) {
      tagCounts[m[1]] = (tagCounts[m[1]] || 0) + 1;
    }

    // The repeating item tag is likely the one that appears most after the root
    const sortedTags = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]);

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