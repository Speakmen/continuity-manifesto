// orcid-add-work.js v2 —— 按 DOI 加作品（v1 的 /work/add 是 404，改成走界面上真实的按钮）
const { chromium } = require('playwright');
const ORCID = '0009-0009-1562-9745';
const EMAIL = 'speakmen@outlook.com';
const DOI = process.argv[2] || '';
const TYPE = process.argv[3] || '';
const TITLE = process.argv[4] || '';
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function dump(page, tag) {
  const info = await page.evaluate(() => ({
    url: location.href,
    buttons: Array.from(document.querySelectorAll('button,a.button,[role="button"]'))
      .map(b => (b.innerText || '').trim()).filter(t => t && t.length < 40).slice(0, 40),
    links: Array.from(document.querySelectorAll('a[href*="work"]')).map(a => a.getAttribute('href')).slice(0, 20),
    inputs: Array.from(document.querySelectorAll('input,select')).map(i => ({ id: i.id, name: i.name, ctrl: i.getAttribute('formcontrolname'), ph: i.placeholder })).slice(0, 25),
  }));
  console.log(`[DUMP ${tag}]`, JSON.stringify(info).slice(0, 2000));
}

(async () => {
  const password = process.env.ORCID_PASS;
  if (!password) { console.error('No ORCID_PASS'); process.exit(1); }
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-blink-features=AutomationControlled'] });
  const ctx = await browser.newContext({ locale: 'en-US', userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36' });
  const page = await ctx.newPage();
  const clean = async () => {
    await page.evaluate(() => {
      document.querySelectorAll('#onetrust-consent-sdk,#onetrust-banner-sdk,#onetrust-pc-sdk,.onetrust-pc-dark-filter').forEach(e => e.remove());
      document.body.style.overflow = 'auto';
    }).catch(() => {});
  };
  try {
    console.log('Step 1: login');
    await page.goto('https://orcid.org/signin', { waitUntil: 'domcontentloaded', timeout: 90000 });
    await sleep(2500);
    for (const s of ['button:has-text("Accept All Cookies")', '#onetrust-accept-btn-handler', 'button:has-text("Understood")']) await page.click(s).catch(() => {});
    await clean();
    await page.waitForSelector('#username-input', { timeout: 30000 });
    await page.fill('#username-input', EMAIL);
    await page.fill('#password', password);
    await page.locator('#signin-button').click({ force: true });
    await page.waitForURL(u => !u.toString().includes('signin'), { timeout: 45000 });
    console.log('   logged in:', page.url());

    console.log('Step 2: my-orcid');
    await page.goto(`https://orcid.org/my-orcid`, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await sleep(4000); await clean();
    await dump(page, 'my-orcid');

    console.log('Step 3: click Works Add');
    const addCandidates = [
      '#works-panel button:has-text("Add")',
      'button:has-text("Add works")',
      'button[aria-label*="Add work"]',
      '#works-panel .workspace-add-button',
      'button:has-text("Add")',
    ];
    let clicked = false;
    for (const sel of addCandidates) {
      const loc = page.locator(sel).first();
      if (await loc.count() > 0) {
        await loc.click().catch(() => {});
        clicked = true; console.log('   clicked:', sel); await sleep(2500); break;
      }
    }
    if (!clicked) { console.log('   no add button found'); }
    await clean();
    await dump(page, 'after-add-click');

    console.log('Step 4: pick "Add manually" or "Search by DOI"');
    for (const sel of ['button:has-text("Add manually")', 'a:has-text("Add manually")',
                       'button:has-text("Search by DOI")', 'button:has-text("DOI")',
                       'button:has-text("Add DOI")']) {
      const loc = page.locator(sel).first();
      if (await loc.count() > 0) {
        await loc.click().catch(() => {});
        console.log('   clicked:', sel); await sleep(4000); break;
      }
    }
    await clean();
    await dump(page, 'form');

    console.log('Step 5: fill DOI');
    const doiSel = ['input[formcontrolname="doi"]', 'input[name="doi"]', 'input[id*="doi"]', 'input[placeholder*="DOI"]'];
    for (const sel of doiSel) {
      const loc = page.locator(sel).first();
      if (await loc.count() > 0) {
        await loc.fill(DOI); console.log('   filled via', sel); await sleep(500);
        for (const btn of ['button:has-text("Add DOI")', 'button:has-text("Search")', 'button:has-text("Continue")']) {
          const b = page.locator(btn).first();
          if (await b.count() > 0) { await b.click().catch(() => {}); console.log('   clicked', btn); await sleep(12000); break; }
        }
        break;
      }
    }
    await clean();
    await dump(page, 'after-doi');

    console.log('Step 6: save');
    for (const sel of ['button:has-text("Save changes")', 'button:has-text("Save")', 'button[type="submit"]']) {
      const b = page.locator(sel).first();
      if (await b.count() > 0 && await b.isEnabled().catch(() => false)) { await b.click().catch(() => {}); console.log('   clicked', sel); break; }
    }
    await sleep(10000);
    await page.screenshot({ path: 'orcid-add-work.png', fullPage: true }).catch(() => {});
    console.log('RESULT_URL=' + page.url());
    const t = await page.evaluate(() => document.body.innerText);
    console.log('AFTER:', t.slice(0, 400).replace(/\n/g, ' | '));
  } catch (e) {
    console.error('FAILED:', e.message);
    await page.screenshot({ path: 'orcid-add-work-fail.png', fullPage: true }).catch(() => {});
    process.exit(1);
  } finally { await browser.close(); }
})();
