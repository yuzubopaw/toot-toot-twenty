import { mkdirSync } from 'node:fs';
import puppeteer from 'puppeteer-core';

const url = process.argv[2] || 'http://127.0.0.1:4173/';
const outDir = new URL('../tmp-smoke/bundle/', import.meta.url);
mkdirSync(outDir, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'new',
  args: ['--window-size=1280,800'],
});
const page = await browser.newPage();
page.setDefaultTimeout(8000);
const errors = [];
page.on('pageerror', (err) => errors.push(String(err)));
page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push(msg.text());
});

async function shot(name) {
  await page.screenshot({ path: new URL(name, outDir).pathname });
}

async function box(selector) {
  const el = await page.$(selector);
  if (!el) throw new Error(`missing ${selector}`);
  const b = await el.boundingBox();
  if (!b || b.width < 40 || b.height < 40) throw new Error(`${selector} too small ${JSON.stringify(b)}`);
  return b;
}

async function fresh(path) {
  await page.goto(url + path, { waitUntil: 'networkidle0' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle0' });
}

await page.setViewport({ width: 1280, height: 800 });
await fresh('');
await box('[aria-label="Toot-Toot Twenty"]');
await box('[aria-label="Jump-Jump Bunny"]');
await shot('01-gate-desktop.png');

await page.setViewport({ width: 390, height: 844 });
await shot('02-gate-phone.png');

await page.setViewport({ width: 1280, height: 800 });
await page.click('[aria-label="Jump-Jump Bunny"]');
await page.waitForSelector('[aria-label="Tap to play"]');
if (!page.url().includes('/jjb/')) throw new Error(`jjb url ${page.url()}`);
await box('[aria-label="Tap to play"]');
await box('[aria-label="All games"]');
await shot('03-jjb-title.png');

await page.click('[aria-label="Tap to play"]');
await page.waitForSelector('[data-mode="howMany"]');
await box('[data-mode="howMany"]');
await box('[data-mode="countOut"]');
await box('[data-mode="next"]');
const labels = await page.$$eval('.map-card', (els) => els.map((el) => el.getAttribute('aria-label')));
if (labels.join('|') !== 'How many bunnies|Hop to the number|What number is next') {
  throw new Error(`meadows ${labels.join('|')}`);
}
const mapOverlap = await page.evaluate(() => {
  const chrome = document.querySelector('.chrome').getBoundingClientRect();
  const card = document.querySelector('[data-mode="next"]').getBoundingClientRect();
  return card.top < chrome.bottom - 1;
});
if (mapOverlap) throw new Error('meadow card slides under the top buttons');
await shot('04-jjb-map.png');

await page.click('[data-mode="howMany"]');
await page.waitForSelector('.choice');
const earlyCaption = await page.$eval('.caption', (el) => el.classList.contains('is-on'));
if (earlyCaption) throw new Error('count was showing before an answer');
const choiceH = await page.$eval('.choice', (el) => el.getBoundingClientRect().height);
if (choiceH < 88) throw new Error(`choice height ${choiceH}`);
await shot('05-howmany-wait.png');
const need = await page.$$eval('.bunny', (els) => els.length);
if (need < 1 || need > 5) throw new Error(`early how-many showed ${need}`);
const wrong = await page.$$eval('.choice', (els, count) => {
  const other = els.find((el) => el.dataset.value !== String(count));
  return other ? other.dataset.value : null;
}, need);
if (!wrong) throw new Error('no wrong choice');
await page.click(`.choice[data-value="${wrong}"]`);
const bodyText = await page.evaluate(() => document.body.innerText);
if (/wrong|fail|too slow/i.test(bodyText)) throw new Error(`shame copy: ${bodyText}`);
await shot('06-howmany-retry.png');
await page.waitForSelector(`.choice[data-value="${need}"]:not(.is-dim)`);
await page.click(`.choice[data-value="${need}"]`);
await page.waitForFunction(() => document.querySelectorAll('.ticket.is-on').length === 1);
await shot('07-howmany-next.png');

await page.click('[aria-label="Home"]');
await page.waitForSelector('[aria-label="Keep playing"]');
await shot('08-home-confirm.png');
await page.click('.confirm-leave');
await page.waitForSelector('[aria-label="Tap to play"]');
await page.click('[aria-label="All games"]');
await page.waitForSelector('[aria-label="Toot-Toot Twenty"]');
if (!page.url().endsWith('/') && !page.url().endsWith('/index.html')) {
  throw new Error(`gate return ${page.url()}`);
}

await page.setViewport({ width: 390, height: 844 });
await page.click('[aria-label="Jump-Jump Bunny"]');
await page.waitForSelector('[aria-label="Tap to play"]');
await page.click('[aria-label="Tap to play"]');
await page.waitForSelector('[data-mode="countOut"]');
const gear = await page.$('[aria-label="Settings"]');
const gearBox = await gear.boundingBox();
if (!gearBox || gearBox.x + gearBox.width > 388) {
  throw new Error(`settings clipped ${JSON.stringify(gearBox)}`);
}
await shot('09-phone-map.png');
await page.click('[data-mode="countOut"]');
await page.waitForSelector('.target-num');
const target = Number(await page.$eval('.target-num', (el) => el.textContent));
if (target < 1 || target > 5) throw new Error(`count-out target ${target}`);
const targetBox = await box('.target-num');
if (targetBox.height < 64) throw new Error(`numeral too small ${targetBox.height}`);
for (let i = 0; i < target; i += 1) {
  await page.click('[aria-label="Hop"]');
  await new Promise((resolve) => setTimeout(resolve, 200));
}
await page.waitForFunction(() => document.querySelectorAll('.ticket.is-on').length === 1);
await shot('10-phone-countout.png');

await page.click('[aria-label="Home"]');
await page.click('.confirm-leave');
await page.waitForSelector('[aria-label="Tap to play"]');
await page.click('[aria-label="Tap to play"]');
await page.click('[data-mode="next"]');
await page.waitForSelector('.stone');
const shown = await page.$$eval('.stone.is-filled', (els) => els.length);
await page.click('[aria-label="Hop"]');
const piled = await page.evaluate(() => {
  const hop = document.querySelector('.hop-btn').getBoundingClientRect();
  const choice = document.querySelector('.choice').getBoundingClientRect();
  const separated = hop.bottom <= choice.top + 1 || choice.bottom <= hop.top + 1;
  return !separated;
});
if (piled) throw new Error('Hop button covers the number choices');
await page.waitForFunction(
  (count) => document.querySelectorAll('.stone.is-filled').length === count,
  {},
  shown + 1,
);
await page.click(`.choice[data-value="${shown + 1}"]`);
await page.waitForFunction(() => document.querySelectorAll('.ticket.is-on').length === 1);
await shot('11-phone-next.png');

await page.setViewport({ width: 1280, height: 800 });
await page.goto(`${url}ttt/`, { waitUntil: 'networkidle0' });
await page.evaluate(() => localStorage.removeItem('tootTootTwenty.v1'));
await page.reload({ waitUntil: 'networkidle0' });
await page.click('[aria-label="Tap to play"]');
await page.waitForSelector('[aria-label="Garden Siding"]');
await page.waitForSelector('[aria-label="Tally Track"]');
await page.waitForSelector('[aria-label="Date Depot"]');
await box('[aria-label="All games"]');
await shot('12-ttt-map.png');
await page.click('[aria-label="All games"]');
await page.waitForSelector('[aria-label="Jump-Jump Bunny"]');
await shot('13-back-to-gate.png');

await page.setViewport({ width: 1280, height: 800 });
await box('[aria-label="Oh-No Ice Cream"]');
await page.setViewport({ width: 390, height: 844 });
await box('[aria-label="Oh-No Ice Cream"]');
await page.setViewport({ width: 1280, height: 800 });
await page.click('[aria-label="Oh-No Ice Cream"]');
await page.waitForSelector('[aria-label="Tap to play"]');
if (!page.url().includes('/oic/')) throw new Error(`oic url ${page.url()}`);
await box('[aria-label="Tap to play"]');
await box('[aria-label="All games"]');
await shot('14-oic-title.png');
await page.click('[aria-label="Tap to play"]');
await page.waitForSelector('[data-mode="plop"]');
await box('[data-mode="plop"]');
await box('[data-mode="dripDrop"]');
await box('[data-mode="oops"]');
if (!(await page.$('[data-mode="tenTrick"].is-locked'))) throw new Error('Ten Trick should start locked');
if (!(await page.$('[data-mode="sampler"].is-locked'))) throw new Error('Sampler should start locked');
await shot('15-oic-map.png');
await page.click('[data-mode="plop"]');
await page.waitForSelector('.action-btn');
for (let i = 0; i < 8; i += 1) {
  const btn = await page.$('.action-btn');
  if (!btn) break;
  await btn.click();
  await new Promise((resolve) => setTimeout(resolve, 180));
}
if (await page.$('.action-btn')) throw new Error('action button stayed on');
const left = await page.$$eval('.cell.is-here', (els) => els.length);
await page.waitForSelector(`[data-answer="${left}"]`);
await page.click(`[data-answer="${left}"]`);
await page.waitForFunction(() => document.querySelectorAll('.ticket.is-on').length >= 1);
await shot('16-oic-plop.png');
await page.click('.chrome [aria-label="Home"]');
await page.waitForSelector('[aria-label="Keep playing"]');
await page.click('.confirm-leave');
await page.waitForSelector('[aria-label="Tap to play"]');
await page.click('[aria-label="All games"]');
await page.waitForSelector('[aria-label="Toot-Toot Twenty"]');

if (errors.length) throw new Error(errors.join('\n'));
await browser.close();
console.log('smoke ok');
