/**
 * processChunks.js
 *
 * Prende i FeedChunk con status="pending" (max 5 per run),
 * applica il field_mapping del feed, crea i JobOffer corrispondenti.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

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
    "valle d'aosta": ['aosta'],
  };
  for (const [region, cities] of Object.entries(regionMap)) {
    if (cities.some((c) => l.includes(c))) return region;
  }
  return undefined;
}

/**
 * Applica le regole di field_mapping al job grezzo.
 * 
 * Formato regole (array di oggetti):
 * [
 *   { "target": "title", "source": "jobtitle" },
 *   { "target": "company", "source": ["company", "employer"], "join": " - " },
 *   { "target": "location", "source": "city", "replace": [{ "from": "MI", "to": "Milano" }] },
 *   { "target": "contract_type", "source": "type", "static": "tempo_indeterminato" },
 *   { "target": "description", "source": ["summary", "body"], "join": "\n\n" }
 * ]
 * 
 * Tipi di operazioni supportate:
 * - source: stringa o array di campi sorgente
 * - join: separatore per unire più campi (default " ")
 * - replace: array di {from, to} per sostituzioni
 * - static: valore fisso da assegnare sempre
 * - prefix: prefisso da aggiungere al valore
 * - suffix: suffisso da aggiungere al valore
 * - truncate: numero massimo di caratteri
 */
function applyFieldMapping(rawJob, rules) {
  if (!rules || !Array.isArray(rules) || rules.length === 0) return rawJob;

  const mapped = { ...rawJob };

  for (const rule of rules) {
    if (!rule.target) continue;

    // Static value
    if (rule.static !== undefined) {
      mapped[rule.target] = rule.static;
      continue;
    }

    // Source field(s)
    const sources = Array.isArray(rule.source) ? rule.source : [rule.source];
    const values = sources.map(s => rawJob[s] || rawJob[s?.toLowerCase()]).filter(Boolean);

    if (values.length === 0) continue;

    let val = values.join(rule.join !== undefined ? rule.join : ' ');

    // Replace operations
    if (rule.replace && Array.isArray(rule.replace)) {
      for (const rep of rule.replace) {
        if (rep.from && rep.to !== undefined) {
          val = val.split(rep.from).join(rep.to);
        }
      }
    }

    // Prefix / suffix
    if (rule.prefix) val = rule.prefix + val;
    if (rule.suffix) val = val + rule.suffix;

    // Truncate
    if (rule.truncate && val.length > rule.truncate) val = val.substring(0, rule.truncate);

    mapped[rule.target] = val;
  }

  return mapped;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    try {
      const user = await base44.auth.me();
      if (user?.role !== 'admin') {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }
    } catch (_) { /* scheduler */ }

    const client = base44.asServiceRole;

    const pendingChunks = await client.entities.FeedChunk.filter({ status: 'pending' });
    const toProcess = pendingChunks.slice(0, 5);

    if (toProcess.length === 0) {
      return Response.json({ message: 'No pending chunks', processed: 0 });
    }

    // Cache feed configs to avoid redundant fetches
    const feedCache = {};

    let totalImported = 0;
    const results = [];

    for (const chunk of toProcess) {
      await client.entities.FeedChunk.update(chunk.id, { status: 'processing' });

      try {
        const jobs = JSON.parse(chunk.xml_content);
        const feedName = chunk.feed_name;
        const feedId = chunk.feed_id;

        // Load feed config (with caching)
        let mappingRules = [];
        if (!feedCache[feedId]) {
          const feedList = await client.entities.XMLFeed.filter({ id: feedId });
          feedCache[feedId] = feedList?.[0] || null;
        }
        const feedConfig = feedCache[feedId];
        if (feedConfig?.field_mapping) {
          try {
            mappingRules = JSON.parse(feedConfig.field_mapping);
          } catch (_) { /* invalid JSON — ignore */ }
        }

        // Deduplication
        const existingJobs = await client.entities.JobOffer.filter({ source: feedName });
        const existingIds = new Set(existingJobs.map((j) => j.external_id).filter(Boolean));

        const jobsToCreate = [];

        for (const rawJob of jobs) {
          // Apply custom field mapping rules first
          const j = applyFieldMapping(rawJob, mappingRules);

          const extId = (j.id || j.referencenumber) ? `${feedId}_${j.id || j.referencenumber}` : null;
          if (extId && existingIds.has(extId)) continue;

          const applyUrl = j.url || j.apply_url || j.link || j.joburl || undefined;
          const location = j.location || j.city || j.state || j.town || j.place || undefined;

          const mapped = {
            title: j.title || j.jobtitle || j.position || j.job_title,
            company: j.company || j.employer || j.company_name || j.advertiser,
            location,
            region: j.region || mapRegion(location),
            category: j.category || j.jobcategory || j.sector,
            description: j.description ? j.description.substring(0, 2000) : undefined,
            requirements: j.requirements ? j.requirements.substring(0, 1000) : undefined,
            apply_url: applyUrl,
            external_id: extId || undefined,
            source: feedName,
            contract_type: mapContractType(j.contract_type || j.type || j.jobtype || j.job_type || j.contracttype),
            work_schedule: mapWorkSchedule(j.work_schedule || j.hours || j.workschedule),
            salary_min: j.salary_min ? parseInt(j.salary_min) : undefined,
            salary_max: j.salary_max ? parseInt(j.salary_max) : undefined,
            is_active: true,
            is_featured: false,
          };

          for (const k of Object.keys(mapped)) {
            if (mapped[k] === undefined || mapped[k] === null || mapped[k] === '') delete mapped[k];
          }

          if (!mapped.title) continue;

          jobsToCreate.push(mapped);
        }

        if (jobsToCreate.length > 0) {
          await client.entities.JobOffer.bulkCreate(jobsToCreate);
        }

        if (feedConfig) {
          await client.entities.XMLFeed.update(feedId, {
            last_import_date: new Date().toISOString(),
            total_jobs_imported: (feedConfig.total_jobs_imported || 0) + jobsToCreate.length,
            status: 'active',
          });
          feedCache[feedId] = { ...feedConfig, total_jobs_imported: (feedConfig.total_jobs_imported || 0) + jobsToCreate.length };
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