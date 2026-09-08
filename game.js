(() => {
  'use strict';

  const SAVE_KEY = 'screenEmpireSave';
  const BACKUP_KEY = 'screenEmpireSaveBackup';
  const SAVE_VERSION = 4;
  const BUILD_VERSION = '4.0.0-opportunities';
  const money = value => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
  const esc = value => String(value ?? '').replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]));

  const ECONOMY = {
    startingCash: 550000,
    weeklyOverhead: 6000,
    reserveWeeks: 4,
    duration: { Movie: { Small: 8, Medium: 10, Large: 12 }, 'TV Season': { Small: 9, Medium: 11, Large: 13 } },
    release: {
      Movie: { earningWeeks: 12, theatricalWeeks: 6, theatricalDecay: .72, studioShare: .50, grossBase: .44, grossAppeal: 1.55, digitalDecay: .72, digitalBase: .08, digitalAppeal: .15 },
      'TV Season': { earningWeeks: 14, digitalDecay: .78, digitalBase: .23, digitalAppeal: .62 }
    }
  };

  const EXPERIENCE_MILESTONES = [100, 250, 450, 700, 1000, 1400, 1900, 2500, 3200];
  const BASE_GENRES = ['Comedy', 'Drama', 'Action'];
  const GENRES = {
    Comedy: { strength: 'Humor and character timing', tradeoff: 'A weak comic premise limits repeat interest', audiences: ['broad entertainment', 'genre enthusiasts'], words: ['Mix-Up', 'Weekend', 'Neighbors', 'Second Chance'] },
    Drama: { strength: 'Character depth and emotional payoff', tradeoff: 'Low awareness can hide a strong film', audiences: ['prestige-oriented viewers', 'broad entertainment'], words: ['Long Return', 'Quiet Distance', 'Inheritance', 'River'] },
    Action: { strength: 'Momentum and clear stakes', tradeoff: 'Spectacle can strain a small budget', audiences: ['broad entertainment', 'genre enthusiasts'], words: ['Nightfall', 'Redline', 'Last Pursuit', 'Vanguard'] },
    Horror: { strength: 'Atmosphere and an effective premise', tradeoff: 'Contained stories outperform cheap imitation spectacle', audiences: ['genre enthusiasts'], words: ['Hollow Room', 'After Midnight', 'The Watching House', 'Cold Signal'] },
    Thriller: { strength: 'Tension and pacing', tradeoff: 'Direction matters more than raw scale', audiences: ['genre enthusiasts', 'broad entertainment'], words: ['Narrow Margin', 'The Deadline', 'Silent Pursuit', 'False Exit'] },
    Mystery: { strength: 'Coherent clues and a satisfying resolution', tradeoff: 'Confusing stories lose audience trust', audiences: ['genre enthusiasts', 'prestige-oriented viewers'], words: ['The Missing Key', 'Bellweather Case', 'Last Witness', 'Clue at Dawn'] },
    Romance: { strength: 'Chemistry and emotional payoff', tradeoff: 'Star popularity cannot replace believable characters', audiences: ['broad entertainment'], words: ['Meet Me in Autumn', 'Second First Date', 'Between Two Summers', 'The Long Way Home'] },
    Crime: { strength: 'Conflict, motivation, and authenticity', tradeoff: 'Generic stakes weaken audience fit', audiences: ['genre enthusiasts', 'prestige-oriented viewers'], words: ['Harbor Street', 'The Inside Job', 'County Line', 'A Debt Unpaid'] },
    'Science Fiction': { strength: 'A strong idea can support a contained production', tradeoff: 'Spectacle is costly on a small budget', audiences: ['genre enthusiasts', 'broad entertainment'], words: ['Signal Beyond', 'Orbit Nine', 'The Last Transmission', 'Tomorrow Archive'] },
    Fantasy: { strength: 'Character-driven wonder or ambitious world-building', tradeoff: 'Unfocused world-building raises risk', audiences: ['genre enthusiasts', 'broad entertainment'], words: ['The Glass Kingdom', 'Ash and Starlight', 'The Smallest Crown', 'Moonward'] },
    Historical: { strength: 'Period detail balanced with human storytelling', tradeoff: 'Large scope increases design pressure', audiences: ['prestige-oriented viewers'], words: ['Winter of 1912', 'The Cartographer', 'Letters from the Front', 'A Republic of Dust'] },
    Documentary: { strength: 'Research, access, and precise editing', tradeoff: 'Weak access cannot be repaired by celebrity casting', audiences: ['prestige-oriented viewers', 'genre enthusiasts'], words: ['Inside the Workshop', 'The Last Local', 'Unmapped', 'Voices of the River'] }
  };

  const CONCEPT_SEEDS = {
    Comedy: [['unlikely', 'Unlikely Allies', 'Two opposites must solve one very public problem.', 68], ['mixup', 'A Costly Mix-Up', 'A simple mistake grows into a community-sized problem.', 72], ['reunion', 'The Unplanned Reunion', 'Old friends collide at the worst possible time.', 70]],
    Drama: [['lastcall', 'The Last Call', 'A final chance forces an old professional to confront the past.', 73], ['homecoming', 'The Difficult Homecoming', 'A return home exposes a choice left unresolved.', 75], ['inheritance', 'An Uneasy Inheritance', 'A family legacy tests competing loyalties.', 72]],
    Action: [['countdown', 'Against the Clock', 'A compact rescue story built around a relentless deadline.', 70], ['escort', 'The Last Escort', 'A small team must protect one critical witness.', 72], ['lockdown', 'City Lockdown', 'A determined specialist finds a route through a closing city.', 69]],
    Horror: [['h-contained', 'The Sealed Room', 'A contained location turns familiar sounds into a threat.', 77], ['h-folklore', 'A Forgotten Warning', 'Local folklore begins repeating in the present.', 74], ['h-isolation', 'No One Answers', 'An isolated group realizes the silence is deliberate.', 72]],
    Thriller: [['t-pursuit', 'The Quiet Pursuit', 'A witness must stay ahead without revealing the truth.', 75], ['t-clock', 'Ninety Minutes', 'One decision must be reversed before a public deadline.', 73], ['t-double', 'The Trusted Stranger', 'An ally may be controlling the entire chase.', 76]],
    Mystery: [['m-room', 'The Locked Archive', 'A missing record changes the meaning of an old case.', 76], ['m-clues', 'Three Honest Clues', 'Every clue is true, but together they tell the wrong story.', 78], ['m-town', 'The Bellweather File', 'A small town agrees on everything except what happened.', 74]],
    Romance: [['r-reunion', 'One More Summer', 'Former partners share one project and a final choice.', 73], ['r-rivals', 'Competing Hearts', 'Professional rivals discover a reason to cooperate.', 71], ['r-distance', 'Halfway Home', 'Two lives must bend before distance makes the decision.', 75]],
    Crime: [['c-debt', 'The Unpaid Debt', 'An old favor pulls a careful citizen into a local scheme.', 75], ['c-witness', 'The Reluctant Witness', 'A witness knows the truth but distrusts both sides.', 74], ['c-heist', 'The Smallest Heist', 'A modest target reveals a much larger betrayal.', 72]],
    'Science Fiction': [['sf-signal', 'The Impossible Signal', 'A tiny research team receives a message from tomorrow.', 78], ['sf-memory', 'Borrowed Memories', 'A contained experiment changes who owns a life story.', 76], ['sf-orbit', 'One Orbit Left', 'A failing station has one quiet chance to return home.', 74]],
    Fantasy: [['f-crown', 'The Unwanted Crown', 'A reluctant heir protects a kingdom using wit instead of armies.', 75], ['f-door', 'The Last Door', 'A neighborhood doorway opens onto an unfinished legend.', 73], ['f-bargain', 'A Small Magic', 'One useful spell carries an unexpectedly personal price.', 77]],
    Historical: [['hi-letters', 'The Hidden Letters', 'Private correspondence reframes a public turning point.', 76], ['hi-strike', 'The Long Winter', 'A community chooses solidarity during a bitter season.', 75], ['hi-map', 'The Cartographer', 'A mapmaker must decide which border becomes official.', 78]],
    Documentary: [['d-access', 'Behind the Workshop', 'Rare access follows craftspeople through a changing trade.', 76], ['d-place', 'The Last Local', 'A community records what may be its final shared season.', 74], ['d-question', 'Who Owns the River?', 'Research connects several lives to one disputed resource.', 78]]
  };

  const concepts = Object.entries(CONCEPT_SEEDS).flatMap(([genre, items]) => items.map(([id, name, note, strength]) => ({ id, name, note, strength, genres: [genre] })));
  const allGenreNames = Object.keys(GENRES);
  const DATA = {
    genres: GENRES,
    concepts,
    talent: {
      writers: [
        { id: 'w1', name: 'Mara Bell', ability: 66, fit: 'Comedy', fits: ['Comedy', 'Romance', 'Fantasy'], popularity: 34, reliability: 88, cost: 24000 },
        { id: 'w2', name: 'Jonah Price', ability: 73, fit: 'Drama', fits: ['Drama', 'Historical', 'Crime'], popularity: 41, reliability: 78, cost: 32000 },
        { id: 'w3', name: 'Rin Okafor', ability: 69, fit: 'Action', fits: ['Action', 'Thriller', 'Science Fiction'], popularity: 29, reliability: 92, cost: 28000 },
        { id: 'w4', name: 'Iris Shaw', ability: 70, fit: 'Mystery', fits: ['Mystery', 'Horror', 'Documentary'], popularity: 25, reliability: 90, cost: 27000 }
      ],
      directors: [
        { id: 'd1', name: 'Elena Park', ability: 68, fit: 'Comedy', fits: ['Comedy', 'Romance', 'Documentary'], popularity: 37, reliability: 91, cost: 38000 },
        { id: 'd2', name: 'Malcolm Voss', ability: 77, fit: 'Drama', fits: ['Drama', 'Crime', 'Historical'], popularity: 52, reliability: 74, cost: 52000 },
        { id: 'd3', name: 'Tessa Cole', ability: 71, fit: 'Action', fits: ['Action', 'Thriller', 'Science Fiction'], popularity: 46, reliability: 84, cost: 46000 },
        { id: 'd4', name: 'Sofia Nwosu', ability: 72, fit: 'Horror', fits: ['Horror', 'Mystery', 'Fantasy'], popularity: 31, reliability: 89, cost: 42000 }
      ],
      leads: [
        { id: 'l1', name: 'Nico Vale', ability: 65, fit: 'Comedy', fits: ['Comedy', 'Romance', 'Fantasy'], popularity: 48, reliability: 89, cost: 42000 },
        { id: 'l2', name: 'Amara Finch', ability: 76, fit: 'Drama', fits: ['Drama', 'Historical', 'Mystery'], popularity: 45, reliability: 86, cost: 55000 },
        { id: 'l3', name: 'Devin Cross', ability: 70, fit: 'Action', fits: ['Action', 'Thriller', 'Crime'], popularity: 62, reliability: 76, cost: 63000 },
        { id: 'l4', name: 'Rowan Pike', ability: 68, fit: 'Documentary', fits: ['Documentary', 'Horror', 'Science Fiction'], popularity: 28, reliability: 93, cost: 39000 }
      ]
    },
    budgets: { Movie: { Small: 180000, Medium: 340000, Large: 600000 }, 'TV Season': { Small: 220000, Medium: 420000, Large: 720000 } },
    marketing: { Lean: 15000, Standard: 40000, Strong: 80000 },
    buyers: [
      { id: 'northstar', name: 'Northstar Stream', interests: ['Thriller', 'Mystery', 'Crime', 'Action'], budget: 360000 },
      { id: 'hearth', name: 'Hearthlight+', interests: ['Comedy', 'Romance', 'Drama', 'Historical'], budget: 310000 },
      { id: 'signal', name: 'Signal House', interests: ['Horror', 'Science Fiction', 'Fantasy', 'Documentary'], budget: 280000 }
    ]
  };

  function defaultState() {
    return {
      version: SAVE_VERSION, buildVersion: BUILD_VERSION, studioName: '', week: 1, cash: ECONOMY.startingCash,
      weeklyOverhead: ECONOMY.weeklyOverhead, activePage: 'dashboard',
      team: { name: 'Production Team A', busyProductionId: null, busyContractId: null },
      productions: [], catalog: [], transactions: [], contracts: [], licenses: [], opportunities: [],
      news: [{ id: 'welcome', week: 1, title: 'A new independent studio enters the market', text: 'Your office is open. A practical paid opportunity will arrive by Week 2.', category: 'studio', read: false }],
      progression: { experience: 0, unlockedGenres: [...BASE_GENRES], pendingGenreChoices: 0, claimedMilestones: [], completedClientJobs: 0, selectedGoal: 0, migrationRecap: null },
      opportunityClock: { lastCheckWeek: 1, lastCreatedWeek: 0, nextCheckWeek: 2, sequence: 0, skipReason: 'Opening week; first offer scheduled for Week 2.' },
      officeBusyUntil: 0, tutorialStep: 0, firstYearComplete: false,
      titleGenerator: { counter: 0, history: [], draft: null }, advancing: false, nextId: 1
    };
  }

  let state = loadState();
  let toastTimer;

  function loadState() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return defaultState();
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object' || !parsed.studioName) return defaultState();
      if ((parsed.version || 0) < SAVE_VERSION) localStorage.setItem(BACKUP_KEY, raw);
      const migrated = migrateState(parsed);
      localStorage.setItem(SAVE_KEY, JSON.stringify(migrated));
      return migrated;
    } catch (_) { return defaultState(); }
  }

  function migrateState(old) {
    const fresh = defaultState();
    const oldVersion = old.version || 0;
    const migrated = {
      ...fresh, ...old, version: SAVE_VERSION, buildVersion: BUILD_VERSION,
      team: { ...fresh.team, ...(old.team || {}) },
      titleGenerator: { ...fresh.titleGenerator, ...(old.titleGenerator || {}) },
      progression: { ...fresh.progression, ...(old.progression || {}) },
      opportunityClock: { ...fresh.opportunityClock, ...(old.opportunityClock || {}) },
      productions: Array.isArray(old.productions) ? old.productions : [],
      catalog: Array.isArray(old.catalog) ? old.catalog : [],
      transactions: Array.isArray(old.transactions) ? old.transactions : [],
      news: Array.isArray(old.news) ? old.news.map(n => ({ read: false, ...n })) : fresh.news,
      opportunities: Array.isArray(old.opportunities) ? old.opportunities : [],
      contracts: Array.isArray(old.contracts) ? old.contracts : [],
      licenses: Array.isArray(old.licenses) ? old.licenses : [], advancing: false
    };
    if (oldVersion < 3 && migrated.weeklyOverhead === 7500) migrated.weeklyOverhead = ECONOMY.weeklyOverhead;
    if (oldVersion < 4) {
      const completedOriginals = migrated.productions.filter(p => p.status === 'Released').length;
      const retroExperience = completedOriginals * 100;
      migrated.progression.experience = Math.max(migrated.progression.experience || 0, retroExperience);
      const earned = EXPERIENCE_MILESTONES.filter(x => x <= migrated.progression.experience);
      migrated.progression.claimedMilestones = [...new Set([...(migrated.progression.claimedMilestones || []), ...earned])];
      const choicesUsed = Math.max(0, (migrated.progression.unlockedGenres || BASE_GENRES).length - BASE_GENRES.length);
      migrated.progression.pendingGenreChoices = Math.max(migrated.progression.pendingGenreChoices || 0, earned.length - choicesUsed);
      migrated.progression.unlockedGenres = [...new Set([...BASE_GENRES, ...(migrated.progression.unlockedGenres || [])])];
      migrated.progression.migrationRecap = `Your existing save earned ${retroExperience} Studio Experience from ${completedOriginals} completed original${completedOriginals === 1 ? '' : 's'}. ${Math.max(0, earned.length - choicesUsed)} genre choice${earned.length - choicesUsed === 1 ? '' : 's'} are ready.`;
      migrated.opportunityClock.nextCheckWeek = migrated.week;
      migrated.opportunityClock.skipReason = 'Save migrated; an appropriate offer is due now.';
    }
    return migrated;
  }

  function saveState() { localStorage.setItem(SAVE_KEY, JSON.stringify({ ...state, advancing: false })); }
  function nextId(prefix) { return `${prefix}-${state.nextId++}`; }
  function recordTransaction(amount, category, detail, productionId = null, eventId = null) {
    state.cash += amount;
    const tx = { id: nextId('tx'), week: state.week, amount: Math.round(amount), category, detail, productionId, eventId };
    state.transactions.unshift(tx); state.transactions = state.transactions.slice(0, 300); return tx.id;
  }
  function addNews(title, text, category = 'studio', eventId = null, action = null) {
    const item = { id: nextId('news'), week: state.week, title, text, category, eventId, action, read: false };
    state.news.unshift(item); state.news = state.news.slice(0, 120); return item.id;
  }

  function deterministicNoise(id, salt = 0) { let n = 0; for (const ch of `${id}-${salt}`) n = (n * 31 + ch.charCodeAt(0)) % 9973; return (n % 17) - 8; }
  function stageFor(progress, duration) { const ratio = progress / duration; if (ratio < .2) return 'Development'; if (ratio < .62) return 'Filming'; if (ratio < .9) return 'Post-production'; return 'Release'; }
  function normalizeTitle(title) { return String(title || '').trim().replace(/\s+/g, ' ').toLocaleLowerCase(); }
  function talentFits(person, genre) { return (person.fits || [person.fit]).includes(genre); }

  function titleCandidates(format, genre) {
    const bank = GENRES[genre]?.words || GENRES.Comedy.words;
    const suffixes = format === 'Movie' ? ['', ' at Midnight', ' in Bellweather', ' Protocol', ' Returns'] : ['', ' County', ' Files', ' Division', ' Stories'];
    return [...new Set(bank.flatMap(word => suffixes.map(suffix => `${word}${suffix}`)))];
  }
  function generateTitle(format, genre, excludedTitle = '') {
    const candidates = titleCandidates(format, genre);
    const existing = new Set(state.productions.map(prod => normalizeTitle(prod.title)));
    const recent = new Set((state.titleGenerator.history || []).map(normalizeTitle));
    const excluded = normalizeTitle(excludedTitle);
    const start = (state.titleGenerator.counter * 7 + state.week * 3 + state.nextId) % candidates.length;
    let chosen = '';
    for (let i = 0; i < candidates.length; i++) {
      const candidate = candidates[(start + i) % candidates.length];
      if (!existing.has(normalizeTitle(candidate)) && !recent.has(normalizeTitle(candidate)) && normalizeTitle(candidate) !== excluded) { chosen = candidate; break; }
    }
    if (!chosen) chosen = `${candidates[start] || `${genre} ${format}`} ${state.titleGenerator.counter + 2}`;
    state.titleGenerator.counter++; state.titleGenerator.history = [...(state.titleGenerator.history || []), chosen].slice(-36); return chosen;
  }
  function ensureTitleDraft(format = 'Movie', genre = 'Comedy') {
    if (!state.titleGenerator.draft) { state.titleGenerator.draft = { title: generateTitle(format, genre), source: 'generated', format, genre }; saveState(); }
    return state.titleGenerator.draft;
  }
  function continuationTitle(parentTitle, kind, number) { const clean = String(parentTitle || '').replace(/\s+[—-]\s+Season\s+\d+$/i, '').replace(/\s+\d+$/i, '').trim(); return kind === 'season' ? `${clean} — Season ${number}` : `${clean} ${number}`; }
  function unrelatedTitleDuplicate(title, parentProductionId = null) { const normalized = normalizeTitle(title); return state.productions.some(p => p.id !== parentProductionId && normalizeTitle(p.title) === normalized); }

  function nextExperienceMilestone() { return EXPERIENCE_MILESTONES.find(x => x > state.progression.experience) || null; }
  function awardExperience(amount, reason, eventId = null) {
    state.progression.experience += amount;
    const newlyReached = EXPERIENCE_MILESTONES.filter(x => x <= state.progression.experience && !state.progression.claimedMilestones.includes(x));
    for (const milestone of newlyReached) {
      state.progression.claimedMilestones.push(milestone); state.progression.pendingGenreChoices++;
      addNews('A new genre choice is ready', `${milestone} Studio Experience reached. Choose any remaining genre in Career Progress.`, 'progress', eventId, { page: 'career' });
    }
    return newlyReached.length;
  }
  function unlockGenre(genre) {
    if (!GENRES[genre] || state.progression.unlockedGenres.includes(genre) || state.progression.pendingGenreChoices < 1) return;
    state.progression.unlockedGenres.push(genre); state.progression.pendingGenreChoices--;
    state.titleGenerator.draft = { title: generateTitle('Movie', genre), source: 'generated', format: 'Movie', genre };
    addNews(`${genre} capability unlocked`, `${genre} is immediately available with concepts, talent matches, and title generation.`, 'progress', null, { page: 'productions' });
    saveState(); state.activePage = 'productions'; render(); showToast(`${genre} is ready for production.`);
  }

  function releaseRevenueForWeek(prod, elapsed) {
    const appeal = clamp((prod.audienceScore * .58 + prod.awareness * .42) / 100, .2, .95);
    const rules = ECONOMY.release[prod.format]; let result;
    if (prod.format === 'Movie' && elapsed < rules.theatricalWeeks) {
      const grossSales = Math.round(prod.baseCost * (rules.grossBase + appeal * rules.grossAppeal) * Math.pow(rules.theatricalDecay, elapsed));
      result = { channel: 'theatrical', grossSales, studioRevenue: Math.round(grossSales * rules.studioShare) };
    } else {
      const e = prod.format === 'Movie' ? elapsed - rules.theatricalWeeks : elapsed;
      const studioRevenue = Math.round(prod.baseCost * (rules.digitalBase + appeal * rules.digitalAppeal) * Math.pow(rules.digitalDecay, e));
      result = { channel: 'digital', grossSales: studioRevenue, studioRevenue };
    }
    if ((prod.demandBoostRemaining || 0) > 0) result.studioRevenue = Math.round(result.studioRevenue * 1.18);
    return result;
  }

  function productionExplanation(prod) {
    const fits = [prod.talent.writer, prod.talent.director, prod.talent.lead].filter(p => talentFits(p, prod.genre)).length;
    const worked = [];
    const held = [];
    if (fits >= 2) worked.push('The creative team matched the genre well.'); else held.push('Several hires were working outside their strongest genre.');
    if (prod.concept.strength >= 75) worked.push('The central concept provided a strong foundation.'); else held.push('The premise was workable but not especially distinctive.');
    if (prod.awareness >= 55) worked.push('The campaign created strong awareness.'); else held.push('Limited awareness reduced early audience reach.');
    if (prod.decision?.choice === 'rehearse') worked.push('Extra rehearsal improved finished quality.');
    if (prod.decision?.choice === 'audience') worked.push('Audience-focused promotion improved awareness.');
    return { worked: worked.join(' '), heldBack: held.join(' ') || 'No single major weakness dominated the result.' };
  }

  function finishProduction(prod) {
    if (!prod.decision) prod.decision = { choice: 'preserve', label: 'Keep the current plan', cost: 0, qualityBonus: 0, awarenessBonus: 0, appliedWeek: state.week, automatic: true };
    const people = [prod.talent.writer, prod.talent.director, prod.talent.lead];
    const ability = people.reduce((s, p) => s + p.ability, 0) / 3;
    const fit = people.reduce((s, p) => s + (talentFits(p, prod.genre) ? 100 : 58), 0) / 3;
    const reliability = people.reduce((s, p) => s + p.reliability, 0) / 3;
    const budgetBoost = { Small: 0, Medium: 5, Large: 9 }[prod.budgetSize];
    prod.quality = Math.round(clamp(prod.concept.strength * .31 + ability * .34 + fit * .2 + reliability * .15 + budgetBoost + (prod.decision.qualityBonus || 0) + deterministicNoise(prod.id), 35, 96));
    prod.awareness = Math.round(clamp(prod.awareness + (prod.decision.awarenessBonus || 0), 20, 96));
    prod.criticScore = Math.round(clamp(prod.quality + deterministicNoise(prod.id, 2), 28, 98));
    prod.audienceScore = Math.round(clamp(prod.quality * .82 + prod.awareness * .13 + deterministicNoise(prod.id, 3), 30, 97));
    prod.status = 'Released'; prod.stage = 'Released'; prod.releaseWeek = state.week; prod.revenueWeeksRemaining = ECONOMY.release[prod.format].earningWeeks;
    state.team.busyProductionId = null; if (!state.catalog.includes(prod.id)) state.catalog.push(prod.id);
    const explanation = productionExplanation(prod);
    const earned = prod.experienceAwarded ? 0 : 100;
    if (earned) { prod.experienceAwarded = 100; awardExperience(100, `${prod.title} completed`, prod.id); }
    prod.releaseReport = { preliminary: true, worked: explanation.worked, heldBack: explanation.heldBack, forecastLow: prod.forecastLow, forecastHigh: prod.forecastHigh, experience: earned };
    addNews(`${prod.title} released: preliminary report ready`, `Quality ${prod.quality}, awareness ${prod.awareness}, audience ${prod.audienceScore}. Revenue is still arriving.`, 'release', prod.id, { page: 'catalog', report: prod.id });
  }

  function processReleaseRevenue(prod) {
    if (prod.revenueWeeksRemaining <= 0) return;
    const elapsed = ECONOMY.release[prod.format].earningWeeks - prod.revenueWeeksRemaining;
    const result = releaseRevenueForWeek(prod, elapsed);
    if (result.channel === 'theatrical') prod.boxOfficeGross = (prod.boxOfficeGross || 0) + result.grossSales; else prod.digitalGross = (prod.digitalGross || 0) + result.studioRevenue;
    prod.lifetimeRevenue = (prod.lifetimeRevenue || 0) + result.studioRevenue;
    recordTransaction(result.studioRevenue, 'Operating revenue', `${prod.title}: ${result.channel === 'theatrical' ? 'studio share of weekly box office' : 'digital audience receipts'}`, prod.id);
    prod.revenueWeeksRemaining--; if (prod.demandBoostRemaining > 0) prod.demandBoostRemaining--;
    if (prod.revenueWeeksRemaining === 0 && prod.releaseReport) { prod.releaseReport.preliminary = false; addNews(`${prod.title} lifetime release report finalized`, `The original release window closed at ${money(prod.lifetimeRevenue)} in studio revenue.`, 'release', prod.id, { page: 'catalog', report: prod.id }); }
  }

  const OPPORTUNITY_TEMPLATES = {
    script: { type: 'script-assessment', title: 'Paid script assessment', client: 'Juniper Pictures', description: 'Read a fictional screenplay and deliver a short strengths-and-risks report.', capacity: 'office', duration: 1, cost: 0, total: 18000, advance: 0, experience: 8, cooldown: 5 },
    commercial: { type: 'local-commercial', title: 'Local commercial', client: 'Bellweather Market', description: 'Film and deliver a concise regional campaign spot.', capacity: 'team', duration: 2, cost: 8000, total: 40000, advance: 12000, experience: 20, cooldown: 5 },
    returning: { type: 'returning-client', title: 'Returning-client commission', client: 'Bellweather Market', description: 'A satisfied client wants a larger follow-up campaign.', capacity: 'team', duration: 2, cost: 10000, total: 55000, advance: 15000, experience: 24, cooldown: 7 },
    streaming: { type: 'streaming-license', title: 'Fixed-term streaming offer', description: 'License one finished title for a fixed subscription-streaming term.', capacity: 'catalog', duration: 26, cost: 0, total: 0, advance: 0, experience: 0, cooldown: 6 },
    screening: { type: 'paid-screening', title: 'Paid repertory screening', client: 'Lantern Hall', description: 'Permit one public screening while retaining all other rights.', capacity: 'catalog', duration: 1, cost: 0, total: 0, advance: 0, experience: 0, cooldown: 5 },
    rediscovery: { type: 'catalog-rediscovery', title: 'Catalog rediscovery', client: 'Archive Circle', description: 'A curated feature can renew audience interest and add a one-time exhibition fee.', capacity: 'catalog', duration: 4, cost: 0, total: 0, advance: 0, experience: 0, cooldown: 7 }
  };

  function openOffers() { return state.opportunities.filter(o => o.status === 'open'); }
  function hasRecentType(type, cooldown) { return state.opportunities.some(o => o.type === type && state.week - o.createdWeek < cooldown); }
  function eligibleOpportunityTemplates() {
    const catalog = state.catalog.map(id => state.productions.find(p => p.id === id)).filter(Boolean);
    const list = [];
    if (state.officeBusyUntil <= state.week && !hasRecentType('script-assessment', 5)) list.push(OPPORTUNITY_TEMPLATES.script);
    if (!state.team.busyProductionId && !state.team.busyContractId && !hasRecentType('local-commercial', 5)) list.push(OPPORTUNITY_TEMPLATES.commercial);
    if (!state.team.busyProductionId && !state.team.busyContractId && state.progression.completedClientJobs > 0 && !hasRecentType('returning-client', 7)) list.push(OPPORTUNITY_TEMPLATES.returning);
    if (catalog.length && !hasRecentType('streaming-license', 6)) list.push(OPPORTUNITY_TEMPLATES.streaming);
    if (catalog.length && !hasRecentType('paid-screening', 5)) list.push(OPPORTUNITY_TEMPLATES.screening);
    if (catalog.length && !hasRecentType('catalog-rediscovery', 7)) list.push(OPPORTUNITY_TEMPLATES.rediscovery);
    return list;
  }

  function createOpportunity(template) {
    const eventId = nextId('event');
    const catalog = state.catalog.map(id => state.productions.find(p => p.id === id)).filter(Boolean);
    const title = catalog.length ? catalog[Math.abs(deterministicNoise(eventId, 4)) % catalog.length] : null;
    let total = template.total;
    let buyer = null;
    if (template.type === 'streaming-license') {
      buyer = DATA.buyers.find(b => b.interests.includes(title.genre)) || DATA.buyers[0];
      total = Math.min(buyer.budget, Math.round(36000 + title.audienceScore * 800));
    } else if (template.type === 'paid-screening') total = 12000 + Math.max(0, title.audienceScore - 50) * 180;
    else if (template.type === 'catalog-rediscovery') total = 18000 + Math.max(0, title.criticScore - 50) * 120;
    const offer = {
      id: eventId, type: template.type, title: template.title, client: buyer?.name || template.client,
      description: template.description, capacity: template.capacity, duration: template.duration, directCost: template.cost,
      totalPayment: Math.round(total), advance: Math.round(template.advance || 0), deliveryPayment: Math.round(total - (template.advance || 0)),
      experience: template.experience, createdWeek: state.week, expiresWeek: state.week + 4, status: 'open', productionId: title?.id || null,
      buyerId: buyer?.id || null, countered: false, transactionIds: []
    };
    state.opportunities.push(offer); state.opportunityClock.lastCreatedWeek = state.week;
    addNews(`New opportunity: ${offer.title}`, `${offer.client} offers ${money(offer.totalPayment)}. Review it before Week ${offer.expiresWeek}.`, 'opportunity', eventId, { page: 'business', offer: eventId });
    return offer;
  }

  function scheduleOpportunity(force = false) {
    const clock = state.opportunityClock; clock.lastCheckWeek = state.week;
    if (openOffers().length >= 3) { clock.skipReason = 'The opportunity board already has three open offers.'; clock.nextCheckWeek = state.week + 1; return null; }
    if (!force && state.week < clock.nextCheckWeek && state.week - clock.lastCreatedWeek < 6) { clock.skipReason = `Next scheduled market check is Week ${clock.nextCheckWeek}.`; return null; }
    const eligible = eligibleOpportunityTemplates();
    if (!eligible.length) { clock.skipReason = 'No feasible offer matched current capacity; another check will occur next week.'; clock.nextCheckWeek = state.week + 1; return null; }
    let chosen;
    if (state.week <= 2 || state.opportunities.length === 0) chosen = eligible.find(x => x.type === 'script-assessment') || eligible[0];
    else chosen = eligible[clock.sequence % eligible.length];
    clock.sequence++; const offer = createOpportunity(chosen);
    clock.nextCheckWeek = state.week + 3 + (Math.abs(deterministicNoise(offer.id, 7)) % 3);
    clock.skipReason = `Offer created; next normal check is Week ${clock.nextCheckWeek}.`; return offer;
  }

  function rightsConflict(offer) {
    if (offer.type !== 'streaming-license') return false;
    return state.licenses.some(l => l.productionId === offer.productionId && l.status === 'active' && l.exclusive && l.endWeek >= state.week);
  }
  function acceptOpportunity(id) {
    const offer = state.opportunities.find(o => o.id === id);
    if (!offer || offer.status !== 'open' || offer.expiresWeek < state.week) return showToast('That offer is no longer available.');
    if (offer.capacity === 'office' && state.officeBusyUntil > state.week) return showToast('The business-action slot is already occupied this week.');
    if (offer.capacity === 'team' && (state.team.busyProductionId || state.team.busyContractId)) return showToast('Production Team A is currently booked.');
    if (rightsConflict(offer)) return showToast('Conflicting exclusive streaming rights prevent this deal.');
    if (state.cash < offer.directCost) return showToast(`You need ${money(offer.directCost)} for the quoted direct costs.`);
    offer.status = 'accepted'; offer.acceptedWeek = state.week;
    if (offer.directCost) offer.transactionIds.push(recordTransaction(-offer.directCost, 'Client job cost', `${offer.title}: quoted direct costs`, null, offer.id));
    if (offer.advance) offer.transactionIds.push(recordTransaction(offer.advance, 'Client advance', `${offer.client}: advance included in ${money(offer.totalPayment)} total`, null, offer.id));
    if (offer.capacity === 'office' || offer.capacity === 'team') {
      const contract = { id: nextId('contract'), eventId: offer.id, type: offer.type, title: offer.title, client: offer.client, status: 'active', startWeek: state.week, dueWeek: state.week + offer.duration, weeksRemaining: offer.duration, deliveryPayment: offer.deliveryPayment, experience: offer.experience, transactionIds: [] };
      state.contracts.push(contract); offer.contractId = contract.id;
      if (offer.capacity === 'office') state.officeBusyUntil = state.week + 1; else state.team.busyContractId = contract.id;
      addNews(`${offer.title} accepted`, `Delivery is due Week ${contract.dueWeek}; ${money(offer.deliveryPayment)} remains after the advance.`, 'opportunity', offer.id, { page: 'business', offer: offer.id });
    } else completeCatalogOpportunity(offer);
    saveState(); render(); showToast(`${offer.title} accepted.`);
  }

  function completeCatalogOpportunity(offer) {
    const prod = state.productions.find(p => p.id === offer.productionId);
    if (!prod || !state.catalog.includes(prod.id)) { offer.status = 'invalid'; return; }
    offer.status = 'completed'; offer.completedWeek = state.week;
    if (offer.type === 'streaming-license') {
      const license = { id: nextId('license'), eventId: offer.id, buyerId: offer.buyerId, buyer: offer.client, productionId: prod.id, title: prod.title, startWeek: state.week, endWeek: state.week + offer.duration, exclusive: true, rights: 'Subscription streaming only', retained: 'Theatrical, screening, purchase, rental, sequel, and future-season rights', status: 'active', fee: offer.totalPayment };
      state.licenses.push(license); offer.licenseId = license.id;
    } else if (offer.type === 'catalog-rediscovery') prod.demandBoostRemaining = Math.max(prod.demandBoostRemaining || 0, 4);
    offer.transactionIds.push(recordTransaction(offer.totalPayment, offer.type === 'streaming-license' ? 'License revenue' : 'Catalog revenue', `${offer.client}: ${offer.title} for ${prod.title}`, prod.id, offer.id));
    offer.paymentStatus = 'paid';
    addNews(`${offer.title} completed`, `${prod.title} earned ${money(offer.totalPayment)}. ${offer.type === 'catalog-rediscovery' ? 'Audience receipts receive a four-week interest boost.' : 'The agreed right is recorded in the catalog.'}`, 'opportunity', offer.id, { page: 'catalog', report: prod.id });
  }

  function declineOpportunity(id) { const o = state.opportunities.find(x => x.id === id); if (!o || o.status !== 'open') return; o.status = 'declined'; o.declinedWeek = state.week; addNews(`${o.title} declined`, 'No payment or reputation penalty was applied.', 'opportunity', o.id); saveState(); render(); }
  function counterOpportunity(id) {
    const o = state.opportunities.find(x => x.id === id); if (!o || o.status !== 'open' || o.type !== 'streaming-license' || o.countered) return;
    o.countered = true; const accepted = deterministicNoise(o.id, 11) >= -2;
    if (accepted) { o.totalPayment = Math.round(o.totalPayment * 1.1); o.deliveryPayment = o.totalPayment; o.counterResult = `Accepted at ${money(o.totalPayment)}.`; }
    else { o.counterResult = 'Buyer declined the increase; the original offer remains available.'; }
    saveState(); render(); showToast(o.counterResult);
  }

  function processContracts() {
    for (const contract of state.contracts.filter(c => c.status === 'active')) {
      contract.weeksRemaining--;
      if (contract.weeksRemaining <= 0) {
        contract.status = 'completed'; contract.completedWeek = state.week;
        const offer = state.opportunities.find(o => o.id === contract.eventId);
        const txId = recordTransaction(contract.deliveryPayment, 'Client delivery payment', `${contract.client}: ${contract.title} delivered`, null, contract.eventId);
        contract.transactionIds.push(txId); offer.status = 'completed'; offer.completedWeek = state.week; offer.paymentStatus = 'paid'; offer.transactionIds.push(txId);
        state.team.busyContractId = state.team.busyContractId === contract.id ? null : state.team.busyContractId;
        state.progression.completedClientJobs++; awardExperience(contract.experience, `${contract.title} delivered`, contract.eventId);
        addNews(`${contract.title} delivered and paid`, `${contract.client} paid ${money(contract.deliveryPayment)} on delivery. Studio Experience +${contract.experience}.`, 'opportunity', contract.eventId, { page: 'business', offer: contract.eventId });
      }
    }
  }

  function expireOffersAndLicenses() {
    for (const o of state.opportunities) if (o.status === 'open' && o.expiresWeek < state.week) { o.status = 'expired'; o.expiredWeek = state.week; addNews(`${o.title} expired`, 'The deadline passed. No payment was made.', 'opportunity', o.id, { page: 'business', offer: o.id }); }
    for (const l of state.licenses) if (l.status === 'active' && l.endWeek < state.week) { l.status = 'expired'; addNews(`${l.title} streaming term ended`, `${l.buyer}'s subscription-streaming rights expired; all rights are available again.`, 'catalog', l.eventId, { page: 'catalog' }); }
  }

  function advanceWeek() {
    if (state.advancing || !state.studioName) return;
    state.advancing = true; const beforeNews = state.news.length; const beforeCash = state.cash; state.week++;
    recordTransaction(-state.weeklyOverhead, 'Shared overhead', 'Office, insurance, and core staff');
    processContracts();
    for (const prod of state.productions) {
      if (prod.status === 'In Production') {
        const weeklyCost = Math.min(prod.remainingCost, Math.ceil(prod.baseCost * .8 / prod.duration));
        if (weeklyCost > 0) { prod.remainingCost -= weeklyCost; prod.paidCost += weeklyCost; recordTransaction(-weeklyCost, 'Direct project expense', `${prod.title}: ${prod.stage.toLowerCase()} costs`, prod.id); }
        prod.progress++;
        if (prod.progress === 2 && !prod.decision) addNews(`${prod.title} needs a production decision`, 'Choose whether to preserve the plan, rehearse, or sharpen audience positioning.', 'decision', prod.id, { page: 'productions', decision: prod.id });
        const newStage = stageFor(prod.progress, prod.duration);
        if (newStage !== prod.stage && prod.progress < prod.duration) { prod.stage = newStage; addNews(`${prod.title} enters ${newStage.toLowerCase()}`, 'Production Team A moved the project into its next scheduled stage.', 'studio', prod.id); }
        if (prod.progress >= prod.duration) finishProduction(prod);
      } else if (prod.status === 'Released') processReleaseRevenue(prod);
    }
    expireOffersAndLicenses(); scheduleOpportunity(false);
    if (state.cash < state.weeklyOverhead * 5 && !state.news.some(n => n.week === state.week && n.title.includes('Cash warning'))) addNews('Cash warning: reserves are running low', 'Cash covers fewer than five weeks of overhead. Consider a no-cost office assignment.', 'finance');
    if (state.week >= 52 && !state.firstYearComplete) { state.firstYearComplete = true; addNews('First-year milestone reached', `${state.studioName} survived its first year. Career goals and sandbox play continue.`, 'studio'); }
    state.advancing = false; saveState(); render();
    const decisionCount = state.news.length - beforeNews; const delta = state.cash - beforeCash;
    showToast(`Week ${state.week}: ${decisionCount} update${decisionCount === 1 ? '' : 's'}, cash ${delta >= 0 ? '+' : ''}${money(delta)}.`);
  }

  function chooseProductionDecision(id, choice) {
    const p = state.productions.find(x => x.id === id);
    if (!p || p.status !== 'In Production' || p.decision || p.progress < 2) return;
    const choices = {
      preserve: { label: 'Keep the current plan', cost: 0, qualityBonus: 0, awarenessBonus: 0 },
      rehearse: { label: 'Add focused rehearsal', cost: 12000, qualityBonus: 4, awarenessBonus: 0 },
      audience: { label: 'Sharpen audience positioning', cost: 6000, qualityBonus: 0, awarenessBonus: 7 }
    };
    const selected = choices[choice]; if (!selected) return;
    if (state.cash - selected.cost < state.weeklyOverhead * 2) return showToast('That choice would leave too little operating cash. The no-cost plan remains available.');
    p.decision = { choice, ...selected, appliedWeek: state.week };
    if (selected.cost) { p.totalCost += selected.cost; p.paidCost += selected.cost; recordTransaction(-selected.cost, 'Production decision', `${p.title}: ${selected.label}`, p.id); }
    addNews(`${p.title}: decision recorded`, `${selected.label}. Cost ${money(selected.cost)}; future quality effect ${selected.qualityBonus ? `+${selected.qualityBonus}` : 'none'}; awareness effect ${selected.awarenessBonus ? `+${selected.awarenessBonus}` : 'none'}.`, 'decision', p.id);
    saveState(); render();
  }

  function greenlight(form) {
    if (state.team.busyProductionId || state.team.busyContractId) return showToast('Production Team A is already booked.');
    const fd = new FormData(form); let title = fd.get('title').trim(); const format = fd.get('format'); const genre = fd.get('genre');
    if (!state.progression.unlockedGenres.includes(genre)) return showToast('Choose this genre in Career Progress before using it.');
    const budgetSize = fd.get('budget'); const concept = DATA.concepts.find(x => x.id === fd.get('concept')); const writer = DATA.talent.writers.find(x => x.id === fd.get('writer')); const director = DATA.talent.directors.find(x => x.id === fd.get('director')); const lead = DATA.talent.leads.find(x => x.id === fd.get('lead')); const marketingTier = fd.get('marketing');
    const audience = fd.get('audience'); const emphasis = fd.get('emphasis');
    if (!title) title = generateTitle(format, genre); if (!concept || !writer || !director || !lead) return showToast('Please complete every project field.');
    if (!concept.genres.includes(genre)) return showToast('That story concept does not fit the selected genre.');
    if (unrelatedTitleDuplicate(title) && !confirm(`Another unrelated project is already named "${title}". Use this title anyway?`)) return;
    const baseCost = DATA.budgets[format][budgetSize]; const marketingCost = DATA.marketing[marketingTier]; const talentCost = writer.cost + director.cost + lead.cost; const initialProduction = Math.round(baseCost * .2); const dueNow = talentCost + marketingCost + initialProduction;
    if (state.cash - dueNow < state.weeklyOverhead * 4) return showToast(`You need ${money(dueNow + state.weeklyOverhead * 4)} to fund this safely.`);
    const id = nextId('prod'); const duration = ECONOMY.duration[format][budgetSize]; const awareness = clamp(18 + marketingCost / 1600 + lead.popularity * .35, 20, 88);
    const preview = forecastProject({ format, genre, budgetSize, concept, marketingCost, writer, director, lead, baseCost, duration, awareness });
    const prod = { id, title, format, genre, budgetSize, concept, marketingTier, marketingCost, baseCost, creativeBrief: { audience, emphasis }, talent: { writer, director, lead }, talentCost, totalCost: baseCost + talentCost + marketingCost, paidCost: dueNow, remainingCost: baseCost - initialProduction, duration, progress: 0, stage: 'Development', status: 'In Production', awareness: Math.round(awareness), lifetimeRevenue: 0, boxOfficeGross: 0, digitalGross: 0, startWeek: state.week, forecastLow: preview.lowRevenue, forecastHigh: preview.highRevenue };
    state.productions.push(prod); state.titleGenerator.draft = null; state.team.busyProductionId = id;
    recordTransaction(-talentCost, 'Direct project expense', `${title}: creative team contracts`, id); recordTransaction(-marketingCost, 'Direct project expense', `${title}: ${marketingTier.toLowerCase()} awareness campaign`, id); recordTransaction(-initialProduction, 'Direct project expense', `${title}: greenlight deposit and rented facilities`, id);
    addNews(`${title} receives the greenlight`, `${format}, ${genre}; intended for ${audience} with emphasis on ${emphasis}.`, 'studio', id);
    state.tutorialStep = Math.max(state.tutorialStep, 1); state.activePage = 'productions'; saveState(); render(); showToast(`${title} is greenlit.`);
  }

  function forecastProject(input) {
    const people = [input.writer, input.director, input.lead]; const ability = people.reduce((s, p) => s + p.ability, 0) / 3; const fit = people.reduce((s, p) => s + (talentFits(p, input.genre) ? 100 : 58), 0) / 3; const reliability = people.reduce((s, p) => s + p.reliability, 0) / 3;
    const quality = clamp(input.concept.strength * .31 + ability * .34 + fit * .2 + reliability * .15 + ({ Small: 0, Medium: 5, Large: 9 }[input.budgetSize]), 35, 96); const audienceScore = clamp(quality * .82 + input.awareness * .13, 30, 97); const preview = { format: input.format, baseCost: input.baseCost, audienceScore, awareness: input.awareness };
    let expectedRevenue = 0; for (let w = 0; w < ECONOMY.release[input.format].earningWeeks; w++) expectedRevenue += releaseRevenueForWeek(preview, w).studioRevenue;
    return { expectedRevenue, lowRevenue: Math.round(expectedRevenue * .78), highRevenue: Math.round(expectedRevenue * 1.22) };
  }
  function availableCash() { const committed = state.productions.filter(p => p.status === 'In Production').reduce((s, p) => s + p.remainingCost, 0); return Math.max(0, state.cash - committed - state.weeklyOverhead * ECONOMY.reserveWeeks); }

  function pageHeader(kicker, title, body, action = '') { return `<header class="page-head"><div><span class="eyebrow">${kicker}</span><h1>${title}</h1><p>${body}</p></div>${action}</header>`; }
  function renderSetup() { return `<main class="setup-shell"><section class="setup-card"><span class="eyebrow">A studio management game</span><h1>Screen<br><span class="accent">Empire</span></h1><p class="lede">Choose paid work, create originals, build experience, and grow a catalog one week at a time.</p><div class="choice-note"><strong>Your first week:</strong> plan an original or advance to Week 2 for a feasible paid opportunity. Optional work has clear terms and never pays just for appearing.</div><form id="setup-form" class="setup-form"><input name="studioName" aria-label="Production company name" maxlength="40" placeholder="Name your production company" required autofocus><button class="button" type="submit">Open the studio</button></form></section></main>`; }

  function careerGoal() {
    const goals = [];
    if (!state.contracts.some(c => c.status === 'completed')) goals.push({ title: 'Complete your first paid job', text: 'Open Business Opportunities, accept a feasible assignment, and deliver it.' });
    if (!state.catalog.length) goals.push({ title: 'Release your first original', text: 'A completed original earns 100 Studio Experience and your first genre choice.' });
    if (state.progression.unlockedGenres.length > 3 && !state.productions.some(p => !BASE_GENRES.includes(p.genre))) goals.push({ title: 'Try a newly unlocked genre', text: 'Start an original using one of your chosen new capabilities.' });
    if (state.catalog.length && !state.licenses.length) goals.push({ title: 'Make your first catalog deal', text: 'Watch Business Opportunities for a buyer or screening offer.' });
    goals.push({ title: 'Build a sustainable slate', text: 'Balance client work, originals, and at least four weeks of overhead.' });
    return goals[state.progression.selectedGoal % goals.length];
  }
  function progressCard() { const next = nextExperienceMilestone(); const goal = careerGoal(); return `<section class="card career-card"><div class="catalog-title"><div><span class="eyebrow">Career</span><h2>${esc(goal.title)}</h2></div><button class="button secondary small" data-action="change-goal">Change suggestion</button></div><p>${esc(goal.text)}</p><div class="summary-row"><span>Studio Experience</span><strong>${state.progression.experience}${next ? ` / ${next}` : ' / all milestones reached'}</strong></div><div class="summary-row"><span>Genre choices ready</span><strong>${state.progression.pendingGenreChoices}</strong></div><button class="button small" data-page="career">View career progress</button></section>`; }
  function productionDecisionCard(p) { return `<section class="callout attention"><h3>${esc(p.title)} needs your decision</h3><p>Choose once. If you do nothing before release, the safe current plan is preserved automatically.</p><div class="decision-grid"><button class="decision-option" data-decision="preserve" data-production="${p.id}"><strong>Keep the current plan</strong><span>Cost $0. No extra quality or awareness effect.</span></button><button class="decision-option" data-decision="rehearse" data-production="${p.id}"><strong>Add focused rehearsal</strong><span>Cost $12,000 now. +4 future quality.</span></button><button class="decision-option" data-decision="audience" data-production="${p.id}"><strong>Sharpen audience positioning</strong><span>Cost $6,000 now. +7 future awareness.</span></button></div></section>`; }

  function renderDashboard() {
    const active = state.productions.find(p => p.status === 'In Production'); const decisions = state.productions.filter(p => p.status === 'In Production' && p.progress >= 2 && !p.decision); const open = openOffers(); const latest = state.news.slice(0, 4); const committed = state.productions.filter(p => p.status === 'In Production').reduce((s, p) => s + p.remainingCost, 0);
    return `${pageHeader('Executive office', 'Dashboard', 'Review your next decisions, then advance the shared weekly clock.')}${state.progression.migrationRecap ? `<div class="callout"><h3>Save upgraded safely</h3><p>${esc(state.progression.migrationRecap)}</p><button class="button small" data-action="dismiss-migration">Got it</button></div>` : ''}<div class="grid two" style="margin-top:18px">${progressCard()}<section class="card"><span class="eyebrow">Your next decisions</span><h2>${open.length + decisions.length} item${open.length + decisions.length === 1 ? '' : 's'} ready</h2>${open.slice(0,2).map(o => `<p><strong>${esc(o.title)}</strong> — ${money(o.totalPayment)}, expires Week ${o.expiresWeek}. <button class="text-button" data-open-offer="${o.id}">View offer</button></p>`).join('') || '<p>No open offer right now. The Support panel explains the next market check.</p>'}${decisions.map(p => `<p><strong>${esc(p.title)}</strong> needs a production decision. <button class="text-button" data-page="productions">Choose now</button></p>`).join('')}</section></div><div class="grid three" style="margin-top:18px"><article class="card stat-card"><span class="metric-label">Cash in bank</span><strong>${money(state.cash)}</strong><span class="sub">Available now</span></article><article class="card stat-card"><span class="metric-label">Remaining commitments</span><strong>${money(committed)}</strong><span class="sub">Approved direct costs</span></article><article class="card stat-card"><span class="metric-label">Conservative spending room</span><strong>${money(availableCash())}</strong><span class="sub">After commitments + 4 weeks overhead</span></article></div><div class="grid two"><section><div class="section-title"><h2>Production floor</h2></div>${active ? productionCard(active) : `<div class="empty">Production Team A is available.<br><button class="button small" data-page="productions">Plan a production</button></div>`}</section><section><div class="section-title"><h2>Latest studio news</h2></div><div class="card">${latest.map(newsRow).join('')}</div></section></div>`;
  }
  function productionCard(p) { const percent = Math.min(100, Math.round(p.progress / p.duration * 100)); return `<article class="card production-card"><div><div class="catalog-title"><h3>${esc(p.title)}</h3><span class="tag">${p.status}</span></div><div class="production-meta"><span class="tag">${p.format}</span><span class="tag">${p.genre}</span><span class="tag">${p.stage}</span></div>${p.status === 'In Production' ? `<div class="progress" aria-label="${percent}% complete"><div style="width:${percent}%"></div></div><p>${p.progress} of ${p.duration} production weeks complete</p>` : `<p>Quality <span class="score">${p.quality}</span> Awareness <span class="score">${p.awareness}</span></p>`}</div><div class="money-stack"><span class="metric-label">Project spending</span><strong>${money(p.paidCost)}</strong><span class="muted">${money(p.remainingCost)} committed</span></div></article>`; }
  function optionList(list) { return list.map(x => `<option value="${x.id}">${esc(x.name)} — ${esc((x.fits || [x.fit]).join(', '))} · Ability ${x.ability} · ${money(x.cost)}</option>`).join(''); }

  function renderProductions() {
    const active = state.productions.filter(p => p.status === 'In Production'); const released = state.productions.filter(p => p.status === 'Released'); const busy = !!(state.team.busyProductionId || state.team.busyContractId); const draft = busy ? { title: '', format: 'Movie', genre: state.progression.unlockedGenres[0] } : ensureTitleDraft(); const selectedGenre = state.progression.unlockedGenres.includes(draft.genre) ? draft.genre : state.progression.unlockedGenres[0];
    const genreOptions = allGenreNames.map(g => `<option value="${g}" ${selectedGenre === g ? 'selected' : ''} ${state.progression.unlockedGenres.includes(g) ? '' : 'disabled'}>${g}${state.progression.unlockedGenres.includes(g) ? '' : ' — locked'}</option>`).join('');
    const conceptOptions = DATA.concepts.filter(c => c.genres.includes(selectedGenre)).map(c => `<option value="${c.id}">${esc(c.name)} — ${esc(c.note)}</option>`).join('');
    return `${pageHeader('Production office', 'Productions', 'Create studio-owned movies and television seasons. Locked genres remain visible so progress is never hidden.')}${active.filter(p => p.progress >= 2 && !p.decision).map(productionDecisionCard).join('')}${active.length ? `<div class="grid">${active.map(productionCard).join('')}</div>` : ''}<div class="section-title"><h2>Greenlight an original</h2><span class="tag">Studio-owned rights</span></div><form id="greenlight-form" class="card form-grid"><div class="field full"><label for="title">Project title</label><div class="title-row"><input id="title" name="title" maxlength="48" value="${esc(draft.title)}" placeholder="A title will be generated automatically" ${busy ? 'disabled' : ''}><button class="text-button" id="generate-title" type="button" ${busy ? 'disabled' : ''}>Generate Another Title</button></div></div><div class="field"><label for="format">Format</label><select id="format" name="format" ${busy ? 'disabled' : ''}><option ${draft.format === 'Movie' ? 'selected' : ''}>Movie</option><option ${draft.format === 'TV Season' ? 'selected' : ''}>TV Season</option></select></div><div class="field"><label for="genre">Genre</label><select id="genre" name="genre" ${busy ? 'disabled' : ''}>${genreOptions}</select><span class="field-help">${esc(GENRES[selectedGenre].strength)}. Trade-off: ${esc(GENRES[selectedGenre].tradeoff)}.</span></div><div class="field full"><label for="concept">Central conflict</label><select id="concept" name="concept" ${busy ? 'disabled' : ''}>${conceptOptions}</select></div><div class="field"><label for="audience">Intended audience</label><select id="audience" name="audience" ${busy ? 'disabled' : ''}><option>broad entertainment</option><option>genre enthusiasts</option><option>prestige-oriented viewers</option></select></div><div class="field"><label for="emphasis">Creative emphasis</label><select id="emphasis" name="emphasis" ${busy ? 'disabled' : ''}><option>characters</option><option>tension</option><option>humor</option><option>spectacle</option></select></div><div class="field"><label for="budget">Production budget</label><select id="budget" name="budget" ${busy ? 'disabled' : ''}><option>Small</option><option>Medium</option><option>Large</option></select></div><div class="field"><label for="marketing">Awareness campaign</label><select id="marketing" name="marketing" ${busy ? 'disabled' : ''}><option>Lean</option><option>Standard</option><option>Strong</option></select></div><div class="field full"><label for="writer">Writer / researcher</label><select id="writer" name="writer" ${busy ? 'disabled' : ''}>${optionList(DATA.talent.writers)}</select></div><div class="field full"><label for="director">Director / editor</label><select id="director" name="director" ${busy ? 'disabled' : ''}>${optionList(DATA.talent.directors)}</select></div><div class="field full"><label for="lead">Lead performer / presenter</label><select id="lead" name="lead" ${busy ? 'disabled' : ''}>${optionList(DATA.talent.leads)}</select></div><div id="project-summary" class="summary-box"></div><div class="field full"><button class="button" type="submit" ${busy ? 'disabled' : ''}>${busy ? 'Team is currently booked' : 'Greenlight production'}</button></div></form>${released.length ? `<div class="section-title"><h2>Completed</h2></div><div class="grid">${released.map(productionCard).join('')}</div>` : ''}`;
  }

  function updateProjectSummary() {
    const form = document.querySelector('#greenlight-form'); const box = document.querySelector('#project-summary'); if (!form || !box || !form.elements.namedItem('format') || form.elements.namedItem('format').disabled) return;
    const field = n => form.elements.namedItem(n); const format = field('format').value; const genre = field('genre').value; const budgetSize = field('budget').value; const baseCost = DATA.budgets[format][budgetSize]; const marketingCost = DATA.marketing[field('marketing').value]; const writer = DATA.talent.writers.find(x => x.id === field('writer').value); const director = DATA.talent.directors.find(x => x.id === field('director').value); const lead = DATA.talent.leads.find(x => x.id === field('lead').value); const concept = DATA.concepts.find(x => x.id === field('concept').value); if (!concept) return;
    const talentCost = writer.cost + director.cost + lead.cost; const directCost = baseCost + talentCost + marketingCost; const duration = ECONOMY.duration[format][budgetSize]; const awareness = clamp(18 + marketingCost / 1600 + lead.popularity * .35, 20, 88); const forecast = forecastProject({ format, genre, budgetSize, concept, marketingCost, writer, director, lead, baseCost, duration, awareness }); const overhead = duration * state.weeklyOverhead;
    box.innerHTML = `<div class="summary-row"><span>Due when approved</span><strong>${money(talentCost + marketingCost + baseCost * .2)}</strong></div><div class="summary-row"><span>Remaining committed production costs</span><strong>${money(baseCost * .8)}</strong></div><div class="summary-row"><span>Total direct project cost</span><strong>${money(directCost)}</strong></div><div class="summary-row"><span>Estimated production time</span><strong>${duration} weeks</strong></div><div class="summary-row"><span>Planning overhead allocation (not charged twice)</span><strong>${money(overhead)}</strong></div><div class="summary-row"><span>Estimated studio revenue (uncertain)</span><strong>${money(forecast.lowRevenue)}–${money(forecast.highRevenue)}</strong></div><div class="summary-row"><span>Estimated result after allocated overhead</span><strong>${money(forecast.lowRevenue - directCost - overhead)} to ${money(forecast.highRevenue - directCost - overhead)}</strong></div><p class="muted">Forecast only. Finished quality, awareness, audience fit, and commercial revenue are separate measures.</p>`;
  }
  function updateDraftForSelection(form) {
    const title = form.elements.namedItem('title'); const format = form.elements.namedItem('format').value; const genre = form.elements.namedItem('genre').value; const draft = ensureTitleDraft(format, genre);
    if (draft.source === 'generated' && (draft.format !== format || draft.genre !== genre)) { draft.title = generateTitle(format, genre, draft.title); title.value = draft.title; }
    draft.format = format; draft.genre = genre;
    if (form.elements.namedItem('concept')) form.elements.namedItem('concept').innerHTML = DATA.concepts.filter(c => c.genres.includes(genre)).map(c => `<option value="${c.id}">${esc(c.name)} — ${esc(c.note)}</option>`).join('');
    saveState();
  }
  function generateAnotherDraftTitle(form) { const input = form.elements.namedItem('title'); const format = form.elements.namedItem('format').value; const genre = form.elements.namedItem('genre').value; const draft = ensureTitleDraft(format, genre); if (draft.source === 'manual' && input.value.trim() && !confirm('Replace your manually entered title with a generated suggestion?')) return; draft.title = generateTitle(format, genre, input.value); draft.source = 'generated'; draft.format = format; draft.genre = genre; input.value = draft.title; saveState(); }

  function opportunityCard(o) {
    const p = o.productionId ? state.productions.find(x => x.id === o.productionId) : null; const active = o.status === 'open';
    return `<article class="card offer-card" id="offer-${o.id}"><div class="catalog-title"><div><span class="eyebrow">${esc(o.type.replaceAll('-', ' '))}</span><h2>${esc(o.title)}</h2></div><span class="tag ${o.status}">${o.status}</span></div><p>${esc(o.description)}</p>${p ? `<p><strong>Included title:</strong> ${esc(p.title)} (${p.format}, ${p.genre})</p>` : ''}<div class="grid two compact"><div class="summary-row"><span>Total payment</span><strong>${money(o.totalPayment)}</strong></div><div class="summary-row"><span>Advance / delivery</span><strong>${money(o.advance)} / ${money(o.deliveryPayment)}</strong></div><div class="summary-row"><span>Direct costs</span><strong>${money(o.directCost)}</strong></div><div class="summary-row"><span>Capacity</span><strong>${o.capacity === 'team' ? 'Production team' : o.capacity === 'office' ? 'One office action' : 'No filming slot'}</strong></div><div class="summary-row"><span>Created</span><strong>Week ${o.createdWeek}</strong></div><div class="summary-row"><span>Expires</span><strong>Week ${o.expiresWeek}</strong></div></div>${o.type === 'streaming-license' ? `<p class="muted">26-week exclusive subscription-streaming right for this title only. Theatrical, purchase, rental, screening, sequel, and future-season rights stay with you.</p>` : ''}${o.counterResult ? `<p class="callout-inline">${esc(o.counterResult)}</p>` : ''}${active ? `<div class="button-row"><button class="button small" data-accept-offer="${o.id}">Accept</button><button class="button secondary small" data-decline-offer="${o.id}">Decline</button>${o.type === 'streaming-license' && !o.countered ? `<button class="button secondary small" data-counter-offer="${o.id}">Counter +10%</button>` : ''}</div>` : `<p class="muted">Final status: ${o.status}${o.paymentStatus ? ` · payment ${o.paymentStatus}` : ''}.</p>`}</article>`;
  }
  function renderBusiness() { const items = [...state.opportunities].sort((a,b) => b.createdWeek - a.createdWeek); const activeContracts = state.contracts.filter(c => c.status === 'active'); return `${pageHeader('Client desk', 'Business Opportunities', 'Optional paid work and catalog deals with saved terms, deadlines, and payment records.', `<span class="tag">${openOffers().length} open</span>`)}${activeContracts.length ? `<div class="callout"><h3>Work in progress</h3>${activeContracts.map(c => `<p>${esc(c.title)} for ${esc(c.client)}: ${c.weeksRemaining} week${c.weeksRemaining === 1 ? '' : 's'} remaining, ${money(c.deliveryPayment)} due on delivery.</p>`).join('')}</div>` : ''}<div class="grid two" style="margin-top:18px">${items.length ? items.map(opportunityCard).join('') : '<div class="empty">Your first practical offer arrives by Week 2.</div>'}</div>`; }

  function releaseReport(p) { const r = p.releaseReport; if (!r) return ''; const forecast = p.lifetimeRevenue < r.forecastLow ? 'below the planning range so far' : p.lifetimeRevenue > r.forecastHigh ? 'above the planning range' : 'within the planning range'; return `<section class="release-report"><h3>${r.preliminary ? 'Preliminary release report' : 'Lifetime release report'}</h3><p><strong>What worked:</strong> ${esc(r.worked)}</p><p><strong>What held it back:</strong> ${esc(r.heldBack)}</p><p><strong>Forecast comparison:</strong> ${money(p.lifetimeRevenue)} received; ${forecast}. ${r.preliminary ? 'Revenue is still arriving, so this is not lifetime profit.' : 'The original release window is complete.'}</p><p><strong>Studio Experience:</strong> +${r.experience || 0} at completion. Current total ${state.progression.experience}${nextExperienceMilestone() ? `; next choice at ${nextExperienceMilestone()}` : ''}.</p></section>`; }
  function renderCatalog() { const catalog = state.catalog.map(id => state.productions.find(p => p.id === id)).filter(Boolean); return `${pageHeader('Library & rights', 'Catalog & Rights', 'Finished titles, release reports, active licenses, and retained rights.')}${catalog.length ? `<div class="grid two">${catalog.map(p => { const licenses = state.licenses.filter(l => l.productionId === p.id); return `<article class="card"><div class="catalog-title"><div><h2>${esc(p.title)}</h2><div class="production-meta"><span class="tag">Studio owned</span><span class="tag">${p.format}</span><span class="tag">${p.genre}</span></div></div><span class="score">${p.audienceScore}</span></div><div class="summary-row"><span>Quality / awareness</span><strong>${p.quality} / ${p.awareness}</strong></div><div class="summary-row"><span>Lifetime studio revenue</span><strong>${money(p.lifetimeRevenue)}</strong></div><div class="summary-row"><span>Total direct cost</span><strong>${money(p.totalCost)}</strong></div><div class="summary-row"><span>Direct project result</span><strong class="${p.lifetimeRevenue - p.totalCost >= 0 ? 'good' : 'bad'}">${money(p.lifetimeRevenue - p.totalCost)}</strong></div>${releaseReport(p)}${licenses.map(l => `<div class="license"><strong>${esc(l.buyer)}</strong><br>${esc(l.rights)} · ${l.exclusive ? 'Exclusive' : 'Nonexclusive'} · Week ${l.startWeek}–${l.endWeek} · ${l.status}<br><span class="muted">Retained: ${esc(l.retained)}</span></div>`).join('')}</article>`; }).join('')}</div>` : '<div class="empty">Finished studio-owned productions will appear here permanently.</div>'}`; }
  function renderCareer() { const next = nextExperienceMilestone(); const remaining = allGenreNames.filter(g => !state.progression.unlockedGenres.includes(g)); return `${pageHeader('Studio growth', 'Career Progress', 'Experience comes from completed work. Genre choices are never purchased with cash.')}${progressCard()}<div class="section-title"><h2>Genre capability</h2><span class="tag">${state.progression.unlockedGenres.length} of ${allGenreNames.length} available</span></div>${state.progression.pendingGenreChoices ? `<div class="callout"><h3>Choose any new genre</h3><p>${state.progression.pendingGenreChoices} choice${state.progression.pendingGenreChoices === 1 ? '' : 's'} ready. Your selection works immediately.</p><div class="button-row">${remaining.map(g => `<button class="button small" data-unlock-genre="${g}">${g}</button>`).join('')}</div></div>` : `<div class="callout"><h3>Next genre choice</h3><p>${next ? `${state.progression.experience} / ${next} experience. Complete work to earn ${next - state.progression.experience} more.` : 'All genre milestones reached.'}</p></div>`}<div class="grid three" style="margin-top:18px">${allGenreNames.map(g => `<article class="card"><div class="catalog-title"><h3>${g}</h3><span class="tag">${state.progression.unlockedGenres.includes(g) ? 'Available' : 'Locked'}</span></div><p>${esc(GENRES[g].strength)}</p><p class="muted">Trade-off: ${esc(GENRES[g].tradeoff)}</p><p class="muted">${DATA.concepts.filter(c => c.genres.includes(g)).length} starting concepts · ${titleCandidates('Movie', g).length} movie titles · ${titleCandidates('TV Season', g).length} TV titles</p></article>`).join('')}</div>`; }
  function renderFinances() { const committed = state.productions.filter(p => p.status === 'In Production').reduce((s,p) => s + p.remainingCost, 0); return `${pageHeader('The books', 'Finances', 'Every charge and payment is recorded once, with its project or event reference.')}` + `<div class="grid three"><article class="card stat-card"><span class="metric-label">Cash</span><strong>${money(state.cash)}</strong></article><article class="card stat-card"><span class="metric-label">Committed costs</span><strong>${money(committed)}</strong></article><article class="card stat-card"><span class="metric-label">Weekly overhead</span><strong>${money(state.weeklyOverhead)}</strong></article></div><div class="section-title"><h2>Transaction history</h2></div><div class="card">${state.transactions.length ? state.transactions.map(tx => `<div class="ledger-row"><div><strong>${esc(tx.category)}</strong><div class="detail">Week ${tx.week} · ${esc(tx.detail)}${tx.eventId ? ` · ${tx.eventId}` : ''}</div></div><strong class="${tx.amount >= 0 ? 'good' : 'bad'}">${tx.amount >= 0 ? '+' : ''}${money(tx.amount)}</strong></div>`).join('') : '<p>No transactions yet.</p>'}</div>`; }
  function newsRow(item) { return `<article class="news-row ${item.read ? '' : 'unread'}"><div><h3>${esc(item.title)}</h3><p>${esc(item.text)}</p>${item.action ? `<button class="text-button" data-news-action="${item.id}">${item.action.offer ? 'View offer' : item.action.decision ? 'Make decision' : item.action.report ? 'View report' : 'Open'}</button>` : ''}</div><time>Week ${item.week}</time></article>`; }
  function renderNews() { return `${pageHeader('Industry wire', 'News', 'Actionable saved events. Reading a story never pays money or advances time.')}<div class="card">${state.news.map(newsRow).join('')}</div>`; }
  function renderSettings() { return `${pageHeader('Local game data', 'Save, Settings & Support', 'Autosaves live in this browser on this device. Export a backup when moving devices.')}<div class="grid two"><div class="card"><h2>Protect your progress</h2><p>Import validates a file and backs up the current save before replacing it.</p><div class="button-row"><button class="button secondary" id="export-save">Export Save</button><button class="button secondary" id="import-save">Import Save</button><button class="button danger" id="reset-game">Reset Game</button></div></div><div class="card"><h2>Support panel</h2><div class="summary-row"><span>Build version</span><strong>${BUILD_VERSION}</strong></div><div class="summary-row"><span>Save version</span><strong>${state.version}</strong></div><div class="summary-row"><span>Last opportunity check</span><strong>Week ${state.opportunityClock.lastCheckWeek}</strong></div><div class="summary-row"><span>Next normal check</span><strong>Week ${state.opportunityClock.nextCheckWeek}</strong></div><p class="muted"><strong>Latest scheduler note:</strong> ${esc(state.opportunityClock.skipReason)}</p></div></div>`; }
  function renderPage() { return ({ dashboard: renderDashboard, productions: renderProductions, business: renderBusiness, catalog: renderCatalog, career: renderCareer, finances: renderFinances, news: renderNews, settings: renderSettings }[state.activePage] || renderDashboard)(); }

  function render() {
    const app = document.querySelector('#app'); if (!state.studioName) { app.innerHTML = renderSetup(); bindEvents(); return; }
    const nav = [['dashboard','Dashboard'],['productions','Productions'],['business',`Opportunities${openOffers().length ? ` (${openOffers().length})` : ''}`],['catalog','Catalog & Rights'],['career','Career Progress'],['finances','Finances'],['news',`News${state.news.filter(n => !n.read).length ? ` (${state.news.filter(n => !n.read).length})` : ''}`],['settings','Save & Support']]; const year = Math.floor((state.week - 1) / 52) + 1; const weekOfYear = ((state.week - 1) % 52) + 1;
    app.innerHTML = `<div class="game-shell"><aside class="sidebar"><div class="brand"><div class="brand-mark">SCREEN <span>EMPIRE</span></div><div class="studio-label">${esc(state.studioName)}</div></div><nav class="nav" aria-label="Main navigation">${nav.map(([id,label]) => `<button class="${state.activePage === id ? 'active' : ''}" data-page="${id}">${label}</button>`).join('')}</nav><div class="save-note">Autosaved in this browser</div></aside><div class="workspace"><header class="topbar"><div class="clock"><div><span class="metric-label">Studio calendar</span><span class="metric-value">Year ${year} · Week ${weekOfYear}</span></div><div><span class="metric-label">Cash</span><span class="metric-value ${state.cash < 50000 ? 'bad' : ''}">${money(state.cash)}</span></div><div><span class="metric-label">Experience</span><span class="metric-value">${state.progression.experience}</span></div></div><button class="button" id="next-week">Next Week →</button></header><main class="main">${renderPage()}</main></div></div>`;
    bindEvents(); updateProjectSummary();
  }

  function exportSave() { const blob = new Blob([JSON.stringify({ ...state, advancing: false }, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `screen-empire-${state.studioName.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-week-${state.week}.json`; a.click(); URL.revokeObjectURL(url); showToast('Save exported to your Downloads folder.'); }
  function importSave(file) { const reader = new FileReader(); reader.onload = () => { try { const parsed = JSON.parse(reader.result); if (!parsed || typeof parsed.studioName !== 'string' || !Number.isFinite(parsed.week) || !Number.isFinite(parsed.cash) || !Array.isArray(parsed.productions)) throw new Error('missing required game data'); const current = localStorage.getItem(SAVE_KEY); if (current) localStorage.setItem(BACKUP_KEY, current); state = migrateState(parsed); saveState(); render(); showToast('Save imported and previous save backed up.'); } catch (e) { showToast(`Import failed: ${e.message}.`); } }; reader.readAsText(file); }

  function bindEvents() {
    document.querySelector('#setup-form')?.addEventListener('submit', e => { e.preventDefault(); state.studioName = new FormData(e.currentTarget).get('studioName').trim(); if (!state.studioName) return; recordTransaction(ECONOMY.startingCash, 'Starting capital', 'Founder funding deposited'); state.cash = ECONOMY.startingCash; saveState(); render(); });
    document.querySelectorAll('[data-page]').forEach(b => b.addEventListener('click', () => { state.activePage = b.dataset.page; if (state.activePage === 'news') state.news.forEach(n => { n.read = true; }); saveState(); render(); }));
    document.querySelector('#next-week')?.addEventListener('click', e => { e.currentTarget.disabled = true; advanceWeek(); });
    const form = document.querySelector('#greenlight-form'); form?.addEventListener('submit', e => { e.preventDefault(); greenlight(e.currentTarget); }); form?.addEventListener('change', e => { if (e.target.name === 'format' || e.target.name === 'genre') updateDraftForSelection(form); updateProjectSummary(); });
    form?.elements.namedItem('title')?.addEventListener('input', e => { const draft = ensureTitleDraft(form.elements.namedItem('format').value, form.elements.namedItem('genre').value); draft.title = e.target.value; draft.source = 'manual'; saveState(); });
    document.querySelector('#generate-title')?.addEventListener('click', () => generateAnotherDraftTitle(form));
    document.querySelectorAll('[data-decision]').forEach(b => b.addEventListener('click', () => chooseProductionDecision(b.dataset.production, b.dataset.decision)));
    document.querySelectorAll('[data-accept-offer]').forEach(b => b.addEventListener('click', () => acceptOpportunity(b.dataset.acceptOffer)));
    document.querySelectorAll('[data-decline-offer]').forEach(b => b.addEventListener('click', () => declineOpportunity(b.dataset.declineOffer)));
    document.querySelectorAll('[data-counter-offer]').forEach(b => b.addEventListener('click', () => counterOpportunity(b.dataset.counterOffer)));
    document.querySelectorAll('[data-open-offer]').forEach(b => b.addEventListener('click', () => { state.activePage = 'business'; saveState(); render(); document.querySelector(`#offer-${b.dataset.openOffer}`)?.scrollIntoView(); }));
    document.querySelectorAll('[data-news-action]').forEach(b => b.addEventListener('click', () => { const n = state.news.find(x => x.id === b.dataset.newsAction); if (!n?.action) return; n.read = true; state.activePage = n.action.page; saveState(); render(); if (n.action.offer) document.querySelector(`#offer-${n.action.offer}`)?.scrollIntoView(); }));
    document.querySelectorAll('[data-unlock-genre]').forEach(b => b.addEventListener('click', () => unlockGenre(b.dataset.unlockGenre)));
    document.querySelectorAll('[data-action="change-goal"]').forEach(b => b.addEventListener('click', () => { state.progression.selectedGoal++; saveState(); render(); }));
    document.querySelector('[data-action="dismiss-migration"]')?.addEventListener('click', () => { state.progression.migrationRecap = null; saveState(); render(); });
    document.querySelector('#export-save')?.addEventListener('click', exportSave); document.querySelector('#import-save')?.addEventListener('click', () => document.querySelector('#save-file').click());
    document.querySelector('#reset-game')?.addEventListener('click', () => { if (confirm('Reset Screen Empire? Export first if you want to keep this studio.')) { localStorage.setItem(BACKUP_KEY, JSON.stringify(state)); localStorage.removeItem(SAVE_KEY); state = defaultState(); render(); } });
  }
  function showToast(message) { const toast = document.querySelector('#toast'); toast.textContent = message; toast.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove('show'), 2800); }
  document.querySelector('#save-file').addEventListener('change', e => { if (e.target.files[0]) importSave(e.target.files[0]); e.target.value = ''; });
  render();
  window.ScreenEmpireTest = { defaultState, stageFor, deterministicNoise, migrateState, normalizeTitle, titleCandidates, generateTitle, continuationTitle, releaseRevenueForWeek, scheduleOpportunity, eligibleOpportunityTemplates, EXPERIENCE_MILESTONES, ECONOMY, DATA, GENRES };
})();
