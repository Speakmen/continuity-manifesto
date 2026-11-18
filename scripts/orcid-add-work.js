// v7：只在对话框里点提交按钮（v6 误点了页头全局搜索）
const { chromium } = require('playwright');
const EMAIL='speakmen@outlook.com';
const DOI = process.argv[2] || '10.5281/zenodo.24330031';
const TYPE = process.argv[3] || 'Technical note';
const sleep = ms => new Promise(r=>setTimeout(r,ms));
const clean = async p => p.evaluate(()=>{document.querySelectorAll('#onetrust-consent-sdk,#onetrust-banner-sdk,#onetrust-pc-sdk').forEach(e=>e.remove());document.body.style.overflow='auto';}).catch(()=>{});

const DIALOG_TRIGGER = () => {
  const btn = Array.from(document.querySelectorAll('button')).filter(b=>/add/i.test((b.innerText||'').trim()));
  const i = btn.findIndex(b=>{ let n=b,t=''; for(let u=0;u<6&&n;u++,n=n.parentElement){const s=(n.innerText||'').replace(/\s+/g,' '); if(s.length>t.length&&s.length<400)t=s;} return /Works\s*\(\d+\)/.test(t); });
  if (i>=0) btn[i].click();
};

(async () => {
  const password = process.env.ORCID_PASS;
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ locale:'en-US', viewport:{width:1440,height:1100} });
  const page = await ctx.newPage();
  try {
    await page.goto('https://orcid.org/signin', { waitUntil:'domcontentloaded', timeout:90000 });
    await sleep(2000);
    for (const s of ['button:has-text("Accept All Cookies")','#onetrust-accept-btn-handler','button:has-text("Understood")']) await page.click(s).catch(()=>{});
    await clean(page);
    await page.waitForSelector('#username-input',{timeout:30000});
    await page.fill('#username-input', EMAIL); await page.fill('#password', password);
    await page.locator('#signin-button').click({force:true});
    await page.waitForURL(u=>!u.toString().includes('signin'),{timeout:45000});

    await page.goto('https://orcid.org/my-orcid', { waitUntil:'domcontentloaded', timeout:90000 });
    await sleep(6000); await clean(page);
    const before = await page.evaluate(()=>{const m=document.body.innerText.match(/Works\s*\((\d+)\)/);return m?+m[1]:-1;});
    console.log('works before:', before);

    await page.evaluate(DIALOG_TRIGGER);
    await sleep(3000); await clean(page);
    await page.evaluate(()=>{const el=Array.from(document.querySelectorAll('button,a,li,div[role="button"],span')).find(e=>/add work with a doi/i.test((e.innerText||'').trim()));if(el)el.click();});
    await sleep(3500); await clean(page);

    const loc = page.locator('#external-id-input').first();
    await loc.click(); await loc.fill(''); await loc.type(DOI,{delay:25});
    console.log('filled DOI');

    const dlgBtns = await page.evaluate(() => {
      const roots = Array.from(document.querySelectorAll('mat-dialog-container,[role="dialog"],.cdk-overlay-pane,.mat-mdc-dialog-container'));
      const out = [];
      roots.forEach(r => r.querySelectorAll('button').forEach(b => out.push({t:(b.innerText||'').replace(/\s+/g,' ').trim(), dis:b.disabled})));
      return out;
    });
    console.log('dialog buttons:', JSON.stringify(dlgBtns).slice(0,600));

    const submitted = await page.evaluate(() => {
      const roots = Array.from(document.querySelectorAll('mat-dialog-container,[role="dialog"],.cdk-overlay-pane,.mat-mdc-dialog-container'));
      for (const r of roots) {
        const btns = Array.from(r.querySelectorAll('button')).filter(b => !b.disabled);
        const target = btns.find(b => /retrieve/i.test((b.innerText||''))) || btns.find(b => /^(add|continue)$/i.test((b.innerText||'').replace(/\s+/g,' ').trim()));
        if (target) { target.click(); return (target.innerText||'').replace(/\s+/g,' ').trim(); }
      }
      return null;
    });
    console.log('submitted via:', submitted);
    await sleep(18000); await clean(page);
    console.log('after submit:', (await page.evaluate(()=>document.body.innerText)).slice(0,400).replace(/\n/g,' | '));

    // 类型
    const ms = page.locator('mat-select').first();
    if (await ms.count() > 0) {
      await ms.click().catch(()=>{}); await sleep(1500);
      const opts = await page.evaluate(()=>Array.from(document.querySelectorAll('mat-option')).map(o=>(o.innerText||'').trim()).filter(Boolean).slice(0,15));
      console.log('type options:', JSON.stringify(opts));
      const ok = await page.evaluate((type)=>{const o=Array.from(document.querySelectorAll('mat-option')).find(x=>(x.innerText||'').trim().toLowerCase()===type.toLowerCase()); if(o){o.click();return true;} return false;}, TYPE);
      console.log('type selected:', ok); await sleep(1200);
    }
    // 保存
    for (const sel of ['button:has-text("Save changes")','button:has-text("Save")','button:has-text("Add to ORCID")']) {
      const b=page.locator(sel).first();
      if (await b.count()>0 && await b.isEnabled().catch(()=>false)) { await b.click().catch(()=>{}); console.log('save:', sel); break; }
    }
    await sleep(15000); await clean(page);
    await page.screenshot({path:'orcid-v7.png',fullPage:true}).catch(()=>{});
    await page.goto('https://orcid.org/my-orcid',{waitUntil:'domcontentloaded',timeout:90000});
    await sleep(7000);
    const after = await page.evaluate(()=>{const m=document.body.innerText.match(/Works\s*\((\d+)\)/);return m?+m[1]:-1;});
    console.log('works after:', after, '| RESULT:', before, '->', after);
  } catch(e){ console.error('FAILED:', e.message); await page.screenshot({path:'orcid-v7-fail.png',fullPage:true}).catch(()=>{}); process.exit(1);}
  finally { await browser.close(); }
})();
