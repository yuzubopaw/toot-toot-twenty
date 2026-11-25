import { mkdirSync } from 'node:fs';
import puppeteer from 'puppeteer-core';

const url = 'http://127.0.0.1:4173/';
const outDir = '/Users/kkwong/Library/CloudStorage/SynologyDrive-YuzuboCloud/00000Grok/MathGames/Jump-Jump-Bunny/tmp-smoke/oic/';
mkdirSync(outDir, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'new',
  args: ['--window-size=1280,800'],
});
const page = await browser.newPage();
page.setDefaultTimeout(12000);
const errors = [];
page.on('pageerror', (err) => errors.push(String(err)));
page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push(msg.text());
});

async function shot(name) {
  await page.screenshot({ path: `${outDir}${name}` });
}

async function fresh(path = '') {
  await page.goto(url + path, { waitUntil: 'networkidle0' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle0' });
}

async function finishAction() {
  for (let i = 0; i < 12; i += 1) {
    const btn = await page.$('.action-btn');
    if (!btn) return;
    await btn.click();
    await new Promise((resolve) => setTimeout(resolve, 220));
  }
  if (await page.$('.action-btn')) throw new Error('action stayed on');
}

async function answerLeft() {
  await page.waitForSelector('[data-answer]');
  const left = await page.$$eval('.cell.is-here', (els) => els.length);
  await page.click(`[data-answer="${left}"]`);
  return left;
}

await page.setViewport({ width: 1280, height: 800 });
await fresh('');
await shot('01-gate-desktop.png');
await page.setViewport({ width: 390, height: 844 });
await shot('02-gate-phone.png');
const clipped = await page.evaluate(() => {
  const cards = [...document.querySelectorAll('.gate-card')];
  return cards.some((card) => {
    const box = card.getBoundingClientRect();
    return box.bottom > window.innerHeight + 2 || box.top < 0 || box.width < 40;
  });
});
if (clipped) throw new Error('a gate card is cut off on the phone');

await page.setViewport({ width: 1280, height: 800 });
await page.click('[aria-label="Oh-No Ice Cream"]');
await page.waitForSelector('[aria-label="Tap to play"]');
await shot('03-title.png');
await page.click('[aria-label="Tap to play"]');
await page.waitForSelector('[data-mode="plop"]');
const open = await page.$$eval('.map-card:not(.is-locked)', (els) => els.map((el) => el.dataset.mode));
const locked = await page.$$eval('.map-card.is-locked', (els) => els.map((el) => el.dataset.mode));
if (open.join(',') !== 'plop,dripDrop,oops') throw new Error(`open ${open}`);
if (locked.join(',') !== 'tenTrick,sampler') throw new Error(`locked ${locked}`);
await shot('04-map.png');

await page.click('[data-mode="plop"]');
await page.waitForSelector('.action-btn');
await finishAction();
const left = await page.$$eval('.cell.is-here', (els) => els.length);
const wrongs = await page.$$eval('[data-answer]', (els, answer) => (
  els.map((el) => el.dataset.answer).filter((value) => value !== String(answer))
), left);
if (wrongs.length < 2) throw new Error(`need two wrong choices, got ${wrongs}`);
await page.click(`[data-answer="${wrongs[0]}"]`);
await page.waitForSelector('.choice.is-retry');
await page.click(`[data-answer="${wrongs[1]}"]`);
await page.waitForFunction(() => !document.querySelector('.screen.is-locked'));
await page.click(`[data-answer="${wrongs[1]}"]`);
await page.waitForSelector('.choice.is-reveal');
await shot('05-plop-reveal.png');
await page.click(`[data-answer="${left}"]`);
await page.waitForFunction(() => document.querySelectorAll('.ticket.is-on').length >= 1);
for (let n = 0; n < 4; n += 1) {
  await page.waitForSelector('.action-btn');
  await finishAction();
  await answerLeft();
  await page.waitForFunction(
    (count) => document.querySelectorAll('.ticket.is-on').length >= count || document.querySelector('.parade-track'),
    {},
    n + 2,
  );
}
await page.waitForSelector('.parade-track');
await shot('06-parade.png');
await page.click('.parade-screen');
await page.waitForSelector('[data-mode="plop"]');
await shot('07-map-after-plop.png');

await page.click('[data-mode="dripDrop"]');
for (let n = 0; n < 5; n += 1) {
  await page.waitForSelector('.action-btn, .parade-track');
  if (await page.$('.parade-track')) break;
  await finishAction();
  await answerLeft();
  await new Promise((resolve) => setTimeout(resolve, 400));
}
await page.waitForSelector('.parade-track', { timeout: 15000 });
await page.click('.parade-screen');
await page.waitForSelector('[data-mode="oops"]');

await page.click('[data-mode="oops"]');
await page.waitForSelector('.cell.is-ghost');
const fell = await page.$$eval('.cell.is-ghost', (els) => els.length);
await page.click('.ghost-hit');
await shot('08-oops.png');
await page.click(`[data-answer="${fell}"]`);
await page.waitForFunction(() => document.querySelectorAll('.ticket.is-on').length >= 1);
for (let n = 1; n < 5; n += 1) {
  await page.waitForFunction((need) => {
    const solved = document.querySelectorAll('.ticket.is-on').length >= need;
    const locked = document.querySelector('.screen.is-locked');
    return solved && !locked;
  }, {}, n);
  if (await page.$('.parade-track')) break;
  await page.waitForSelector('.cell.is-ghost');
  const ghosts = await page.$$eval('.cell.is-ghost', (els) => els.length);
  await page.click(`[data-answer="${ghosts}"]`);
}
await page.waitForSelector('.parade-track', { timeout: 15000 });
await page.click('.parade-screen');
await page.waitForSelector('[data-mode="plop"]');

await page.click('[aria-label="Home"]');
await page.waitForSelector('[aria-label="Settings"]');
await page.click('[aria-label="Settings"]');
await page.waitForSelector('.hold-sun');
const sun = await page.$('.hold-sun');
const sunBox = await sun.boundingBox();
await page.mouse.move(sunBox.x + sunBox.width / 2, sunBox.y + sunBox.height / 2);
await page.mouse.down();
await new Promise((resolve) => setTimeout(resolve, 3200));
await page.mouse.up();
await page.waitForSelector('[aria-label="Unlock all stands"]');
await page.click('[aria-label="Unlock all stands"]');
await shot('09-settings.png');
await page.click('[aria-label="Close"]');
await page.click('[aria-label="Tap to play"]');
await page.waitForSelector('[data-mode="tenTrick"]:not(.is-locked)');
await page.click('[data-mode="tenTrick"]');
await page.waitForSelector('.action-btn');
let sawTen = false;
for (let i = 0; i < 12; i += 1) {
  const btn = await page.$('.action-btn');
  if (!btn) break;
  await btn.click();
  await new Promise((resolve) => setTimeout(resolve, 120));
  if (await page.$('.ten-badge')) sawTen = true;
  await new Promise((resolve) => setTimeout(resolve, 700));
}
if (!sawTen) throw new Error('Ten Trick never showed Ten!');
await shot('10-ten.png');
await answerLeft();

await page.click('[aria-label="Mute sound"]');
const muted = await page.$eval('[data-mute-btn]', (el) => el.getAttribute('aria-label'));
if (muted !== 'Unmute sound') throw new Error(`mute label ${muted}`);
await page.reload({ waitUntil: 'networkidle0' });
await page.click('[aria-label="Tap to play"]');
await page.waitForSelector('[data-mode="tenTrick"]:not(.is-locked)');
const stillMuted = await page.$eval('[data-mute-btn]', (el) => el.getAttribute('aria-label'));
if (stillMuted !== 'Unmute sound') throw new Error('mute was not kept');
const visits = await page.evaluate(() => JSON.parse(localStorage.getItem('ohNoIceCream.v1')).progress.visits);
if (visits.plop < 1 || visits.dripDrop < 1 || visits.oops < 1) throw new Error(`visits ${JSON.stringify(visits)}`);
await page.goto(`${url}ttt/`, { waitUntil: 'networkidle0' });
await page.click('[aria-label="Tap to play"]');
await page.waitForSelector('[aria-label="Garden Siding"]');
await page.goto(`${url}jjb/`, { waitUntil: 'networkidle0' });
await page.click('[aria-label="Tap to play"]');
await page.waitForSelector('[data-mode="howMany"]');

await page.setViewport({ width: 390, height: 844 });
await page.goto(`${url}oic/`, { waitUntil: 'networkidle0' });
await page.click('[aria-label="Tap to play"]');
await page.click('[data-mode="plop"]');
await page.waitForSelector('.action-btn');
const overflow = await page.evaluate(() => {
  const screen = document.querySelector('.screen');
  return screen.scrollHeight - screen.clientHeight;
});
await shot('11-phone-play.png');
if (overflow > 4) throw new Error(`play screen scrolls by ${overflow}px`);

await page.evaluate(() => {
  const save = JSON.parse(localStorage.getItem('ohNoIceCream.v1'));
  save.settings.motion = 'reduce';
  localStorage.setItem('ohNoIceCream.v1', JSON.stringify(save));
});
await page.goto(`${url}oic/`, { waitUntil: 'networkidle0' });
const reduced = await page.evaluate(() => document.documentElement.classList.contains('reduce-motion'));
if (!reduced) throw new Error('reduced motion class missing');
await shot('12-reduced.png');

if (errors.length) throw new Error(errors.join('\n'));
await browser.close();
console.log('oic play ok', visits);
