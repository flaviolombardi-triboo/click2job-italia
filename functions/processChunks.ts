/**
 * processChunks.js
 * 
 * Prende i FeedChunk con status="pending" (max 5 per run),
 * crea i JobOffer corrispondenti, aggiorna il chunk a "done".
 * 
 * Viene chiamato ogni 5 minuti dall'automation finché ci sono chunk da processare.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Mappatura contract_type dal feed verso i valori enum attesi
function mapContractType(raw) {
  if (!raw) return undefined;
  const v = raw.toLowerCase();
  if (v.includes('indeterminat') || v.includes('permanent')) return 'tempo_indeterminato';
  if (v.includes('determinat') || v.includes('fixed') || v.includes('contract')) return 'tempo_determinato';
  if (v.includes('apprendist') || v.includes('apprenti')) return 'apprendistato';
  if (v.includes('stage') || v.includes('tirocin') || v.includes('intern')) return 'stage';
  if (v.includes('partita') || v.includes('freelan') || v.includes('vat')) return 'partita_iva';
  if (v.includes('collabor')) return 'collaborazione';
  if (v.includes('somministr') || v.includes('temp') || v.includes('agency')) return 'somministrazione';
  return undefined;
}

function mapWorkSchedule(raw) {
  if (!raw) return undefined;
  const v = raw.toLowerCase();
  if (v.includes('part') || v.includes('partial')) return 'part_time';
  if (v.includes('full') || v.includes('full-time') || v.includes('tempo pieno')) return 'full_time';
  return undefined;
}

function mapRegion(location) {
  if (!location) return undefined;
  const l = location.toLowerCase();
  const regionMap = {
    'lombardia': ['milan', 'milano', 'bergamo', 'brescia', 'como', 'cremona', 'lecco', 'lodi', 'mantova', 'monza', 'pavia', 'sondrio', 'varese'],
    'lazio': ['roma', 'rome', 'viterbo', 'rieti', 'frosinone', 'latina'],
    'piemonte': ['torino', 'turin', 'asti', 'novara', 'cuneo', 'alessandria', 'biella', 'verbania', 'vercelli'],
    'veneto': ['venezia', 'venice', 'verona', 'padova', 'vicenza', 'treviso', 'belluno', 'rovigo'],
    'emilia-romagna': ['bologna', 'modena', 'parma', 'ferrara', 'ravenna', 'reggio emilia', 'forlì', 'cesena', 'piacenza', 'rimini'],
    'toscana': ['firenze', 'florence', 'siena', 'pisa', 'livorno', 'arezzo', 'grosseto', 'lucca', 'massa', 'pistoia', 'prato'],
    'campania': ['napoli', 'naples', 'salerno', 'caserta', 'avellino', 'benevento'],
    'sicilia': ['palermo', 'catania', 'messina', 'agrigento', 'trapani', 'siracusa', 'ragusa', 'caltanissetta', 'enna'],
    'puglia': ['bari', 'lecce', 'taranto', 'foggia', 'brindisi', 'barletta'],
    'liguria': ['genova', 'genoa', 'savona', 'la spezia', 'imperia'],
    'trentino-alto adige': ['trento', 'bolzano', 'bozen'],
    'friuli-venezia giulia': ['trieste', 'udine', 'pordenone', 'gorizia'],
    'marche': ['ancona', 'pesaro', 'urbino', 'macerata', 'fermo', 'ascoli piceno'],
    'calabria': ['catanzaro', 'reggio calabria', 'cosenza', 'vibo valentia', 'crotone'],
    'sardegna': ['cagliari', 'sassari', 'nuoro', 'oristano', 'olbia'],
    'abruzzo': ["l'aquila", 'pescara', 'chieti', 'teramo'],
    'umbria': ['perugia', 'terni'],
    'basilicata': ['potenza', 'matera'],
    'molise': ['campobasso', 'isernia'],
    'valle d\'aosta': ['aosta'],
  };
  for (const [region, cities] of Object.entries(regionMap)) {
    if (cities.some((c) => l.includes(c))) return region;
  }
  return undefined;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Auth: allow admin or scheduler
    try {
      const user = await base44.auth.me();
      if (user?.role !== 'admin') {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }
    } catch (_) {
      // scheduler — ok
    }

    const client = base44.asServiceRole;

    // Get up to 5 pending chunks
    const pendingChunks = await client.entities.FeedChunk.filter({ status: 'pending' });
    const toProcess = pendingChunks.slice(0, 5);

    if (toProcess.length === 0) {
      return Response.json({ message: 'No pending chunks', processed: 0 });
    }

    let totalImported = 0;
    const results = [];

    for (const chunk of toProcess) {
      // Mark as processing to avoid double-processing
      await client.entities.FeedChunk.update(chunk.id, { status: 'processing' });

      try {
        const jobs = JSON.parse(chunk.xml_content);
        const feedName = chunk.feed_name;
        const feedId = chunk.feed_id;

        // Get existing external_ids for deduplication
        const existingJobs = await client.entities.JobOffer.filter({ source: feedName });
        const existingIds = new Set(existingJobs.map((j) => j.external_id).filter(Boolean));

        const jobsToCreate = [];

        for (const j of jobs) {
          const extId = j.id ? `${feedId}_${j.id}` : null;
          if (extId && existingIds.has(extId)) continue;

          // Map URL field — feed uses 'url', our entity uses 'apply_url'
          const applyUrl = j.url || j.apply_url || undefined;
          const location = j.location || j.city || j.state || undefined;

          const mapped = {
            title: j.title,
            company: j.company,
            location,
            region: j.region || mapRegion(location),
            category: j.category,
            description: j.description ? j.description.substring(0, 2000) : undefined,
            requirements: j.requirements ? j.requirements.substring(0, 1000) : undefined,
            apply_url: applyUrl,
            external_id: extId || undefined,
            source: feedName,
            contract_type: mapContractType(j.contract_type || j.type || j.jobtype || j.job_type),
            work_schedule: mapWorkSchedule(j.work_schedule),
            salary_min: j.salary_min ? parseInt(j.salary_min) : undefined,
            salary_max: j.salary_max ? parseInt(j.salary_max) : undefined,
            is_active: true,
            is_featured: false,
          };

          // Remove undefined fields
          for (const k of Object.keys(mapped)) {
            if (mapped[k] === undefined) delete mapped[k];
          }

          jobsToCreate.push(mapped);
        }

        if (jobsToCreate.length > 0) {
          await client.entities.JobOffer.bulkCreate(jobsToCreate);
        }

        // Update feed totals
        const feed = await client.entities.XMLFeed.filter({ id: feedId });
        if (feed && feed[0]) {
          await client.entities.XMLFeed.update(feedId, {
            last_import_date: new Date().toISOString(),
            total_jobs_imported: (feed[0].total_jobs_imported || 0) + jobsToCreate.length,
            status: 'active',
          });
        }

        await client.entities.FeedChunk.update(chunk.id, {
          status: 'done',
          jobs_imported: jobsToCreate.length,
        });

        totalImported += jobsToCreate.length;
        results.push({
          chunk_index: chunk.chunk_index,
          feed: feedName,
          imported: jobsToCreate.length,
          skipped: jobs.length - jobsToCreate.length,
        });
      } catch (err) {
        await client.entities.FeedChunk.update(chunk.id, {
          status: 'error',
          error_message: err.message,
        });
        results.push({ chunk_index: chunk.chunk_index, error: err.message });
      }
    }

    // Count remaining pending chunks
    const remaining = await client.entities.FeedChunk.filter({ status: 'pending' });

    return Response.json({
      success: true,
      processed: toProcess.length,
      total_imported: totalImported,
      remaining_chunks: remaining.length,
      results,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});