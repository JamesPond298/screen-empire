import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';

const root = path.resolve(import.meta.dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8').replace(/<script src="game\.js[^\"]*"><\/script>/, '');
const gameCode = fs.readFileSync(path.join(root, 'game.js'), 'utf8');

function openGame(saved = null) {
  const dom = new JSDOM(html, { url: 'https://screen-empire.test/', runScripts: 'dangerously', pretendToBeVisual: true });
  dom.window.HTMLElement.prototype.scrollIntoView = () => {};
  if (saved) dom.window.localStorage.setItem('screenEmpireSave', saved);
  dom.window.eval(gameCode);
  return dom;
}
function state(dom) { return JSON.parse(dom.window.localStorage.getItem('screenEmpireSave')); }
function click(dom, selector) { const item = dom.window.document.querySelector(selector); assert.ok(item, `Expected ${selector}`); item.click(); }
function createStudio(dom, name = 'Opportunity Test Studio') {
  const form = dom.window.document.querySelector('#setup-form');
  form.elements.namedItem('studioName').value = name;
  form.dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
}
function advance(dom, count = 1) { for (let i = 0; i < count; i++) click(dom, '#next-week'); }
function greenlightDefault(dom) {
  click(dom, '[data-page="productions"]');
  const form = dom.window.document.querySelector('#greenlight-form');
  form.dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
}

// Fresh studios receive and can complete a practical Week 2 job through the UI.
const paid = openGame();
createStudio(paid);
advance(paid);
let save = state(paid);
assert.equal(save.week, 2);
assert.ok(save.opportunities.some(o => o.status === 'open' && o.directCost === 0), 'Week 2 has a feasible no-cost paid opportunity');
click(paid, '[data-page="business"]');
click(paid, '[data-accept-offer]');
save = state(paid);
const accepted = save.opportunities.find(o => o.status === 'accepted');
assert.ok(accepted?.contractId, 'accepting creates a saved contract with the same event');
const cashBeforeDelivery = save.cash;
advance(paid);
save = state(paid);
const completed = save.opportunities.find(o => o.id === accepted.id);
assert.equal(completed.status, 'completed');
assert.equal(completed.paymentStatus, 'paid');
assert.equal(save.cash, cashBeforeDelivery - save.weeklyOverhead + accepted.deliveryPayment, 'delivery pays exactly once through the weekly clock');
assert.ok(save.transactions.some(tx => tx.eventId === accepted.id && tx.category === 'Client delivery payment'));
const cashAfterDelivery = save.cash;
paid.window.location.reload;
const paidReloaded = openGame(paid.window.localStorage.getItem('screenEmpireSave'));
assert.equal(state(paidReloaded).cash, cashAfterDelivery, 'reload does not repeat a client payment');

// Declining and expiration never pay.
let open = save.opportunities.find(o => o.status === 'open');
if (!open) {
  for (let i = 0; i < 7 && !open; i++) { advance(paid); open = state(paid).opportunities.find(o => o.status === 'open'); }
}
click(paid, '[data-page="business"]');
click(paid, `[data-decline-offer="${open.id}"]`);
save = state(paid);
assert.equal(save.opportunities.find(o => o.id === open.id).status, 'declined');
assert.equal(save.transactions.filter(tx => tx.eventId === open.id && tx.amount > 0).length, 0, 'declining pays nothing');
let expiring;
for (let i = 0; i < 8 && !expiring; i++) { advance(paid); expiring = state(paid).opportunities.find(o => o.status === 'open'); }
assert.ok(expiring, 'another offer arrives after the decline cooldown');
const expiry = expiring.expiresWeek;
while (state(paid).week <= expiry) advance(paid);
save = state(paid);
assert.equal(save.opportunities.find(o => o.id === expiring.id).status, 'expired');
assert.equal(save.transactions.filter(tx => tx.eventId === expiring.id && tx.amount > 0).length, 0, 'expiration pays nothing');

// A busy filming team still gets an eligible office assignment.
const busy = openGame();
createStudio(busy, 'Busy Test Studio');
greenlightDefault(busy);
advance(busy);
save = state(busy);
assert.ok(save.team.busyProductionId);
assert.ok(save.opportunities.some(o => o.status === 'open' && o.capacity === 'office'), 'busy studio without a catalog receives office work');

// An original decision applies once, then completion grants a genre choice.
advance(busy);
click(busy, '[data-page="productions"]');
const decisionButton = busy.window.document.querySelector('[data-decision="rehearse"]');
assert.ok(decisionButton, 'production decision is visible at the documented stage');
const beforeDecision = state(busy).cash;
decisionButton.click();
save = state(busy);
assert.equal(save.productions[0].decision.choice, 'rehearse');
assert.equal(save.cash, beforeDecision - 12000, 'decision charges its disclosed cost once');
assert.equal(save.transactions.filter(tx => tx.category === 'Production decision').length, 1);
advance(busy, 6);
save = state(busy);
assert.equal(save.productions[0].status, 'Released');
assert.equal(save.progression.experience, 100, 'first original awards 100 experience');
assert.equal(save.progression.pendingGenreChoices, 1, 'first milestone grants one player-controlled choice');
assert.ok(save.productions[0].releaseReport?.preliminary, 'release report is preliminary while revenue remains');
click(busy, '[data-page="career"]');
click(busy, '[data-unlock-genre="Horror"]');
save = state(busy);
assert.ok(save.progression.unlockedGenres.includes('Horror'));
assert.equal(save.progression.pendingGenreChoices, 0);
assert.equal(busy.window.document.querySelector('[name="genre"]').value, 'Horror', 'chosen genre is immediately selected for production');

// Every new genre has concepts, talent compatibility, varied names, and valid data.
const api = busy.window.ScreenEmpireTest;
for (const genre of Object.keys(api.GENRES)) {
  assert.ok(api.DATA.concepts.filter(c => c.genres.includes(genre)).length >= 3, `${genre} has at least three concepts`);
  for (const role of Object.values(api.DATA.talent)) assert.ok(role.some(person => (person.fits || [person.fit]).includes(genre)), `${genre} has compatible talent`);
  assert.ok(api.titleCandidates('Movie', genre).length >= 15, `${genre} has varied movie names`);
  assert.ok(api.titleCandidates('TV Season', genre).length >= 15, `${genre} has varied TV names`);
}

// A year-old save earns verified retroactive experience and choices exactly once.
const old = api.defaultState();
old.version = 3; old.studioName = 'Year Old Studio'; old.week = 53;
old.productions = [{ id: 'old-1', title: 'Old Release', status: 'Released' }, { id: 'old-2', title: 'Still Filming', status: 'In Production' }];
old.catalog = ['old-1'];
delete old.progression; delete old.opportunities; delete old.contracts; delete old.licenses; delete old.opportunityClock;
const migratedDom = openGame(JSON.stringify(old));
const migrated = state(migratedDom);
assert.equal(migrated.progression.experience, 100);
assert.equal(migrated.progression.pendingGenreChoices, 1);
assert.ok(migrated.progression.migrationRecap.includes('1 completed original'));
const migratedAgain = openGame(migratedDom.window.localStorage.getItem('screenEmpireSave'));
assert.equal(state(migratedAgain).progression.experience, 100, 'migration does not award experience twice');
assert.equal(state(migratedAgain).progression.pendingGenreChoices, 1, 'migration does not duplicate choices');

// A catalog title receives a real saved streaming license and one payment.
let licenseOffer;
for (let i = 0; i < 30 && !licenseOffer; i++) {
  advance(busy);
  save = state(busy);
  licenseOffer = save.opportunities.find(o => o.status === 'open' && o.type === 'streaming-license');
  if (!licenseOffer) {
    const other = save.opportunities.find(o => o.status === 'open');
    if (other) { click(busy, '[data-page="business"]'); click(busy, `[data-decline-offer="${other.id}"]`); }
  }
}
assert.ok(licenseOffer, 'a finished title receives a streaming offer through normal scheduling');
click(busy, '[data-page="business"]');
click(busy, `[data-accept-offer="${licenseOffer.id}"]`);
save = state(busy);
assert.equal(save.opportunities.find(o => o.id === licenseOffer.id).status, 'completed');
assert.ok(save.licenses.some(l => l.eventId === licenseOffer.id && l.status === 'active'));
assert.equal(save.transactions.filter(tx => tx.eventId === licenseOffer.id && tx.amount > 0).length, 1, 'license fee is paid once');

console.log('Opportunity/progression playthrough passed: Week 2 work, delivery payment, decline/expiration, busy-studio fallback, decision, genre choice, migration, and licensing.');

for (const dom of [paid, paidReloaded, busy, migratedDom, migratedAgain]) dom.window.close();
