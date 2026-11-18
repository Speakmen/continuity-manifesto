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

    // 选类型：用键盘在 Work type 下拉里选（比找 DOM 稳）
    const nSel = await page.locator('mat-select').count();
    console.log('mat-select count in page:', nSel);
    // 点击对话框里最后一个 mat-select（Work type 在"Work details"第一行）
    const dlg = page.locator('mat-dialog-container, [role="dialog"], .cdk-overlay-pane').last();
    // 诊断：把含 "Work type" 的那个 form-field 的 HTML 打出来，看清到底是什么控件
    const html = await page.evaluate(() => {
      const all = Array.from(document.querySelectorAll('mat-form-field, div, section'));
      const f = all.find(e => /Work type/.test(e.innerText || '') && (e.innerText || '').length < 120);
      return f ? f.outerHTML.slice(0, 900) : '(not found)';
    });
    console.log('WORKTYPE_HTML:', html);
    const ff = dlg.locator('mat-form-field').filter({ hasText: 'Work type' }).first();
    console.log('formfield count:', await ff.count());
    const selLoc = (await ff.count()) ? ff : dlg.locator('mat-select').first();
    if (await selLoc.count() > 0) {
      await selLoc.scrollIntoViewIfNeeded().catch(()=>{});
      await selLoc.click({ force: true }).catch(()=>{});
      await sleep(2000);
      const openOpts = await page.evaluate(()=>Array.from(document.querySelectorAll('mat-option,[role="option"]')).map(o=>(o.innerText||'').replace(/\s+/g,' ').trim()).filter(Boolean).slice(0,40));
      console.log('options opened:', JSON.stringify(openOpts).slice(0,700));
      if (openOpts.length === 0) {
        // 键盘兜底：打开后直接输入类型名首字，或方向键选择
        await page.keyboard.type(TYPE.slice(0, 4), { delay: 60 }).catch(()=>{});
        await sleep(800);
        await page.keyboard.press('Enter').catch(()=>{});
        await sleep(800);
        const chosen = await page.evaluate(()=>{const m=document.body.innerText.match(/Work type[^\n]{0,60}/);return m?m[0]:'';});
        console.log('after keyboard pick:', chosen);
      } else {
        const ok = await page.evaluate((type)=>{
          const norm=s=>(s||'').replace(/\s+/g,' ').trim().toLowerCase();
          const list=Array.from(document.querySelectorAll('mat-option,[role="option"]'));
          let o=list.find(x=>norm(x.innerText)===type.toLowerCase());
          if(!o) o=list.find(x=>norm(x.innerText).includes('technical'));
          if(o){o.click();return true;}return false;}, TYPE);
        console.log('type selected by click:', ok);
        await sleep(1000);
      }
    }
    // 保存（限定在对话框里）
    for (const sel of ['button:has-text("Save changes")','button:has-text("Save")']) {
      const b=page.locator('mat-dialog-container, [role="dialog"], .cdk-overlay-pane').last().locator(sel).last();
      if (await b.count()>0 && await b.isEnabled().catch(()=>false)) { await b.click().catch(()=>{}); console.log('save:', sel); break; }
    }
    await sleep(15000); await clean(page);
    await page.screenshot({path:'orcid-v9-after.png', fullPage:true}).catch(()=>{});
    await page.goto('https://orcid.org/my-orcid',{waitUntil:'domcontentloaded',timeout:90000});
    await sleep(7000);
    const after = await page.evaluate(()=>{const m=document.body.innerText.match(/Works\s*\((\d+)\)/);return m?+m[1]:-1;});
    console.log('works after:', after, '| RESULT:', before, '->', after);
  } catch(e){ console.error('FAILED:', e.message); await page.screenshot({path:'orcid-v9-fail.png',fullPage:true}).catch(()=>{}); process.exit(1);}
  finally { await browser.close(); }
})();
