import assert from 'node:assert/strict';

const milestones = [100, 250, 450, 700, 1000, 1400, 1900, 2500, 3200];

function seededRandom(seed) {
  return () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function run(seed, strategy) {
  const random = seededRandom(seed);
  let cash = 550000; let experience = 0; let productionWeeks = 0; let nextOffer = 2; let lastOffer = 0;
  let firstOpportunityWeek = null; let longestGap = 0; let offered = 0; let accepted = 0; let completed = 0; let expired = 0; let paid = 0; let originals = 0; let productionChoices = 0;
  const receipts = [];
  for (let week = 1; week <= 52; week++) {
    cash -= 6000;
    for (const receipt of receipts.filter(r => r.week === week)) cash += receipt.amount;
    if (productionWeeks > 0 && --productionWeeks === 0) {
      originals++; experience += 100; productionChoices++;
      for (let offset = 1; offset <= 12; offset++) receipts.push({ week: week + offset, amount: Math.round(90000 * Math.pow(.78, offset - 1)) });
    }
    const wantsOriginal = strategy !== 'client' && productionWeeks === 0 && cash > 360000;
    if (wantsOriginal) { cash -= 299000; productionWeeks = strategy === 'mixed' ? 10 : 8; }
    if (week === nextOffer) {
      if (lastOffer) longestGap = Math.max(longestGap, week - lastOffer);
      lastOffer = week; firstOpportunityWeek ??= week; offered++;
      const take = strategy !== 'original';
      if (take) {
        accepted++; completed++; paid++; experience += offered % 2 ? 8 : 20;
        cash += offered % 2 ? 18000 : 32000;
      } else expired++;
      nextOffer = week + 3 + Math.floor(random() * 3);
    }
  }
  const genresAccessible = 3 + milestones.filter(m => m <= experience).length;
  return { firstOpportunityWeek, longestGap, offered, accepted, completed, expired, paid, originals, productionChoices, experience, genresAccessible, cash, operatingProfit: cash - 550000 };
}

function median(values) { const a = [...values].sort((x,y) => x-y); return a[Math.floor(a.length / 2)]; }
function summary(strategy) {
  const runs = Array.from({ length: 100 }, (_, i) => run(i + 1, strategy));
  return {
    seeds: runs.length,
    firstOpportunityWeek: Math.max(...runs.map(r => r.firstOpportunityWeek)),
    longestEligibleGap: Math.max(...runs.map(r => r.longestGap)),
    medianOffered: median(runs.map(r => r.offered)),
    medianAccepted: median(runs.map(r => r.accepted)),
    medianCompleted: median(runs.map(r => r.completed)),
    medianExpired: median(runs.map(r => r.expired)),
    medianPaid: median(runs.map(r => r.paid)),
    medianOriginals: median(runs.map(r => r.originals)),
    medianProductionChoices: median(runs.map(r => r.productionChoices)),
    medianExperience: median(runs.map(r => r.experience)),
    medianGenresAccessible: median(runs.map(r => r.genresAccessible)),
    medianCash: median(runs.map(r => r.cash)),
    medianOperatingProfit: median(runs.map(r => r.operatingProfit))
  };
}

const report = Object.fromEntries(['client', 'original', 'mixed'].map(s => [s, summary(s)]));
console.log('52-week opportunity/progression pacing (100 deterministic seeds per strategy):');
console.log(JSON.stringify(report, null, 2));
for (const [strategy, result] of Object.entries(report)) {
  assert.equal(result.firstOpportunityWeek, 2, `${strategy}: first opportunity arrives by Week 2`);
  assert.ok(result.longestEligibleGap <= 5, `${strategy}: normal offer gap stays within five weeks`);
  if (strategy !== 'original') assert.ok(result.medianPaid > 0, `${strategy}: useful paid work is reachable without bonus awards`);
  assert.ok(result.medianCash > 0, `${strategy}: ordinary play remains solvent`);
}
assert.ok(report.mixed.medianGenresAccessible >= 5, 'mixed first-year play reaches at least five genres');
