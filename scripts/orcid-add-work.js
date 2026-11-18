// v5：Works → "Add work with a DOI" → 填 DOI → 选类型 → 保存 → 复核作品数
const { chromium } = require('playwright');
const EMAIL='speakmen@outlook.com';
const DOI = process.argv[2] || '10.5281/zenodo.24330031';
const TYPE = process.argv[3] || 'Technical note';
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function clean(page){
  await page.evaluate(()=>{document.querySelectorAll('#onetrust-consent-sdk,#onetrust-banner-sdk,#onetrust-pc-sdk').forEach(e=>e.remove());document.body.style.overflow='auto';}).catch(()=>{});
}

(async () => {
  const password = process.env.ORCID_PASS;
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ locale: 'en-US', viewport: { width: 1440, height: 1100 } });
  const page = await ctx.newPage();
  try {
    await page.goto('https://orcid.org/signin', { waitUntil: 'domcontentloaded', timeout: 90000 });
    await sleep(2000);
    for (const s of ['button:has-text("Accept All Cookies")','#onetrust-accept-btn-handler','button:has-text("Understood")']) await page.click(s).catch(()=>{});
    await clean(page);
    await page.waitForSelector('#username-input',{timeout:30000});
    await page.fill('#username-input', EMAIL); await page.fill('#password', password);
    await page.locator('#signin-button').click({force:true});
    await page.waitForURL(u=>!u.toString().includes('signin'),{timeout:45000});
    console.log('logged in');

    await page.goto('https://orcid.org/my-orcid', { waitUntil: 'domcontentloaded', timeout: 90000 });
    await sleep(6000); await clean(page);
    const before = await page.evaluate(() => { const m = document.body.innerText.match(/Works\s*\((\d+)\)/); return m ? +m[1] : -1; });
    console.log('works before:', before);

    // 1) 点 Works 的 Add（第 5 个含 Add 的按钮 = index 4，按 ctx 判定）
    const clicked = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button')).filter(b => /add/i.test((b.innerText||'').trim()));
      const idx = btns.findIndex(b => {
        let n=b, t='';
        for (let u=0;u<6&&n;u++,n=n.parentElement){ const s=(n.innerText||'').replace(/\s+/g,' '); if(s.length>t.length&&s.length<400) t=s; }
        return /Works\s*\(\d+\)/.test(t);
      });
      if (idx>=0){ btns[idx].click(); return idx; } return -1;
    });
    console.log('works add idx:', clicked);
    await sleep(3000);
    await clean(page);

    // 2) 选 "Add work with a DOI"
    const picked = await page.evaluate(() => {
      const el = Array.from(document.querySelectorAll('button,a,li,div[role="button"],mat-option,span'))
        .find(e => /add work with a doi/i.test((e.innerText||'').trim()));
      if (el){ el.click(); return (el.innerText||'').trim(); } return null;
    });
    console.log('picked:', picked);
    await sleep(3000);
    await clean(page);

    // 3) 填 DOI 并提交
    const has = await page.evaluate(() => Array.from(document.querySelectorAll('input')).map(i=>({id:i.id,ctrl:i.getAttribute('formcontrolname'),ph:i.placeholder})));
    console.log('inputs:', JSON.stringify(has).slice(0,600));
    let doiFilled=false;
    for (const sel of ['input[formcontrolname*="doi" i]','input#doi-input','input[name*="doi" i]','input[placeholder*="DOI" i]']) {
      const loc = page.locator(sel).first();
      if (await loc.count() > 0) { await loc.fill(DOI); doiFilled=true; console.log('doi filled via', sel); break; }
    }
    if (!doiFilled) {
      const done = await page.evaluate((doi) => {
        const inp = Array.from(document.querySelectorAll('input')).find(i => /doi/i.test((i.id||'')+(i.name||'')+(i.getAttribute('formcontrolname')||'')+(i.placeholder||'')));
        if (inp) { inp.focus(); const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set; setter.call(inp, doi); inp.dispatchEvent(new Event('input',{bubbles:true})); return true; }
        return false;
      }, DOI);
      console.log('doi filled by JS:', done);
    }
    for (const sel of ['button:has-text("Add work with a DOI")','button:has-text("Add DOI")','button:has-text("Continue")','button:has-text("Search")']) {
      const b = page.locator(sel).last();
      if (await b.count() > 0 && await b.isEnabled().catch(()=>false)) { await b.click().catch(()=>{}); console.log('submit click:', sel); break; }
    }
    await sleep(15000); await clean(page);
    const t1 = await page.evaluate(()=>document.body.innerText);
    console.log('page after DOI:', t1.slice(0,600).replace(/\n/g,' | '));

    // 4) 选类型（若出现）
    const selWorkType = page.locator('mat-select').first();
    if (await selWorkType.count() > 0) {
      await selWorkType.click().catch(()=>{});
      await sleep(1500);
      const ok = await page.evaluate((type) => {
        const opt = Array.from(document.querySelectorAll('mat-option')).find(o => (o.innerText||'').trim().toLowerCase() === type.toLowerCase());
        if (opt) { opt.click(); return true; } return false;
      }, TYPE);
      console.log('work type selected:', ok);
      await sleep(1500);
    }

    // 5) 保存
    for (const sel of ['button:has-text("Save changes")','button:has-text("Save")','button:has-text("Add to ORCID")']) {
      const b = page.locator(sel).first();
      if (await b.count() > 0 && await b.isEnabled().catch(()=>false)) { await b.click().catch(()=>{}); console.log('save click:', sel); break; }
    }
    await sleep(15000); await clean(page);
    await page.screenshot({ path: 'orcid-v5.png', fullPage: true }).catch(()=>{});

    await page.goto('https://orcid.org/my-orcid', { waitUntil: 'domcontentloaded', timeout: 90000 });
    await sleep(7000);
    const after = await page.evaluate(() => { const m = document.body.innerText.match(/Works\s*\((\d+)\)/); return m ? +m[1] : -1; });
    console.log('works after:', after);
    console.log('RESULT:', before, '->', after);
  } catch(e) { console.error('FAILED:', e.message); await page.screenshot({path:'orcid-v5-fail.png',fullPage:true}).catch(()=>{}); process.exit(1); }
  finally { await browser.close(); }
})();
