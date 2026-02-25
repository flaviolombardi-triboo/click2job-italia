/**
 * processChunks.js
 *
 * Elabora FeedChunk pending in modo veloce:
 * - Prende fino a 15 chunk per run
 * - Raggruppa per feed → deduplica una volta sola per feed (non per chunk)
 * - Processa i chunk di feed diversi in parallelo
 * - Scrive ImportLog per ogni feed processato
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mapContractType(raw) {
  if (!raw) return undefined;
  const v = raw.toLowerCase();
  if (v.includes('indeterminat') || v.includes('permanent') || v.includes('unbefrist')) return 'tempo_indeterminato';
  if (v.includes('determinat') || v.includes('fixed') || v.includes('befrist') || v.includes('temporary')) return 'tempo_determinato';
  if (v.includes('apprendist') || v.includes('apprenti')) return 'apprendistato';
  if (v.includes('stage') || v.includes('tirocin') || v.includes('intern') || v.includes('trainee')) return 'stage';
  if (v.includes('partita') || v.includes('freelan') || v.includes('vat') || v.includes('p.iva')) return 'partita_iva';
  if (v.includes('collabor')) return 'collaborazione';
  if (v.includes('somministr') || v.includes('temp agency') || v.includes('leasing')) return 'somministrazione';
  return undefined;
}

function mapWorkSchedule(raw) {
  if (!raw) return undefined;
  const v = raw.toLowerCase();
  if (v.includes('part') || v.includes('partial') || v.includes('ridott')) return 'part_time';
  if (v.includes('full') || v.includes('pieno') || v.includes('intero')) return 'full_time';
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

function applyFieldMapping(rawJob, rules) {
  if (!rules || rules.length === 0) return rawJob;
  const mapped = { ...rawJob };
  for (const rule of rules) {
    if (!rule.target) continue;
    if (rule.static !== undefined) { mapped[rule.target] = rule.static; continue; }
    const sources = Array.isArray(rule.source) ? rule.source : [rule.source];
    const values = sources.map(s => rawJob[s] || rawJob[s?.toLowerCase()]).filter(Boolean);
    if (values.length === 0) continue;
    let val = values.join(rule.join !== undefined ? rule.join : ' ');
    if (rule.replace) for (const rep of rule.replace) { if (rep.from) val = val.split(rep.from).join(rep.to ?? ''); }
    if (rule.prefix) val = rule.prefix + val;
    if (rule.suffix) val = val + rule.suffix;
    if (rule.truncate && val.length > rule.truncate) val = val.substring(0, rule.truncate);
    mapped[rule.target] = val;
  }
  return mapped;
}

// ─── Text normalisation helpers ───────────────────────────────────────────────

/** Titolo: Title Case, rimuove codici interni tipo [REF-123], massimo 120 char */
function cleanTitle(raw) {
  if (!raw) return undefined;
  let t = raw
    .replace(/\[.*?\]/g, '')        // [REF-123]
    .replace(/\(.*?\)/g, '')        // (codice interno)
    .replace(/[-_]{2,}/g, ' ')      // -- o ___
    .replace(/\s{2,}/g, ' ')
    .trim();
  // Title Case se tutto maiuscolo
  if (t === t.toUpperCase() && t.length > 3) {
    t = t.toLowerCase().replace(/(?:^|\s|-)\S/g, c => c.toUpperCase());
  }
  return t.substring(0, 120) || undefined;
}

/** Azienda: rimuove suffissi legali ridondanti, normalizza spazi */
function cleanCompany(raw) {
  if (!raw) return undefined;
  let c = raw
    .replace(/\b(S\.?R\.?L\.?|S\.?P\.?A\.?|S\.?N\.?C\.?|S\.?A\.?S\.?)\b/gi, m => m.replace(/\./g, '').toUpperCase())
    .replace(/\s{2,}/g, ' ')
    .trim();
  // Rimuovi aziende placeholder/anonime
  if (/^(confidential|azienda riservata|riservato|cliente riservato|n\/d|nd|-)$/i.test(c)) return undefined;
  // Title Case se tutto maiuscolo
  if (c === c.toUpperCase() && c.length > 4 && !/\bSRL\b|\bSPA\b|\bSNC\b/.test(c)) {
    c = c.toLowerCase().replace(/(?:^|\s)\S/g, x => x.toUpperCase());
  }
  return c.substring(0, 120) || undefined;
}

/** Location: normalizza capitalizzazione, rimuove province tra parentesi tipo "Milano (MI)" → "Milano" */
function cleanLocation(raw) {
  if (!raw) return undefined;
  let l = raw
    .replace(/\s*\([A-Z]{2}\)\s*/g, '')   // (MI), (RM) ecc.
    .replace(/\s*-\s*[A-Z]{2}$/g, '')     // Milano - MI
    .replace(/\s{2,}/g, ' ')
    .trim();
  if (l === l.toUpperCase() && l.length > 2) {
    l = l.toLowerCase().replace(/(?:^|\s|-)\S/g, c => c.toUpperCase());
  }
  return l.substring(0, 100) || undefined;
}

/** Descrizione: rimuove duplicazioni di spazi/newline, nessun troncamento */
function cleanDescription(raw) {
  if (!raw) return undefined;
  return raw
    .replace(/(\n\s*){3,}/g, '\n\n')   // max 2 righe vuote consecutive
    .replace(/\s{3,}/g, '  ')
    .trim() || undefined;
}

/** Salary: estrae il primo numero da stringhe tipo "30.000 €" o "30000-40000" */
function parseSalary(raw) {
  if (!raw) return undefined;
  const cleaned = String(raw).replace(/[^\d.,\-]/g, '').replace(',', '.');
  const n = parseFloat(cleaned);
  return isNaN(n) ? undefined : Math.round(n);
}

// ─── Record builder ───────────────────────────────────────────────────────────

function buildJobRecord(rawJob, mappingRules, feedName, feedId) {
  const j = applyFieldMapping(rawJob, mappingRules);

  const extRaw = j.id || j.referencenumber || j.jobid || j.vacancyid || j.reqid || j.requisitionid || j.reference;
  const extId = extRaw ? `${feedId}_${String(extRaw).trim()}` : null;

  const rawTitle = j.title || j.jobtitle || j.position || j.job_title || j.positiontitle;
  const rawCompany = j.company || j.employer || j.company_name || j.advertiser || j.organization || j.client || j.azienda;
  const rawLocation = j.location || j.city || j.town || j.place || j.municipality || j.worklocation || j.worktown || j.sede;
  const rawApplyUrl = j.apply_url || j.applicationurl || j.applyurl || j.apply_link || j.joburl || j.url || j.link;

  const title = cleanTitle(rawTitle);
  if (!title) return null;

  const company = cleanCompany(rawCompany);
  const location = cleanLocation(rawLocation);

  const record = {
    title,
    company,
    location,
    region: j.region || j.state || j.province || mapRegion(location),
    category: j.category || j.jobcategory || j.sector || j.function || j.discipline || j.area,
    description: cleanDescription(j.description),
    requirements: (j.requirements || j.qualifications || j.skills)
      ? (j.requirements || j.qualifications || j.skills || '').substring(0, 1000)
      : undefined,
    apply_url: rawApplyUrl,
    external_id: extId || undefined,
    source: feedName,
    contract_type: mapContractType(
      j.contract_type || j.type || j.jobtype || j.job_type || j.contracttype || j.employment_type || j.worktype
    ),
    work_schedule: mapWorkSchedule(
      j.work_schedule || j.hours || j.workschedule || j.schedule || j.workhours
    ),
    salary_min: parseSalary(j.salary_min || j.salary),
    salary_max: parseSalary(j.salary_max),
    is_active: true,
    is_featured: false,
  };

  // Strip undefined/null/empty
  for (const k of Object.keys(record)) {
    if (record[k] === undefined || record[k] === null || record[k] === '') delete record[k];
  }

  return { record, extId };
}

// ─── Process one feed's worth of chunks ──────────────────────────────────────

async function processFeedChunks(chunks, feedConfig, client) {
  const feedId = chunks[0].feed_id;
  const feedName = chunks[0].feed_name;
  const mappingRules = (() => {
    try { return feedConfig?.field_mapping ? JSON.parse(feedConfig.field_mapping) : []; }
    catch (_) { return []; }
  })();

  // Mark all chunks as processing in parallel
  await Promise.all(chunks.map(c => client.entities.FeedChunk.update(c.id, { status: 'processing' })));

  // Load existing external_ids ONCE for the entire feed (big performance win)
  const existingJobs = await client.entities.JobOffer.filter({ source: feedName });
  const existingIds = new Set(existingJobs.map((j) => j.external_id).filter(Boolean));

  let imported = 0;
  let skipped = 0;
  let hasError = false;
  const chunkUpdates = [];

  // Build all jobs across all chunks first, then bulk-create once
  const allJobsToCreate = [];

  for (const chunk of chunks) {
    try {
      const jobs = JSON.parse(chunk.xml_content);
      const chunkJobs = [];

      for (const rawJob of jobs) {
        const result = buildJobRecord(rawJob, mappingRules, feedName, feedId);
        if (!result) continue;
        const { record, extId } = result;
        if (extId && existingIds.has(extId)) { skipped++; continue; }
        if (extId) existingIds.add(extId); // prevent intra-batch duplicates
        chunkJobs.push(record);
      }

      allJobsToCreate.push(...chunkJobs);
      chunkUpdates.push({ id: chunk.id, status: 'done', jobs_imported: chunkJobs.length });
      imported += chunkJobs.length;
    } catch (err) {
      chunkUpdates.push({ id: chunk.id, status: 'error', error_message: err.message });
      hasError = true;
    }
  }

  // Single bulkCreate for ALL jobs across ALL chunks of this feed
  if (allJobsToCreate.length > 0) {
    await client.entities.JobOffer.bulkCreate(allJobsToCreate);
  }

  // Update feed total and chunk statuses in parallel
  const newTotal = (feedConfig?.total_jobs_imported || 0) + imported;
  await Promise.all([
    feedConfig
      ? client.entities.XMLFeed.update(feedId, {
          last_import_date: new Date().toISOString(),
          total_jobs_imported: newTotal,
          status: 'active',
        })
      : Promise.resolve(),
    ...chunkUpdates.map(u => client.entities.FeedChunk.update(u.id, { status: u.status, jobs_imported: u.jobs_imported, error_message: u.error_message })),
  ]);

  return { feedId, feedName, imported, skipped, chunks: chunks.length, hasError };
}

// ─── HTTP handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  const startTime = Date.now();
  try {
    const base44 = createClientFromRequest(req);

    try {
      const user = await base44.auth.me();
      if (user?.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });
    } catch (_) { /* scheduler */ }

    const client = base44.asServiceRole;

    const pendingChunks = await client.entities.FeedChunk.filter({ status: 'pending' });
    const toProcess = pendingChunks.filter(c => c.id).slice(0, 15);

    if (toProcess.length === 0) return Response.json({ message: 'No pending chunks', processed: 0 });
    
    console.log('Sample chunk keys:', JSON.stringify(Object.keys(toProcess[0])));
    console.log('Sample chunk id:', toProcess[0].id, 'feed_id:', toProcess[0].feed_id);

    // Group chunks by feed_id
    const byFeed = {};
    for (const chunk of toProcess) {
      if (!byFeed[chunk.feed_id]) byFeed[chunk.feed_id] = [];
      byFeed[chunk.feed_id].push(chunk);
    }

    // Load all needed feed configs - get all active feeds once
    const feedIds = Object.keys(byFeed);
    const allFeeds = await client.entities.XMLFeed.list();
    const feedConfigs = feedIds.map(id => allFeeds.find(f => f.id === id) || null);
    const feedConfigMap = {};
    feedIds.forEach((id, i) => { feedConfigMap[id] = feedConfigs[i]; });

    // Process each feed's chunks in parallel
    const feedResults = await Promise.all(
      feedIds.map(feedId => processFeedChunks(byFeed[feedId], feedConfigMap[feedId], client))
    );

    // Write ImportLog entries and tally totals
    const durationSeconds = Math.round((Date.now() - startTime) / 1000);
    let totalImported = 0;
    let totalSkipped = 0;

    await Promise.all(
      feedResults.map(async (agg) => {
        totalImported += agg.imported;
        totalSkipped += agg.skipped;
        if (agg.imported > 0 || agg.hasError) {
          await client.entities.ImportLog.create({
            feed_id: agg.feedId,
            feed_name: agg.feedName,
            jobs_imported: agg.imported,
            jobs_skipped: agg.skipped,
            chunks_processed: agg.chunks,
            status: agg.hasError ? (agg.imported > 0 ? 'partial' : 'error') : 'success',
            duration_seconds: durationSeconds,
          });
        }
      })
    );

    const remaining = await client.entities.FeedChunk.filter({ status: 'pending' });

    return Response.json({
      success: true,
      processed: toProcess.length,
      total_imported: totalImported,
      total_skipped: totalSkipped,
      remaining_chunks: remaining.length,
      feeds_processed: feedIds.length,
      duration_seconds: durationSeconds,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});