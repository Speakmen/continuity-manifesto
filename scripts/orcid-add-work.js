// v6：DOI 字段实际是 #external-id-input（formcontrolname=externalId）
const { chromium } = require('playwright');
const EMAIL='speakmen@outlook.com';
const DOI = process.argv[2] || '10.5281/zenodo.24330031';
const TYPE = process.argv[3] || 'Technical note';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const clean = async p => p.evaluate(()=>{document.querySelectorAll('#onetrust-consent-sdk,#onetrust-banner-sdk,#onetrust-pc-sdk').forEach(e=>e.remove());document.body.style.overflow='auto';}).catch(()=>{});

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

    await page.goto('https://orcid.org/my-orcid', { waitUntil: 'domcontentloaded', timeout: 90000 });
    await sleep(6000); await clean(page);
    const before = await page.evaluate(() => { const m=document.body.innerText.match(/Works\s*\((\d+)\)/); return m?+m[1]:-1; });
    console.log('works before:', before);

    const idx = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button')).filter(b=>/add/i.test((b.innerText||'').trim()));
      return btns.findIndex(b => { let n=b,t=''; for(let u=0;u<6&&n;u++,n=n.parentElement){const s=(n.innerText||'').replace(/\s+/g,' '); if(s.length>t.length&&s.length<400)t=s;} return /Works\s*\(\d+\)/.test(t); });
    });
    await page.evaluate((i)=>{Array.from(document.querySelectorAll('button')).filter(b=>/add/i.test((b.innerText||'').trim()))[i].click();}, idx);
    await sleep(3000); await clean(page);

    await page.evaluate(() => { const el=Array.from(document.querySelectorAll('button,a,li,div[role="button"],span')).find(e=>/add work with a doi/i.test((e.innerText||'').trim())); if(el) el.click(); });
    await sleep(3500); await clean(page);

    // 填 external-id-input
    const loc = page.locator('#external-id-input').first();
    if (await loc.count() > 0) { await loc.click(); await loc.fill(''); await loc.type(DOI, {delay: 25}); console.log('filled external-id-input'); }
    else { console.log('no external-id-input'); }
    await sleep(1500);
    const btns = await page.evaluate(() => Array.from(document.querySelectorAll('button')).filter(b=>b.offsetParent!==null).map(b=>(b.innerText||'').replace(/\s+/g,' ').trim()).filter(t=>t&&t.length<40));
    console.log('buttons now:', JSON.stringify(btns).slice(0,800));

    // 表单里的提交：优先"Add work with a DOI"以外、含 Add/Search/Continue 且不是顶部搜索
    const submitted = await page.evaluate(() => {
      const cands = Array.from(document.querySelectorAll('button')).filter(b => b.offsetParent!==null);
      const target = cands.find(b => { const t=(b.innerText||'').replace(/\s+/g,' ').trim(); return /^(add|add work|search|continue|retrieve)$/i.test(t); })
        || cands.find(b => /add work/i.test((b.innerText||'')) && !/doi$/i.test((b.innerText||'').trim()));
      if (target) { target.click(); return (target.innerText||'').trim(); } return null;
    });
    console.log('submitted via:', submitted);
    await sleep(18000); await clean(page);
    let t = await page.evaluate(()=>document.body.innerText);
    console.log('after submit:', t.slice(0,500).replace(/\n/g,' | '));

    // 选类型
    const ms = page.locator('mat-select').first();
    if (await ms.count() > 0) {
      await ms.click().catch(()=>{}); await sleep(1500);
      const ok = await page.evaluate((type)=>{ const o=Array.from(document.querySelectorAll('mat-option')).find(x=>(x.innerText||'').trim().toLowerCase()===type.toLowerCase()); if(o){o.click();return true;} return false; }, TYPE);
      console.log('type selected:', ok); await sleep(1200);
    }
    // 保存
    for (const sel of ['button:has-text("Save changes")','button:has-text("Save")']) {
      const b=page.locator(sel).first();
      if (await b.count()>0 && await b.isEnabled().catch(()=>false)) { await b.click().catch(()=>{}); console.log('save:', sel); break; }
    }
    await sleep(15000); await clean(page);
    await page.screenshot({ path:'orcid-v6.png', fullPage:true }).catch(()=>{});
    await page.goto('https://orcid.org/my-orcid', { waitUntil:'domcontentloaded', timeout:90000 });
    await sleep(7000);
    const after = await page.evaluate(()=>{const m=document.body.innerText.match(/Works\s*\((\d+)\)/);return m?+m[1]:-1;});
    console.log('works after:', after, '| RESULT:', before, '->', after);
  } catch(e) { console.error('FAILED:', e.message); await page.screenshot({path:'orcid-v6-fail.png',fullPage:true}).catch(()=>{}); process.exit(1); }
  finally { await browser.close(); }
})();
