// v4：先把每个 "Add" 按钮的所属分区打出来，再点 Works 那个
const { chromium } = require('playwright');
const ORCID='0009-0009-1562-9745', EMAIL='speakmen@outlook.com';
const DOI = process.argv[2] || '10.5281/zenodo.24330031';
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const password = process.env.ORCID_PASS;
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ locale: 'en-US', viewport: { width: 1440, height: 1100 } });
  const page = await ctx.newPage();
  try {
    await page.goto('https://orcid.org/signin', { waitUntil: 'domcontentloaded', timeout: 90000 });
    await sleep(2000);
    for (const s of ['button:has-text("Accept All Cookies")', '#onetrust-accept-btn-handler', 'button:has-text("Understood")']) await page.click(s).catch(()=>{});
    await page.evaluate(()=>{document.querySelectorAll('#onetrust-consent-sdk,#onetrust-banner-sdk,#onetrust-pc-sdk').forEach(e=>e.remove());document.body.style.overflow='auto';}).catch(()=>{});
    await page.waitForSelector('#username-input',{timeout:30000});
    await page.fill('#username-input', EMAIL); await page.fill('#password', password);
    await page.locator('#signin-button').click({force:true});
    await page.waitForURL(u=>!u.toString().includes('signin'),{timeout:45000});
    console.log('logged in:', page.url());

    await page.goto('https://orcid.org/my-orcid', { waitUntil: 'domcontentloaded', timeout: 90000 });
    await sleep(6000);
    await page.evaluate(()=>{document.querySelectorAll('#onetrust-consent-sdk,#onetrust-banner-sdk,#onetrust-pc-sdk').forEach(e=>e.remove());document.body.style.overflow='auto';}).catch(()=>{});

    // 列出所有含 "Add" 的按钮，及其向上第 4 层祖先的文本（判断属于哪个分区）
    const adds = await page.evaluate(() => {
      const out = [];
      document.querySelectorAll('button').forEach((b, i) => {
        const txt = (b.innerText || '').trim();
        if (!/add/i.test(txt)) return;
        let n = b, ctxText = '';
        for (let up = 0; up < 6 && n; up++, n = n.parentElement) {
          const t = (n.innerText || '').replace(/\s+/g, ' ').trim();
          if (t.length > ctxText.length && t.length < 400) ctxText = t;
        }
        out.push({ i, txt: txt.replace(/\n/g,' '), ctx: ctxText.slice(0, 120) });
      });
      return out;
    });
    console.log('ADDS:', JSON.stringify(adds).slice(0, 2500));

    // 找 ctx 里含 "Works" 的那个
    const idx = adds.findIndex(a => /works/i.test(a.ctx) && !/employment|education|funding|peer review|qualification|invited/i.test(a.ctx));
    console.log('works add index:', idx);
    if (idx >= 0) {
      await page.evaluate((i) => {
        const btns = Array.from(document.querySelectorAll('button')).filter(b => /add/i.test((b.innerText||'').trim()));
        btns[i] && btns[i].click();
      }, idx);
      await sleep(3000);
      const after = await page.evaluate(() => Array.from(document.querySelectorAll('button,a,li,div[role="button"]')).map(e=>(e.innerText||'').trim()).filter(t=>t&&t.length<50&&/manual|doi|search|import|add work/i.test(t)).slice(0,20));
      console.log('OPTIONS:', JSON.stringify(after));
      for (const label of ['Add manually', 'manually', 'Add DOI', 'DOI']) {
        const ok = await page.evaluate((lbl) => {
          const el = Array.from(document.querySelectorAll('button,a,li,div[role="button"]')).find(e => (e.innerText||'').trim().toLowerCase().includes(lbl.toLowerCase()));
          if (el) { el.click(); return (el.innerText||'').trim(); } return null;
        }, label);
        if (ok) { console.log('picked:', ok); await sleep(4000); break; }
      }
      const fields = await page.evaluate(() => Array.from(document.querySelectorAll('input,select')).map(i=>({id:i.id,ctrl:i.getAttribute('formcontrolname'),ph:i.placeholder})).slice(0,25));
      console.log('FIELDS:', JSON.stringify(fields).slice(0,1200));
      await page.screenshot({ path: 'orcid-v4.png', fullPage: true }).catch(()=>{});
      const t = await page.evaluate(()=>document.body.innerText);
      console.log('AFTER:', t.slice(0,400).replace(/\n/g,' | '));
      console.log('URL:', page.url());
    }
  } catch (e) { console.error('FAILED:', e.message); await page.screenshot({path:'orcid-v4-fail.png',fullPage:true}).catch(()=>{}); process.exit(1); }
  finally { await browser.close(); }
})();
