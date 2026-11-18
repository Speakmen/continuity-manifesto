// v9：用 Playwright locator 点可见的 Retrieve；等标题输入框出现再保存
const { chromium } = require('playwright');
const EMAIL='speakmen@outlook.com';
const DOI = process.argv[2] || '10.5281/zenodo.24330031';
const TYPE = process.argv[3] || 'Technical note';
const sleep = ms => new Promise(r=>setTimeout(r,ms));
const clean = async p => p.evaluate(()=>{document.querySelectorAll('#onetrust-consent-sdk,#onetrust-banner-sdk,#onetrust-pc-sdk').forEach(e=>e.remove());document.body.style.overflow='auto';}).catch(()=>{});

(async () => {
  const password = process.env.ORCID_PASS;
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ locale:'en-US', viewport:{width:1440,height:1100} });
  const page = await ctx.newPage();
  try {
    await page.goto('https://orcid.org/signin',{waitUntil:'domcontentloaded',timeout:90000});
    await sleep(2000);
    for (const s of ['button:has-text("Accept All Cookies")','#onetrust-accept-btn-handler','button:has-text("Understood")']) await page.click(s).catch(()=>{});
    await clean(page);
    await page.waitForSelector('#username-input',{timeout:30000});
    await page.fill('#username-input', EMAIL); await page.fill('#password', password);
    await page.locator('#signin-button').click({force:true});
    await page.waitForURL(u=>!u.toString().includes('signin'),{timeout:45000});

    await page.goto('https://orcid.org/my-orcid',{waitUntil:'domcontentloaded',timeout:90000});
    await sleep(6000); await clean(page);
    const before = await page.evaluate(()=>{const m=document.body.innerText.match(/Works\s*\((\d+)\)/);return m?+m[1]:-1;});
    console.log('works before:', before);

    // Works 的 Add
    await page.evaluate(()=>{
      const btn = Array.from(document.querySelectorAll('button')).filter(b=>/add/i.test((b.innerText||'').trim()));
      const i = btn.findIndex(b=>{let n=b,t='';for(let u=0;u<6&&n;u++,n=n.parentElement){const s=(n.innerText||'').replace(/\s+/g,' ');if(s.length>t.length&&s.length<400)t=s;}return /Works\s*\(\d+\)/.test(t);});
      if(i>=0) btn[i].click();
    });
    await sleep(3000); await clean(page);
    await page.getByText('Add work with a DOI', { exact: false }).first().click();
    await sleep(3500); await clean(page);

    const doiBox = page.locator('#external-id-input').first();
    await doiBox.click(); await doiBox.fill(''); await doiBox.type(DOI,{delay:25});
    console.log('filled DOI');

    const retrieve = page.getByRole('button', { name: /retrieve/i }).last();
    console.log('retrieve count:', await page.getByRole('button', { name: /retrieve/i }).count());
    await retrieve.click();
    console.log('clicked retrieve');

    // 等表单出现：title 或 type 控件
    let appeared = false;
    for (let i=0;i<30;i++){
      await sleep(1500);
      const has = await page.evaluate(()=>!!(document.querySelector('#title-input') || document.querySelector('mat-select') || document.querySelector('input[formcontrolname="title"]')));
      if (has){ appeared=true; console.log('form appeared after', (i+1)*1.5, 's'); break; }
    }
    console.log('form appeared:', appeared);
    await page.screenshot({path:'orcid-v9.png', fullPage:true}).catch(()=>{});
    const dlgText = await page.evaluate(()=>{
      const r = document.querySelector('mat-dialog-container,[role="dialog"],.cdk-overlay-pane');
      return r ? (r.innerText||'').slice(0,400).replace(/\n/g,' | ') : '(no dialog)';
    });
    console.log('dialog text:', dlgText);

    // 选类型：Work type 是对话框里的下拉，先诊断再点
    const diag = await page.evaluate(() => {
      const roots = Array.from(document.querySelectorAll('mat-dialog-container,[role="dialog"],.cdk-overlay-pane'));
      const out = { selects: [], comboboxes: [], labels: [] };
      roots.forEach(r => {
        r.querySelectorAll('mat-select').forEach(s => out.selects.push((s.innerText||'').replace(/\s+/g,' ').trim().slice(0,40)));
        r.querySelectorAll('[role="combobox"],[role="listbox"],[aria-haspopup]').forEach(s => out.comboboxes.push((s.getAttribute('aria-label')||s.innerText||'').replace(/\s+/g,' ').trim().slice(0,40)));
        r.querySelectorAll('label,.mat-mdc-form-field-label,mat-label').forEach(s => out.labels.push((s.innerText||'').replace(/\s+/g,' ').trim().slice(0,30)));
      });
      return out;
    });
    console.log('diag:', JSON.stringify(diag).slice(0,700));

    // 逐个候选点击，直到出现选项
    let pickedType = false;
    const clickTargets = ['mat-select', '[aria-haspopup]', 'mat-form-field:has-text("Work type") mat-select'];
    for (const tgt of clickTargets) {
      const loc = page.locator(tgt).last();
      if (await loc.count() === 0) continue;
      await loc.click({ force: true }).catch(()=>{});
      await sleep(1800);
      const opts = await page.evaluate(()=>Array.from(document.querySelectorAll('mat-option,[role="option"]')).map(o=>(o.innerText||'').replace(/\s+/g,' ').trim()).filter(Boolean).slice(0,30));
      console.log('options after', tgt, ':', JSON.stringify(opts).slice(0,600));
      if (opts.length) {
        pickedType = await page.evaluate((type)=>{
          const norm = s => (s||'').replace(/\s+/g,' ').trim().toLowerCase();
          const list = Array.from(document.querySelectorAll('mat-option,[role="option"]'));
          let o = list.find(x => norm(x.innerText) === type.toLowerCase());
          if (!o) o = list.find(x => norm(x.innerText).includes(type.toLowerCase())) || list.find(x => /technical/i.test(x.innerText||''));
          if (o) { o.click(); return true; } return false;
        }, TYPE);
        console.log('type selected:', pickedType);
        if (pickedType) { await sleep(1200); break; }
        await page.keyboard.press('Escape').catch(()=>{});
      }
    }
    // 保存：对话框内按钮
    const saved = await page.evaluate(() => {
      const roots = Array.from(document.querySelectorAll('mat-dialog-container,[role="dialog"],.cdk-overlay-pane'));
      for (const r of roots) {
        const btns = Array.from(r.querySelectorAll('button')).filter(b=>!b.disabled);
        const t = btns.find(b => /^(save|save changes|add to orcid|add work)$/i.test((b.innerText||'').replace(/\s+/g,' ').trim()));
        if (t) { t.click(); return (t.innerText||'').replace(/\s+/g,' ').trim(); }
      }
      return null;
    });
    console.log('save clicked:', saved);
    await sleep(15000); await clean(page);
    await page.screenshot({path:'orcid-v9-after.png', fullPage:true}).catch(()=>{});
    await page.goto('https://orcid.org/my-orcid',{waitUntil:'domcontentloaded',timeout:90000});
    await sleep(7000);
    const after = await page.evaluate(()=>{const m=document.body.innerText.match(/Works\s*\((\d+)\)/);return m?+m[1]:-1;});
    console.log('works after:', after, '| RESULT:', before, '->', after);
  } catch(e){ console.error('FAILED:', e.message); await page.screenshot({path:'orcid-v9-fail.png',fullPage:true}).catch(()=>{}); process.exit(1);}
  finally { await browser.close(); }
})();
