/**
 * getFeedStats.js
 * Restituisce statistiche aggregate sui feed e sull'andamento delle importazioni.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const client = base44.asServiceRole;

    // Fetch in parallel
    const [feeds, chunks, logs, allJobs] = await Promise.all([
      client.entities.XMLFeed.list('-created_date', 100),
      client.entities.FeedChunk.list('-created_date', 500),
      client.entities.ImportLog.list('-created_date', 200),
      client.entities.JobOffer.list('-created_date', 1),
    ]);

    // Total jobs count (approximate from feeds)
    const totalJobsImported = feeds.reduce((s, f) => s + (f.total_jobs_imported || 0), 0);
    const activeFeeds = feeds.filter(f => f.status === 'active').length;
    const errorFeeds = feeds.filter(f => f.status === 'error').length;

    // Chunk stats
    const pendingChunks = chunks.filter(c => c.status === 'pending').length;
    const errorChunks = chunks.filter(c => c.status === 'error');

    // Recent errors (last 10 error chunks)
    const recentErrors = errorChunks.slice(0, 10).map(c => ({
      feed_name: c.feed_name,
      chunk_index: c.chunk_index,
      error: c.error_message,
      date: c.updated_date,
    }));

    // Import trend: group logs by day (last 30 days)
    const now = new Date();
    const thirtyDaysAgo = new Date(now - 30 * 24 * 3600 * 1000);
    const recentLogs = logs.filter(l => new Date(l.created_date) >= thirtyDaysAgo);

    const trendMap = {};
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now - i * 24 * 3600 * 1000);
      const key = d.toISOString().slice(0, 10);
      trendMap[key] = { date: key, jobs_imported: 0, runs: 0 };
    }
    for (const log of recentLogs) {
      const key = log.created_date.slice(0, 10);
      if (trendMap[key]) {
        trendMap[key].jobs_imported += log.jobs_imported || 0;
        trendMap[key].runs += 1;
      }
    }
    const trend = Object.values(trendMap);

    // Per-feed history
    const feedHistory = {};
    for (const log of logs.slice(0, 100)) {
      if (!feedHistory[log.feed_id]) feedHistory[log.feed_id] = [];
      feedHistory[log.feed_id].push({
        date: log.created_date,
        jobs_imported: log.jobs_imported || 0,
        jobs_skipped: log.jobs_skipped || 0,
        chunks_processed: log.chunks_processed || 0,
        status: log.status,
        error_message: log.error_message,
        duration_seconds: log.duration_seconds,
      });
    }

    // Top feeds by jobs imported
    const topFeeds = feeds
      .filter(f => f.total_jobs_imported > 0)
      .sort((a, b) => (b.total_jobs_imported || 0) - (a.total_jobs_imported || 0))
      .slice(0, 5)
      .map(f => ({ id: f.id, name: f.name, total: f.total_jobs_imported || 0, status: f.status }));

    return Response.json({
      success: true,
      summary: {
        total_feeds: feeds.length,
        active_feeds: activeFeeds,
        error_feeds: errorFeeds,
        total_jobs_imported: totalJobsImported,
        pending_chunks: pendingChunks,
        error_chunks: errorChunks.length,
      },
      top_feeds: topFeeds,
      recent_errors: recentErrors,
      trend,
      feed_history: feedHistory,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});