// v3：不再按文字猜按钮——在页面里按"所属分区标题"找 Works 的 Add，再走手工添加表单
const { chromium } = require('playwright');
const ORCID = '0009-0009-1562-9745';
const EMAIL = 'speakmen@outlook.com';
const DOI = process.argv[2] || '';
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const password = process.env.ORCID_PASS;
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ locale: 'en-US', viewport: { width: 1440, height: 1000 } });
  const page = await ctx.newPage();
  try {
    console.log('login');
    await page.goto('https://orcid.org/signin', { waitUntil: 'domcontentloaded', timeout: 90000 });
    await sleep(2000);
    for (const s of ['button:has-text("Accept All Cookies")', '#onetrust-accept-btn-handler', 'button:has-text("Understood")']) await page.click(s).catch(()=>{});
    await page.evaluate(() => { document.querySelectorAll('#onetrust-consent-sdk,#onetrust-banner-sdk,#onetrust-pc-sdk,.onetrust-pc-dark-filter').forEach(e=>e.remove()); document.body.style.overflow='auto'; }).catch(()=>{});
    await page.waitForSelector('#username-input', { timeout: 30000 });
    await page.fill('#username-input', EMAIL);
    await page.fill('#password', password);
    await page.locator('#signin-button').click({ force: true });
    await page.waitForURL(u => !u.toString().includes('signin'), { timeout: 45000 });
    console.log('  ok', page.url());

    await page.goto('https://orcid.org/my-orcid', { waitUntil: 'domcontentloaded', timeout: 90000 });
    await sleep(5000);
    await page.evaluate(() => { document.querySelectorAll('#onetrust-consent-sdk,#onetrust-banner-sdk,#onetrust-pc-sdk').forEach(e=>e.remove()); document.body.style.overflow='auto'; }).catch(()=>{});

    // 找 Works 分区的 Add 按钮：向上找到含 "Works" 标题的容器，点它的 Add
    const clickedWorksAdd = await page.evaluate(() => {
      const headings = Array.from(document.querySelectorAll('h1,h2,h3,h4,mat-panel-title,span'))
        .filter(h => /^Works\s*$/i.test((h.innerText || '').trim()));
      for (const h of headings) {
        let node = h;
        for (let up = 0; up < 8 && node; up++, node = node.parentElement) {
          const btn = Array.from(node.querySelectorAll('button')).find(b => /add/i.test(b.innerText || '') && !/employment|education|funding|peer/i.test(b.innerText||''));
          if (btn) { btn.click(); return true; }
        }
      }
      return false;
    });
    console.log('  Works Add clicked:', clickedWorksAdd);
    await sleep(3000);

    // 记录出现的选项
    const opts = await page.evaluate(() => Array.from(document.querySelectorAll('button,a,li')).map(e => (e.innerText||'').trim()).filter(t => t && t.length < 60 && /add|doi|search|import|manually/i.test(t)).slice(0, 25));
    console.log('  options:', JSON.stringify(opts));

    // 优先点 "Add manually"，其次 "Search by DOI"/"Add DOI"
    for (const pat of [/add manually/i, /search/i, /add doi/i, /doi/i]) {
      const done = await page.evaluate((p) => {
        const re = new RegExp(p.source, 'i');
        const el = Array.from(document.querySelectorAll('button,a,li,div[role="button"]')).find(e => re.test((e.innerText||'').trim()) && (e.innerText||'').length < 60);
        if (el) { el.click(); return true; } return false;
      }, pat);
      if (done) { console.log('  picked:', pat.source); await sleep(4000); break; }
    }

    const fields = await page.evaluate(() => Array.from(document.querySelectorAll('input,select')).map(i => ({ id: i.id, ctrl: i.getAttribute('formcontrolname'), name: i.name, ph: i.placeholder })).slice(0, 30));
    console.log('  fields:', JSON.stringify(fields).slice(0, 1500));

    // 填 DOI 或 标题
    const filled = await page.evaluate((doi) => {
      const inputs = Array.from(document.querySelectorAll('input'));
      const doiIn = inputs.find(i => /doi/i.test(i.id + i.name + (i.getAttribute('formcontrolname')||'') + i.placeholder));
      if (doiIn) { doiIn.focus(); return 'doi-field'; }
      const t = inputs.find(i => /title/i.test(i.id + i.name + (i.getAttribute('formcontrolname')||'')));
      if (t) { t.focus(); return 'title-field'; }
      return 'none';
    }, DOI);
    console.log('  focus target:', filled);
    if (filled === 'doi-field') {
      await page.keyboard.type(DOI, { delay: 20 });
      for (const s of ['button:has-text("Add DOI")', 'button:has-text("Search")', 'button:has-text("Continue")', 'button:has-text("Retrieve")']) {
        const b = page.locator(s).first();
        if (await b.count() > 0) { await b.click().catch(()=>{}); console.log('  clicked', s); await sleep(12000); break; }
      }
    }
    await page.screenshot({ path: 'orcid-v3.png', fullPage: true }).catch(()=>{});
    const t = await page.evaluate(() => document.body.innerText);
    console.log('AFTER:', t.slice(0, 500).replace(/\n/g, ' | '));
    console.log('URL:', page.url());
  } catch (e) {
    console.error('FAILED:', e.message);
    await page.screenshot({ path: 'orcid-v3-fail.png', fullPage: true }).catch(()=>{});
    process.exit(1);
  } finally { await browser.close(); }
})();
