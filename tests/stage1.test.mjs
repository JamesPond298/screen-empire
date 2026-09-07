import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';

const root = path.resolve(import.meta.dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8').replace('<script src="game.js"></script>', '');
const gameCode = fs.readFileSync(path.join(root, 'game.js'), 'utf8');

function openGame(saved = null) {
  const dom = new JSDOM(html, {
    url: 'https://screen-empire.test/',
    runScripts: 'dangerously',
    pretendToBeVisual: true
  });
  if (saved) dom.window.localStorage.setItem('screenEmpireSave', saved);
  dom.window.eval(gameCode);
  return dom;
}

function savedState(dom) {
  return JSON.parse(dom.window.localStorage.getItem('screenEmpireSave'));
}

function click(dom, selector) {
  const element = dom.window.document.querySelector(selector);
  assert.ok(element, `Expected to find ${selector}`);
  element.click();
}

const dom = openGame();
const { document } = dom.window;

assert.equal(document.querySelector('[name="studioName"]').placeholder, 'Name your production company', 'new game shows studio setup');
document.querySelector('[name="studioName"]').value = 'Pixel Lantern Pictures';
document.querySelector('#setup-form').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));

let save = savedState(dom);
assert.equal(save.studioName, 'Pixel Lantern Pictures');
assert.equal(save.cash, 550000, 'starting cash is not duplicated by its ledger entry');
assert.equal(save.transactions.filter(tx => tx.category === 'Starting capital').length, 1);

const firstClockButton = document.querySelector('#next-week');
firstClockButton.click();
firstClockButton.click();
save = savedState(dom);
assert.equal(save.week, 2, 'two rapid clicks on the same clock button advance only once');
assert.equal(save.transactions.filter(tx => tx.category === 'Shared overhead').length, 1);

click(dom, '[data-page="productions"]');
document.querySelector('[name="title"]').value = 'Midnight Detour';
document.querySelector('#greenlight-form').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
save = savedState(dom);
assert.equal(save.productions.length, 1);
assert.equal(save.productions[0].totalCost, 299000);
assert.equal(save.cash, 387500, 'first project remains affordable after one week of overhead');
assert.equal(save.team.busyProductionId, save.productions[0].id);

for (let i = 0; i < 10; i++) click(dom, '#next-week');
save = savedState(dom);
let production = save.productions[0];
assert.equal(production.status, 'Released');
assert.equal(production.paidCost, production.totalCost, 'all direct costs are charged exactly once');
assert.equal(save.catalog.length, 1);
assert.equal(save.team.busyProductionId, null);
assert.ok(Number.isInteger(production.criticScore) && Number.isInteger(production.audienceScore));

for (let i = 0; i < 8; i++) click(dom, '#next-week');
save = savedState(dom);
production = save.productions[0];
assert.ok(production.lifetimeRevenue > 0, 'released production earns revenue over time');
assert.ok(production.boxOfficeGross > production.lifetimeRevenue * .45, 'box-office gross is distinct from studio cash receipts');
const finishedRevenue = production.lifetimeRevenue;
click(dom, '#next-week');
save = savedState(dom);
assert.equal(save.productions[0].lifetimeRevenue, finishedRevenue, 'revenue does not repeat after the release window');
assert.equal(save.transactions.filter(tx => tx.category === 'Shared overhead').length, save.week - 1, 'overhead is charged once per advanced week');
assert.equal(save.transactions.filter(tx => tx.category === 'Operating revenue').length, 8, 'each weekly receipt occurs once');

const portableSave = dom.window.localStorage.getItem('screenEmpireSave');
const criticScore = save.productions[0].criticScore;
const reloaded = openGame(portableSave);
const reloadSave = savedState(reloaded);
assert.equal(reloadSave.week, save.week);
assert.equal(reloadSave.productions[0].criticScore, criticScore, 'reload does not reroll results');
assert.match(reloaded.window.document.body.textContent, /Midnight Detour/, 'saved production renders after reload');

const migrated = reloaded.window.ScreenEmpireTest.migrateState({ studioName: 'Old Save', week: 4, cash: 100000, productions: [], version: 0 });
assert.equal(migrated.version, 1);
assert.ok(Array.isArray(migrated.news));
assert.equal(migrated.weeklyOverhead, 7500, 'older saves receive safe defaults');

const beforeInvalidImport = reloaded.window.localStorage.getItem('screenEmpireSave');
const invalidFile = new reloaded.window.File(['not valid json'], 'broken.json', { type: 'application/json' });
const fileInput = reloaded.window.document.querySelector('#save-file');
Object.defineProperty(fileInput, 'files', { configurable: true, value: [invalidFile] });
fileInput.dispatchEvent(new reloaded.window.Event('change', { bubbles: true }));
await new Promise(resolve => reloaded.window.setTimeout(resolve, 20));
assert.equal(reloaded.window.localStorage.getItem('screenEmpireSave'), beforeInvalidImport, 'invalid imports do not replace a working save');

const concepts = reloaded.window.ScreenEmpireTest.DATA.concepts;
assert.ok(concepts.every(concept => concept.genres.length > 0));
assert.equal(new Set(concepts.map(concept => concept.id)).size, concepts.length);

dom.window.close();
reloaded.window.close();
console.log('Stage 1 playthrough passed: 22 assertions covering setup, production, finances, release, catalog, and saves.');
