import assert from 'node:assert/strict';

const LEGACY = {
  overhead: 7500,
  duration: { Movie: 10, 'TV Season': 12 },
  earningWeeks: { Movie: 8, 'TV Season': 10 }
};

const REVISED = {
  overhead: 6000,
  duration: { Movie: 8, 'TV Season': 9 },
  earningWeeks: { Movie: 12, 'TV Season': 14 }
};

const PROJECTS = {
  Movie: { baseCost: 180000, directCost: 299000 },
  'TV Season': { baseCost: 220000, directCost: 339000 }
};

function seededRandom(seed) {
  return () => {
    seed |= 0;
    seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function weeklyRevenue(version, format, baseCost, appeal, elapsed) {
  if (version === 'legacy') {
    const decay = Math.pow(.68, elapsed);
    if (format === 'Movie' && elapsed < 5) {
      const gross = Math.round(baseCost * (1 + appeal * 2.5) * decay * .52);
      return Math.round(gross * .45);
    }
    return Math.round(baseCost * (.12 + appeal * .3) * decay);
  }
  if (format === 'Movie') {
    if (elapsed < 6) {
      const gross = Math.round(baseCost * (.44 + appeal * 1.55) * Math.pow(.72, elapsed));
      return Math.round(gross * .50);
    }
    return Math.round(baseCost * (.08 + appeal * .15) * Math.pow(.72, elapsed - 6));
  }
  return Math.round(baseCost * (.23 + appeal * .62) * Math.pow(.78, elapsed));
}

function simulate(seed, strategy, version) {
  const random = seededRandom(seed);
  const rules = version === 'legacy' ? LEGACY : REVISED;
  let cash = 550000;
  let active = null;
  let releases = [];
  let completed = 0;
  let directCosts = 0;
  let revenue = 0;
  let insolvent = false;

  const nextFormat = () => strategy === 'movie' ? 'Movie' : strategy === 'tv' ? 'TV Season' : (completed % 2 ? 'TV Season' : 'Movie');

  for (let week = 1; week <= 52; week++) {
    if (!active) {
      const format = nextFormat();
      const project = PROJECTS[format];
      if (cash - project.directCost >= rules.overhead * 4) {
        cash -= project.directCost;
        directCosts += project.directCost;
        active = { format, weeksLeft: rules.duration[format], appeal: .45 + random() * .28 };
      }
    }

    cash -= rules.overhead;
    for (const release of releases) {
      if (release.elapsed < rules.earningWeeks[release.format]) {
        const receipt = weeklyRevenue(version, release.format, PROJECTS[release.format].baseCost, release.appeal, release.elapsed++);
        cash += receipt;
        revenue += receipt;
      }
    }
    releases = releases.filter(release => release.elapsed < rules.earningWeeks[release.format]);

    if (active && --active.weeksLeft === 0) {
      releases.push({ format: active.format, appeal: active.appeal, elapsed: 0 });
      active = null;
      completed++;
    }
    if (cash < 0) insolvent = true;
  }

  return { solvent: !insolvent && cash >= 0, cash, operatingResult: revenue - directCosts - rules.overhead * 52, completed, revenue, directCosts, overhead: rules.overhead * 52 };
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : Math.round((sorted[middle - 1] + sorted[middle]) / 2);
}

function summarize(strategy, version) {
  const runs = Array.from({ length: 100 }, (_, index) => simulate(index + 1, strategy, version));
  return {
    survivalRate: runs.filter(run => run.solvent).length,
    medianOperatingResult: median(runs.map(run => run.operatingResult)),
    medianCash: median(runs.map(run => run.cash)),
    medianCompleted: median(runs.map(run => run.completed)),
    medianRevenue: median(runs.map(run => run.revenue)),
    medianDirectCosts: median(runs.map(run => run.directCosts)),
    overhead: runs[0].overhead,
    eventIncome: 0,
    debtOutstanding: 0
  };
}

const report = {};
for (const strategy of ['movie', 'tv', 'mixed']) {
  report[strategy] = { before: summarize(strategy, 'legacy'), after: summarize(strategy, 'revised') };
}

console.log('52-week economy simulation (100 seeds per strategy):');
console.log(JSON.stringify(report, null, 2));

for (const strategy of ['movie', 'tv', 'mixed']) {
  assert.ok(report[strategy].after.survivalRate >= 90, `${strategy} reaches the 90% survival target`);
  assert.ok(report[strategy].after.medianOperatingResult > 0, `${strategy} has a positive typical operating result`);
  assert.ok(report[strategy].after.medianCash > 550000, `${strategy} builds a typical cash cushion`);
  assert.ok(report[strategy].after.medianCompleted >= 4, `${strategy} completes several productions`);
}
