(() => {
  'use strict';

  const SAVE_KEY = 'screenEmpireSave';
  const BACKUP_KEY = 'screenEmpireSaveBackup';
  const SAVE_VERSION = 1;
  const money = value => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
  const esc = value => String(value ?? '').replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]));

  const DATA = {
    concepts: [
      { id: 'unlikely', name: 'Unlikely Allies', genres: ['Comedy', 'Drama'], strength: 68, note: 'Two opposites must solve one very public problem.' },
      { id: 'lastcall', name: 'The Last Call', genres: ['Drama', 'Action'], strength: 73, note: 'A final chance forces an old professional back into danger.' },
      { id: 'smalltown', name: 'Small Town, Big Secret', genres: ['Comedy', 'Drama'], strength: 76, note: 'A close community hides an increasingly awkward truth.' },
      { id: 'countdown', name: 'Against the Clock', genres: ['Action'], strength: 70, note: 'A compact rescue story built around a relentless deadline.' }
    ],
    talent: {
      writers: [
        { id: 'w1', name: 'Mara Bell', ability: 66, fit: 'Comedy', popularity: 34, reliability: 88, cost: 24000 },
        { id: 'w2', name: 'Jonah Price', ability: 73, fit: 'Drama', popularity: 41, reliability: 78, cost: 32000 },
        { id: 'w3', name: 'Rin Okafor', ability: 69, fit: 'Action', popularity: 29, reliability: 92, cost: 28000 }
      ],
      directors: [
        { id: 'd1', name: 'Elena Park', ability: 68, fit: 'Comedy', popularity: 37, reliability: 91, cost: 38000 },
        { id: 'd2', name: 'Malcolm Voss', ability: 77, fit: 'Drama', popularity: 52, reliability: 74, cost: 52000 },
        { id: 'd3', name: 'Tessa Cole', ability: 71, fit: 'Action', popularity: 46, reliability: 84, cost: 46000 }
      ],
      leads: [
        { id: 'l1', name: 'Nico Vale', ability: 65, fit: 'Comedy', popularity: 48, reliability: 89, cost: 42000 },
        { id: 'l2', name: 'Amara Finch', ability: 76, fit: 'Drama', popularity: 45, reliability: 86, cost: 55000 },
        { id: 'l3', name: 'Devin Cross', ability: 70, fit: 'Action', popularity: 62, reliability: 76, cost: 63000 }
      ]
    },
    budgets: {
      Movie: { Small: 180000, Medium: 340000, Large: 600000 },
      'TV Season': { Small: 220000, Medium: 420000, Large: 720000 }
    },
    marketing: { Lean: 15000, Standard: 40000, Strong: 80000 }
  };

  const defaultState = () => ({
    version: SAVE_VERSION,
    studioName: '',
    week: 1,
    cash: 550000,
    weeklyOverhead: 7500,
    activePage: 'dashboard',
    team: { name: 'Production Team A', busyProductionId: null },
    productions: [],
    catalog: [],
    transactions: [],
    news: [{ id: 'welcome', week: 1, title: 'A new independent studio enters the market', text: 'Your rented office is open and Production Team A is ready for its first project.', category: 'studio' }],
    tutorialStep: 0,
    firstYearComplete: false,
    advancing: false,
    nextId: 1
  });

  let state = loadState();
  let toastTimer;

  function loadState() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return defaultState();
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object' || !parsed.studioName) return defaultState();
      if ((parsed.version || 0) < SAVE_VERSION) localStorage.setItem(BACKUP_KEY, raw);
      return migrateState(parsed);
    } catch (_) {
      return defaultState();
    }
  }

  function migrateState(old) {
    const fresh = defaultState();
    return {
      ...fresh,
      ...old,
      version: SAVE_VERSION,
      team: { ...fresh.team, ...(old.team || {}) },
      productions: Array.isArray(old.productions) ? old.productions : [],
      catalog: Array.isArray(old.catalog) ? old.catalog : [],
      transactions: Array.isArray(old.transactions) ? old.transactions : [],
      news: Array.isArray(old.news) ? old.news : fresh.news,
      advancing: false
    };
  }

  function saveState() {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ ...state, advancing: false }));
  }

  function recordTransaction(amount, category, detail, productionId = null) {
    state.cash += amount;
    state.transactions.unshift({ id: `tx-${state.nextId++}`, week: state.week, amount: Math.round(amount), category, detail, productionId });
    state.transactions = state.transactions.slice(0, 250);
  }

  function addNews(title, text, category = 'studio') {
    state.news.unshift({ id: `news-${state.nextId++}`, week: state.week, title, text, category });
    state.news = state.news.slice(0, 80);
  }

  function stageFor(progress, duration) {
    const ratio = progress / duration;
    if (ratio < .2) return 'Development';
    if (ratio < .62) return 'Filming';
    if (ratio < .9) return 'Post-production';
    return 'Release';
  }

  function deterministicNoise(id, salt = 0) {
    let n = 0;
    for (const ch of `${id}-${salt}`) n = (n * 31 + ch.charCodeAt(0)) % 9973;
    return (n % 17) - 8;
  }

  function finishProduction(prod) {
    const people = [prod.talent.writer, prod.talent.director, prod.talent.lead];
    const ability = people.reduce((sum, person) => sum + person.ability, 0) / 3;
    const fit = people.reduce((sum, person) => sum + (person.fit === prod.genre ? 100 : 58), 0) / 3;
    const reliability = people.reduce((sum, person) => sum + person.reliability, 0) / 3;
    const budgetBoost = { Small: 0, Medium: 5, Large: 9 }[prod.budgetSize];
    prod.quality = Math.round(clamp(prod.concept.strength * .31 + ability * .34 + fit * .2 + reliability * .15 + budgetBoost + deterministicNoise(prod.id), 35, 96));
    prod.criticScore = Math.round(clamp(prod.quality + deterministicNoise(prod.id, 2), 28, 98));
    prod.audienceScore = Math.round(clamp(prod.quality * .82 + prod.awareness * .13 + deterministicNoise(prod.id, 3), 30, 97));
    prod.status = 'Released';
    prod.stage = 'Released';
    prod.releaseWeek = state.week;
    prod.revenueWeeksRemaining = prod.format === 'Movie' ? 8 : 10;
    state.team.busyProductionId = null;
    state.catalog.push(prod.id);
    addNews(`${prod.title} is now available`, `Critics scored it ${prod.criticScore}, while audiences scored it ${prod.audienceScore}. Revenue will arrive over several weeks.`, 'studio');
  }

  function processReleaseRevenue(prod) {
    if (prod.revenueWeeksRemaining <= 0) return;
    const elapsed = (prod.format === 'Movie' ? 8 : 10) - prod.revenueWeeksRemaining;
    const decay = Math.pow(.68, elapsed);
    const appeal = (prod.audienceScore * .58 + prod.awareness * .42) / 100;
    let studioRevenue;
    let detail;
    if (prod.format === 'Movie' && elapsed < 5) {
      const grossSales = Math.round((prod.baseCost * (1.0 + appeal * 2.5)) * decay * .52);
      studioRevenue = Math.round(grossSales * .45);
      prod.boxOfficeGross = (prod.boxOfficeGross || 0) + grossSales;
      detail = `${prod.title}: 45% studio share of ${money(grossSales)} weekly box office`;
    } else {
      studioRevenue = Math.round((prod.baseCost * (.12 + appeal * .3)) * decay);
      prod.digitalGross = (prod.digitalGross || 0) + studioRevenue;
      detail = `${prod.title}: digital purchases and rentals`;
    }
    prod.lifetimeRevenue = (prod.lifetimeRevenue || 0) + studioRevenue;
    recordTransaction(studioRevenue, 'Operating revenue', detail, prod.id);
    prod.revenueWeeksRemaining--;
  }

  function advanceWeek() {
    if (state.advancing || !state.studioName) return;
    state.advancing = true;
    state.week++;
    recordTransaction(-state.weeklyOverhead, 'Shared overhead', 'Office, insurance, and core staff');

    for (const prod of state.productions) {
      if (prod.status === 'In Production') {
        const weeklyCost = Math.min(prod.remainingCost, Math.ceil(prod.baseCost * .8 / prod.duration));
        if (weeklyCost > 0) {
          prod.remainingCost -= weeklyCost;
          prod.paidCost += weeklyCost;
          recordTransaction(-weeklyCost, 'Direct project expense', `${prod.title}: ${prod.stage.toLowerCase()} costs`, prod.id);
        }
        prod.progress++;
        const newStage = stageFor(prod.progress, prod.duration);
        if (newStage !== prod.stage && prod.progress < prod.duration) {
          prod.stage = newStage;
          addNews(`${prod.title} enters ${newStage.toLowerCase()}`, `Production Team A has moved the project into its next scheduled stage.`, 'studio');
        }
        if (prod.progress >= prod.duration) finishProduction(prod);
      } else if (prod.status === 'Released') {
        processReleaseRevenue(prod);
      }
    }

    if (state.cash < state.weeklyOverhead * 5 && !state.news.some(n => n.week === state.week && n.title.includes('Cash warning'))) {
      addNews('Cash warning: reserves are running low', 'Your cash covers fewer than five weeks of overhead. Avoid large new commitments.', 'finance');
    }
    if (state.week >= 52 && !state.firstYearComplete) {
      state.firstYearComplete = true;
      addNews('First-year milestone reached', `${state.studioName} survived its first year. Sandbox play continues with no final time limit.`, 'studio');
    }
    state.advancing = false;
    saveState();
    render();
    showToast(`Week ${state.week} complete. The game has autosaved.`);
  }

  function greenlight(form) {
    if (state.team.busyProductionId) return showToast('Production Team A is already booked.');
    const data = new FormData(form);
    const title = data.get('title').trim();
    const format = data.get('format');
    const genre = data.get('genre');
    const budgetSize = data.get('budget');
    const concept = DATA.concepts.find(x => x.id === data.get('concept'));
    const writer = DATA.talent.writers.find(x => x.id === data.get('writer'));
    const director = DATA.talent.directors.find(x => x.id === data.get('director'));
    const lead = DATA.talent.leads.find(x => x.id === data.get('lead'));
    const marketingTier = data.get('marketing');
    if (!title || !concept || !writer || !director || !lead) return showToast('Please complete every project field.');
    if (!concept.genres.includes(genre)) return showToast('That story concept does not fit the selected genre.');
    const baseCost = DATA.budgets[format][budgetSize];
    const marketingCost = DATA.marketing[marketingTier];
    const talentCost = writer.cost + director.cost + lead.cost;
    const initialProduction = Math.round(baseCost * .2);
    const dueNow = talentCost + marketingCost + initialProduction;
    if (state.cash - dueNow < state.weeklyOverhead * 4) return showToast(`You need ${money(dueNow + state.weeklyOverhead * 4)} to fund this safely.`);
    const id = `prod-${state.nextId++}`;
    const duration = (format === 'Movie' ? 10 : 12) + ({ Small: 0, Medium: 2, Large: 4 }[budgetSize]);
    const awareness = clamp(18 + marketingCost / 1600 + lead.popularity * .35, 20, 88);
    const prod = {
      id, title, format, genre, budgetSize, concept, marketingTier, marketingCost, baseCost,
      talent: { writer, director, lead }, talentCost, totalCost: baseCost + talentCost + marketingCost,
      paidCost: dueNow, remainingCost: baseCost - initialProduction, duration, progress: 0,
      stage: 'Development', status: 'In Production', awareness: Math.round(awareness),
      lifetimeRevenue: 0, boxOfficeGross: 0, digitalGross: 0, startWeek: state.week
    };
    state.productions.push(prod);
    state.team.busyProductionId = id;
    recordTransaction(-talentCost, 'Direct project expense', `${title}: creative team contracts`, id);
    recordTransaction(-marketingCost, 'Direct project expense', `${title}: ${marketingTier.toLowerCase()} awareness campaign`, id);
    recordTransaction(-initialProduction, 'Direct project expense', `${title}: greenlight deposit and rented facilities`, id);
    addNews(`${title} receives the greenlight`, `${format} production begins in rented facilities with a ${budgetSize.toLowerCase()} production budget.`, 'studio');
    state.tutorialStep = Math.max(state.tutorialStep, 1);
    state.activePage = 'productions';
    saveState();
    render();
    showToast(`${title} is greenlit. “Greenlight” means approve production.`);
  }

  function availableCash() {
    const committed = state.productions.filter(p => p.status === 'In Production').reduce((sum, p) => sum + p.remainingCost, 0);
    return Math.max(0, state.cash - committed - state.weeklyOverhead * 4);
  }

  function pageHeader(kicker, title, body, action = '') {
    return `<header class="page-head"><div><span class="eyebrow">${kicker}</span><h1>${title}</h1><p>${body}</p></div>${action}</header>`;
  }

  function renderSetup() {
    return `<main class="setup-shell"><section class="setup-card">
      <span class="eyebrow">A studio management game</span>
      <h1>Screen<br><span class="accent">Empire</span></h1>
      <p class="lede">Start small, make smart productions, and build a fictional entertainment company one week at a time.</p>
      <div class="choice-note"><strong>Your opening strategy:</strong> client work will offer predictable income without ownership in Stage 2. Original productions are available now: you keep the catalog rights and future upside, but you carry the risk.</div>
      <form id="setup-form" class="setup-form">
        <input name="studioName" aria-label="Production company name" maxlength="40" placeholder="Name your production company" required autofocus>
        <button class="button" type="submit">Open the studio</button>
      </form>
    </section></main>`;
  }

  function renderDashboard() {
    const active = state.productions.find(p => p.status === 'In Production');
    const latest = state.news.slice(0, 4);
    const committed = state.productions.filter(p => p.status === 'In Production').reduce((s, p) => s + p.remainingCost, 0);
    return `${pageHeader('Executive office', 'Dashboard', 'Review the studio, make one clear decision, then advance the shared weekly clock.')}
      ${state.tutorialStep === 0 ? `<div class="callout"><h3>Your first objective: greenlight a modest original</h3><p>Open Productions, choose a small project and affordable talent, then approve it. Keep enough cash for weekly <span class="definition" title="Ongoing company expenses such as staff, insurance, and office costs.">overhead</span>.</p><div class="button-row" style="margin-top:14px"><button class="button small" data-page="productions">Create first production</button></div></div>` : ''}
      ${state.tutorialStep > 0 && !state.firstYearComplete ? `<div class="callout"><h3>Opening objective: survive Year 1</h3><p>Reach Week 52 with a sustainable studio. There is no perfect strategy and play continues as a sandbox afterward.</p></div>` : ''}
      ${state.firstYearComplete ? `<div class="callout"><h3>Year 1 survived — sandbox unlocked</h3><p>Your studio can continue for as long as you like.</p></div>` : ''}
      <div class="grid three" style="margin-top:18px">
        <article class="card stat-card"><span class="metric-label">Cash in bank</span><strong>${money(state.cash)}</strong><span class="sub">Available now</span></article>
        <article class="card stat-card"><span class="metric-label">Remaining commitments</span><strong>${money(committed)}</strong><span class="sub">Approved direct costs</span></article>
        <article class="card stat-card"><span class="metric-label">Conservative spending room</span><strong>${money(availableCash())}</strong><span class="sub">After commitments + 4 weeks overhead</span></article>
      </div>
      <div class="grid two">
        <section><div class="section-title"><h2>Production floor</h2></div>
          ${active ? productionCard(active) : `<div class="empty">Production Team A is available.<br><button class="button small" data-page="productions" style="margin-top:12px">Plan a production</button></div>`}
        </section>
        <section><div class="section-title"><h2>Latest studio news</h2></div><div class="card">${latest.map(newsRow).join('')}</div></section>
      </div>`;
  }

  function productionCard(prod) {
    const percent = Math.min(100, Math.round(prod.progress / prod.duration * 100));
    return `<article class="card production-card"><div><div class="catalog-title"><h3>${esc(prod.title)}</h3><span class="tag">${prod.status}</span></div>
      <div class="production-meta"><span class="tag">${prod.format}</span><span class="tag">${prod.genre}</span><span class="tag">${prod.stage}</span></div>
      ${prod.status === 'In Production' ? `<div class="progress" aria-label="${percent}% complete"><div style="width:${percent}%"></div></div><p>${prod.progress} of ${prod.duration} production weeks complete</p>` : `<p>Critics <span class="score">${prod.criticScore}</span> Audience <span class="score">${prod.audienceScore}</span></p>`}
      </div><div class="money-stack"><span class="metric-label">Project spending</span><strong>${money(prod.paidCost)}</strong><span class="muted">${money(prod.remainingCost)} committed</span></div></article>`;
  }

  function optionList(list) {
    return list.map(x => `<option value="${x.id}">${x.name} — ${x.fit} fit · Ability ${x.ability} · Reliability ${x.reliability} · ${money(x.cost)}</option>`).join('');
  }

  function renderProductions() {
    const active = state.productions.filter(p => p.status === 'In Production');
    const released = state.productions.filter(p => p.status === 'Released');
    const busy = !!state.team.busyProductionId;
    return `${pageHeader('Production office', 'Productions', 'Create studio-owned movies and short television seasons. One team can handle one production at this stage.')}
      ${active.length ? `<div class="grid">${active.map(productionCard).join('')}</div>` : ''}
      <div class="section-title"><h2>Greenlight an original</h2><span class="tag">Studio-owned rights</span></div>
      <form id="greenlight-form" class="card form-grid">
        <div class="field full"><label for="title">Project title</label><input id="title" name="title" maxlength="48" placeholder="e.g. Midnight Detour" required ${busy ? 'disabled' : ''}></div>
        <div class="field"><label for="format">Format</label><select id="format" name="format" ${busy ? 'disabled' : ''}><option>Movie</option><option>TV Season</option></select></div>
        <div class="field"><label for="genre">Genre</label><select id="genre" name="genre" ${busy ? 'disabled' : ''}><option>Comedy</option><option>Drama</option><option>Action</option></select></div>
        <div class="field full"><label for="concept">Story concept</label><select id="concept" name="concept" ${busy ? 'disabled' : ''}>${DATA.concepts.map(x => `<option value="${x.id}">${x.name} — ${x.note}</option>`).join('')}</select></div>
        <div class="field"><label for="budget">Production budget</label><select id="budget" name="budget" ${busy ? 'disabled' : ''}><option>Small</option><option>Medium</option><option>Large</option></select></div>
        <div class="field"><label for="marketing">Awareness campaign</label><select id="marketing" name="marketing" ${busy ? 'disabled' : ''}><option>Lean</option><option>Standard</option><option>Strong</option></select></div>
        <div class="field full"><label for="writer">Writer</label><select id="writer" name="writer" ${busy ? 'disabled' : ''}>${optionList(DATA.talent.writers)}</select></div>
        <div class="field full"><label for="director">Director</label><select id="director" name="director" ${busy ? 'disabled' : ''}>${optionList(DATA.talent.directors)}</select></div>
        <div class="field full"><label for="lead">Lead performer</label><select id="lead" name="lead" ${busy ? 'disabled' : ''}>${optionList(DATA.talent.leads)}</select></div>
        <div id="project-summary" class="summary-box"></div>
        <div class="field full"><button class="button" type="submit" ${busy ? 'disabled title="Production Team A is already booked"' : ''}>${busy ? 'Team is currently booked' : 'Greenlight production'}</button></div>
      </form>
      ${released.length ? `<div class="section-title"><h2>Completed</h2></div><div class="grid">${released.map(productionCard).join('')}</div>` : ''}`;
  }

  function updateProjectSummary() {
    const form = document.querySelector('#greenlight-form');
    const box = document.querySelector('#project-summary');
    if (!form || !box) return;
    const field = name => form.elements.namedItem(name);
    if (!field('format')) return;
    const format = field('format').value;
    const budget = field('budget').value;
    const base = DATA.budgets[format][budget];
    const marketing = DATA.marketing[field('marketing').value];
    const people = ['writer', 'director', 'lead'].map(role => DATA.talent[role === 'lead' ? 'leads' : `${role}s`].find(x => x.id === field(role).value));
    const talent = people.reduce((s, x) => s + (x?.cost || 0), 0);
    const due = talent + marketing + base * .2;
    const duration = (format === 'Movie' ? 10 : 12) + ({ Small: 0, Medium: 2, Large: 4 }[budget]);
    box.innerHTML = `<div class="summary-row"><span>Due when approved</span><strong>${money(due)}</strong></div><div class="summary-row"><span>Remaining committed production costs</span><strong>${money(base * .8)}</strong></div><div class="summary-row"><span>Total project cost (shared overhead excluded)</span><strong>${money(base + talent + marketing)}</strong></div><div class="summary-row"><span>Estimated production time</span><strong>${duration} weeks</strong></div><p class="muted">Marketing raises awareness, not finished quality. Strong genre fit can make affordable talent a smart choice.</p>`;
  }

  function renderCatalog() {
    const catalog = state.catalog.map(id => state.productions.find(p => p.id === id)).filter(Boolean);
    return `${pageHeader('Library & rights', 'Catalog', 'Your catalog is the collection of finished productions and rights your studio controls.')}
      ${catalog.length ? `<div class="grid two">${catalog.map(prod => `<article class="card"><div class="catalog-title"><div><h2>${esc(prod.title)}</h2><div class="production-meta"><span class="tag">100% studio owned</span><span class="tag">${prod.format}</span><span class="tag">${prod.genre}</span></div></div><div><span class="score">${prod.audienceScore}</span></div></div>
      <div class="summary-row"><span>Lifetime studio revenue</span><strong>${money(prod.lifetimeRevenue)}</strong></div><div class="summary-row"><span>Total direct cost</span><strong>${money(prod.totalCost)}</strong></div><div class="summary-row"><span>Direct project profit/loss</span><strong class="${prod.lifetimeRevenue - prod.totalCost >= 0 ? 'good' : 'bad'}">${money(prod.lifetimeRevenue - prod.totalCost)}</strong></div>${prod.format === 'Movie' ? `<div class="summary-row"><span>Total box-office sales</span><strong>${money(prod.boxOfficeGross)}</strong></div><p class="muted">The studio receives 45% of fictional ticket sales; the full box office is shown separately.</p>` : ''}<p class="muted">Streaming licenses and broader rights management arrive in Stage 3.</p></article>`).join('')}</div>` : `<div class="empty">Finished studio-owned productions will appear here permanently.</div>`}`;
  }

  function renderFinances() {
    const committed = state.productions.filter(p => p.status === 'In Production').reduce((s, p) => s + p.remainingCost, 0);
    return `${pageHeader('The books', 'Finances', 'Cash movement is recorded once and grouped so advances, project costs, and company overhead stay clear.')}
      <div class="grid three"><article class="card stat-card"><span class="metric-label">Cash</span><strong>${money(state.cash)}</strong></article><article class="card stat-card"><span class="metric-label">Committed costs</span><strong>${money(committed)}</strong></article><article class="card stat-card"><span class="metric-label">Weekly overhead</span><strong>${money(state.weeklyOverhead)}</strong><span class="sub">Charged once company-wide</span></article></div>
      <div class="section-title"><h2>Transaction history</h2></div><div class="card">${state.transactions.length ? state.transactions.map(tx => `<div class="ledger-row"><div><strong>${esc(tx.category)}</strong><div class="detail">Week ${tx.week} · ${esc(tx.detail)}</div></div><strong class="${tx.amount >= 0 ? 'good' : 'bad'}">${tx.amount >= 0 ? '+' : ''}${money(tx.amount)}</strong></div>`).join('') : '<p>No transactions yet.</p>'}</div>`;
  }

  function newsRow(item) {
    return `<article class="news-row"><div><h3>${esc(item.title)}</h3><p>${esc(item.text)}</p></div><time>Week ${item.week}</time></article>`;
  }

  function renderNews() {
    return `${pageHeader('Industry wire', 'News', 'These headlines report saved simulation events. Reading them never changes the game.')}
      <div class="card">${state.news.map(newsRow).join('')}</div>`;
  }

  function renderSettings() {
    return `${pageHeader('Local game data', 'Save & Settings', 'Autosaves live in this browser on this device. They are not a cloud account.')}
      <div class="card"><h2>Protect your progress</h2><p>Export downloads a portable JSON save file. Import validates a file before replacing the current game.</p><div class="button-row"><button class="button secondary" id="export-save">Export Save</button><button class="button secondary" id="import-save">Import Save</button><button class="button danger" id="reset-game">Reset Game</button></div></div>
      <div class="section-title"><h2>Stage 1 glossary</h2></div><div class="card"><p><strong>Greenlight:</strong> approve a production and commit its costs.</p><p><strong>Overhead:</strong> ongoing company expenses, charged once each week.</p><p><strong>Catalog:</strong> the productions and rights your studio controls.</p><p><strong>Licensing:</strong> allowing another company to use specific rights under a contract. This arrives in Stage 3.</p></div>`;
  }

  function renderPage() {
    return ({ dashboard: renderDashboard, productions: renderProductions, catalog: renderCatalog, finances: renderFinances, news: renderNews, settings: renderSettings }[state.activePage] || renderDashboard)();
  }

  function render() {
    const app = document.querySelector('#app');
    if (!state.studioName) {
      app.innerHTML = renderSetup();
      bindEvents();
      return;
    }
    const nav = [['dashboard','Dashboard'],['productions','Productions'],['catalog','Catalog & Rights'],['finances','Finances'],['news','News'],['settings','Save & Settings']];
    const year = Math.floor((state.week - 1) / 52) + 1;
    const weekOfYear = ((state.week - 1) % 52) + 1;
    app.innerHTML = `<div class="game-shell"><aside class="sidebar"><div class="brand"><div class="brand-mark">SCREEN <span>EMPIRE</span></div><div class="studio-label">${esc(state.studioName)}</div></div><nav class="nav" aria-label="Main navigation">${nav.map(([id,label]) => `<button class="${state.activePage === id ? 'active' : ''}" data-page="${id}">${label}</button>`).join('')}<button class="locked" disabled title="Paid work arrives in Stage 2">Business · Stage 2</button></nav><div class="save-note">Autosaved in this browser</div></aside>
      <div class="workspace"><header class="topbar"><div class="clock"><div><span class="metric-label">Studio calendar</span><span class="metric-value">Year ${year} · Week ${weekOfYear}</span></div><div><span class="metric-label">Cash</span><span class="metric-value ${state.cash < 50000 ? 'bad' : ''}">${money(state.cash)}</span></div></div><button class="button" id="next-week">Next Week →</button></header><main class="main">${renderPage()}</main></div></div>`;
    bindEvents();
    updateProjectSummary();
  }

  function exportSave() {
    const blob = new Blob([JSON.stringify({ ...state, advancing: false }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `screen-empire-${state.studioName.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-week-${state.week}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Save exported to your Downloads folder.');
  }

  function importSave(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        if (!parsed || typeof parsed.studioName !== 'string' || !Number.isFinite(parsed.week) || !Number.isFinite(parsed.cash) || !Array.isArray(parsed.productions)) throw new Error('missing required game data');
        const current = localStorage.getItem(SAVE_KEY);
        if (current) localStorage.setItem(BACKUP_KEY, current);
        state = migrateState(parsed);
        saveState();
        render();
        showToast('Save imported successfully. Your previous save was backed up.');
      } catch (error) {
        showToast(`Import failed: ${error.message}.`);
      }
    };
    reader.readAsText(file);
  }

  function bindEvents() {
    document.querySelector('#setup-form')?.addEventListener('submit', event => {
      event.preventDefault();
      state.studioName = new FormData(event.currentTarget).get('studioName').trim();
      if (!state.studioName) return;
      recordTransaction(550000, 'Starting capital', 'Founder funding deposited');
      state.cash = 550000;
      saveState();
      render();
    });
    document.querySelectorAll('[data-page]').forEach(button => button.addEventListener('click', () => { state.activePage = button.dataset.page; saveState(); render(); }));
    document.querySelector('#next-week')?.addEventListener('click', event => { event.currentTarget.disabled = true; advanceWeek(); });
    const form = document.querySelector('#greenlight-form');
    form?.addEventListener('submit', event => { event.preventDefault(); greenlight(event.currentTarget); });
    form?.addEventListener('change', updateProjectSummary);
    document.querySelector('#export-save')?.addEventListener('click', exportSave);
    document.querySelector('#import-save')?.addEventListener('click', () => document.querySelector('#save-file').click());
    document.querySelector('#reset-game')?.addEventListener('click', () => {
      if (confirm('Reset Screen Empire? Export first if you want to keep this studio.')) {
        localStorage.setItem(BACKUP_KEY, JSON.stringify(state));
        localStorage.removeItem(SAVE_KEY);
        state = defaultState();
        render();
      }
    });
  }

  function showToast(message) {
    const toast = document.querySelector('#toast');
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2800);
  }

  document.querySelector('#save-file').addEventListener('change', event => {
    if (event.target.files[0]) importSave(event.target.files[0]);
    event.target.value = '';
  });
  render();

  window.ScreenEmpireTest = { defaultState, stageFor, deterministicNoise, migrateState, DATA };
})();
