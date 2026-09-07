import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';

const root = path.resolve(import.meta.dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8').replace('<script src="game.js"></script>', '');
const gameCode = fs.readFileSync(path.join(root, 'game.js'), 'utf8');

function openGame(saved = null) {
  const dom = new JSDOM(html, { url: 'https://screen-empire.test/', runScripts: 'dangerously', pretendToBeVisual: true });
  if (saved) dom.window.localStorage.setItem('screenEmpireSave', saved);
  dom.window.eval(gameCode);
  return dom;
}

function createStudio(dom, name = 'Title Test Pictures') {
  const document = dom.window.document;
  document.querySelector('[name="studioName"]').value = name;
  document.querySelector('#setup-form').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
  document.querySelector('[data-page="productions"]').click();
}

function formValues(form) {
  return Object.fromEntries(['format', 'genre', 'concept', 'budget', 'marketing', 'writer', 'director', 'lead'].map(name => [name, form.elements.namedItem(name).value]));
}

const dom = openGame();
createStudio(dom);
const { document } = dom.window;
let form = document.querySelector('#greenlight-form');
let title = form.elements.namedItem('title');
const firstAutomaticTitle = title.value;
assert.ok(firstAutomaticTitle.length > 3, 'new movies receive a title automatically');

const settingsBefore = formValues(form);
document.querySelector('#generate-title').click();
assert.notEqual(title.value, firstAutomaticTitle, 'Generate Another Title produces a different suggestion');
assert.deepEqual(formValues(form), settingsBefore, 'Generate Another Title changes no other project setting');

title.value = 'My Carefully Chosen Title';
title.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
form.elements.namedItem('genre').value = 'Drama';
form.elements.namedItem('genre').dispatchEvent(new dom.window.Event('change', { bubbles: true }));
assert.equal(title.value, 'My Carefully Chosen Title', 'genre changes do not overwrite a manual title');

dom.window.confirm = () => false;
document.querySelector('#generate-title').click();
assert.equal(title.value, 'My Carefully Chosen Title', 'declining confirmation preserves a manual title');
dom.window.confirm = () => true;
document.querySelector('#generate-title').click();
assert.notEqual(title.value, 'My Carefully Chosen Title', 'confirmed replacement generates a new title');

form.elements.namedItem('format').value = 'TV Season';
form.elements.namedItem('format').dispatchEvent(new dom.window.Event('change', { bubbles: true }));
const tvTitle = title.value;
assert.ok(tvTitle && tvTitle !== firstAutomaticTitle, 'new television shows receive a format-appropriate title');

const draftSave = dom.window.localStorage.getItem('screenEmpireSave');
document.querySelector('[data-page="dashboard"]').click();
document.querySelector('[data-page="productions"]').click();
form = document.querySelector('#greenlight-form');
assert.equal(form.elements.namedItem('title').value, tvTitle, 'opening another screen does not reroll the saved draft');

const samples = {};
for (const genre of ['Comedy', 'Drama', 'Action']) {
  samples[genre] = {};
  for (const format of ['Movie', 'TV Season']) {
    const candidates = dom.window.ScreenEmpireTest.titleCandidates(format, genre);
    assert.ok(candidates.length >= 15, `${genre} ${format} has a varied title bank`);
    assert.equal(new Set(candidates.map(dom.window.ScreenEmpireTest.normalizeTitle)).size, candidates.length, `${genre} ${format} candidates are internally distinct`);
    samples[genre][format] = candidates.slice(0, 4);
  }
}

assert.equal(dom.window.ScreenEmpireTest.continuationTitle('Westbridge — Season 1', 'season', 2), 'Westbridge — Season 2');
assert.equal(dom.window.ScreenEmpireTest.continuationTitle('Operation Nightfall 1', 'sequel', 2), 'Operation Nightfall 2');

const emptyDom = openGame();
createStudio(emptyDom, 'Empty Title Films');
const emptyForm = emptyDom.window.document.querySelector('#greenlight-form');
const emptyTitle = emptyForm.elements.namedItem('title');
emptyTitle.value = '';
emptyTitle.dispatchEvent(new emptyDom.window.Event('input', { bubbles: true }));
emptyForm.dispatchEvent(new emptyDom.window.Event('submit', { bubbles: true, cancelable: true }));
const approvedEmptySave = JSON.parse(emptyDom.window.localStorage.getItem('screenEmpireSave'));
assert.ok(approvedEmptySave.productions[0].title, 'greenlighting an empty field generates and saves a title');
const approvedTitle = approvedEmptySave.productions[0].title;
assert.ok(approvedEmptySave.news.some(item => item.title.includes(approvedTitle)), 'news uses the approved saved title');
assert.ok(approvedEmptySave.transactions.some(item => item.detail.includes(approvedTitle)), 'finances use the approved saved title');

const existingSave = JSON.parse(draftSave);
existingSave.version = 1;
existingSave.productions = [{ id: 'legacy-1', title: 'A Preserved Classic', status: 'Released' }];
existingSave.catalog = ['legacy-1'];
delete existingSave.titleGenerator;
const legacyDom = openGame(JSON.stringify(existingSave));
const migrated = JSON.parse(legacyDom.window.localStorage.getItem('screenEmpireSave'));
assert.equal(migrated.productions[0].title, 'A Preserved Classic', 'existing save titles remain unchanged');
assert.equal(migrated.version, 3);

console.log('Reviewed title samples:', JSON.stringify(samples));
console.log('Title generator passed: automatic naming, manual protection, format/genre response, continuity helpers, and save compatibility.');

dom.window.close();
emptyDom.window.close();
legacyDom.window.close();
