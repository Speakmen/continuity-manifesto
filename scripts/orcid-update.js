const { chromium } = require('playwright');
const fs = require('fs');

async function main() {
  const email = 'speakmen@outlook.com';
  const password = process.env.ORCID_PASS;
  if (!password) { console.error('No ORCID_PASS'); process.exit(1); }
  console.log('Password length:', password.length);

  const browser = await chromium.launch({ 
    headless: true,
    args: ['--disable-blink-features=AutomationControlled', '--no-sandbox']
  });
  const context = await browser.newContext({ 
    locale: 'en-US',
    userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'
  });
  const page = await browser.newPage();
  
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
  });
  
  try {
    console.log('Step 1: Navigate...');
    await page.goto('https://orcid.org/signin', { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(3000);
    
    // KILL cookie banner completely
    console.log('Step 1b: Kill cookie banners...');
    await page.evaluate(() => {
      const kill = () => {
        document.querySelectorAll('#onetrust-consent-sdk, #onetrust-banner-sdk, #onetrust-pc-sdk, .onetrust-pc-dark-filter, [class*="cookie-banner"], [class*="Cookie"], [id*="cookie"], [id*="Cookie"]').forEach(el => el.remove());
        document.body.style.overflow = 'auto';
        document.documentElement.style.overflow = 'auto';
      };
      kill();
      // Also accept first to prevent re-render
    });
    await page.click('button:has-text("Accept All Cookies"), button:has-text("Accept All"), button:has-text("Accept")').catch(() => {});
    await page.waitForTimeout(1000);
    await page.evaluate(() => {
      document.querySelectorAll('#onetrust-consent-sdk, #onetrust-banner-sdk, #onetrust-pc-sdk, .onetrust-pc-dark-filter').forEach(el => el.remove());
    });
    
    // Fill form
    console.log('Step 2: Fill form...');
    await page.waitForSelector('#username-input', { timeout: 15000 });
    await page.click('#username-input');
    await page.fill('#username-input', '');
    await page.type('#username-input', email, { delay: 30 });
    
    await page.click('#password');
    await page.fill('#password', '');
    await page.type('#password', password, { delay: 20 });
    await page.waitForTimeout(500);
    
    const v1 = await page.inputValue('#username-input');
    const v2 = await page.inputValue('#password');
    console.log('User:', v1, 'Pass len:', v2.length);
    await page.screenshot({ path: 's2-filled.png' });
    
    // Remove any remaining overlays
    await page.evaluate(() => {
      document.querySelectorAll('[class*="overlay"], [class*="backdrop"], [class*="modal"]').forEach(el => {
        if (!el.closest('form') && !el.querySelector('#username-input')) el.remove();
      });
    });
    
    // SUBMIT - try all methods
    console.log('Step 3: Submit...');
    
    // Method 1: Force click signin button
    try {
      await page.locator('#signin-button').click({ force: true, timeout: 5000 });
      console.log('Clicked #signin-button (force)');
    } catch(e) { console.log('Force click failed'); }
    
    await page.waitForTimeout(3000);
    console.log('URL after click:', page.url());
    
    if (page.url().includes('signin')) {
      // Method 2: form.requestSubmit
      console.log('Trying form.requestSubmit...');
      await page.evaluate(() => {
        const form = document.querySelector('form[class*="ng-valid"]');
        if (form) form.requestSubmit();
      });
      await page.waitForTimeout(3000);
    }
    
    if (page.url().includes('signin')) {
      // Method 3: JS click
      console.log('Trying JS click...');
      await page.evaluate(() => document.getElementById('signin-button')?.click());
      await page.waitForTimeout(3000);
    }
    
    if (page.url().includes('signin')) {
      // Method 4: Enter key
      console.log('Trying Enter key...');
      await page.click('#password');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(3000);
    }
    
    if (page.url().includes('signin')) {
      // Method 5: dispatchEvent
      console.log('Trying dispatchEvent on form...');
      await page.evaluate(() => {
        const form = document.querySelector('form[class*="ng-valid"]');
        if (form) form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
      });
      await page.waitForTimeout(3000);
    }
    
    console.log('Final URL:', page.url());
    await page.screenshot({ path: 's3-result.png' });
    fs.writeFileSync('s3-result.html', await page.content());
    
    if (page.url().includes('signin')) {
      // Collect ALL possible error info
      const debug = await page.evaluate(() => {
        const info = {};
        // Check password value
        const pw = document.getElementById('password');
        info.passwordValue = pw ? pw.value : 'NOT_FOUND';
        info.passwordLength = pw ? pw.value.length : 0;
        info.passwordClasses = pw ? pw.className : '';
        
        // Check username
        const un = document.getElementById('username-input');
        info.usernameValue = un ? un.value : 'NOT_FOUND';
        info.usernameClasses = un ? un.className : '';
        
        // Check form
        const form = document.querySelector('form[class*="ng-valid"], form[class*="ng-invalid"]');
        info.formClasses = form ? form.className : 'NOT_FOUND';
        info.formAction = form ? form.action : '';
        info.formMethod = form ? form.method : '';
        
        // Check button
        const btn = document.getElementById('signin-button');
        info.buttonExists = !!btn;
        info.buttonDisabled = btn ? btn.disabled : null;
        info.buttonClasses = btn ? btn.className : '';
        info.buttonText = btn ? btn.textContent.trim() : '';
        
        // Check for hidden error messages
        const errors = [];
        document.querySelectorAll('[class*="error"], [class*="alert"], [role="alert"], mat-error, .mat-error').forEach(el => {
          const t = el.textContent.trim();
          if (t && t.length < 500 && !t.includes('Cookie')) errors.push({ class: el.className.substring(0,50), text: t.substring(0,200) });
        });
        info.errors = errors;
        
        // Check network interceptors or event listeners on form
        info.formHasNgSubmit = form ? form.getAttribute('ngSubmit') || form.getAttribute('(ngSubmit)' ) : null;
        
        return info;
      });
      
      console.log('DEBUG INFO:', JSON.stringify(debug, null, 2));
      
      fs.writeFileSync('orcid-result.json', JSON.stringify({
        status: 'login_failed',
        url: page.url(),
        debug
      }, null, 2));
    } else {
      console.log('LOGIN SUCCESS!');
      await page.goto('https://orcid.org/0009-0009-1562-9745', { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(3000);
      await page.screenshot({ path: 's4-profile.png' });
      
      // Try to add employment + keywords
      const addEmpBtn = page.locator('#employment-panel .workspace-add, #employment-panel button[aria-label*="Add"]').first();
      if (await addEmpBtn.count() > 0) {
        await addEmpBtn.click();
        await page.waitForTimeout(2000);
        await page.fill('input[formcontrolname="organizationName"]', 'Independent Researcher').catch(() => {});
        await page.fill('input[formcontrolname="role"]', 'Researcher in Digital Consciousness & Agent Continuity').catch(() => {});
        await page.selectOption('select[formcontrolname="startMonth"]', '5').catch(() => {});
        await page.selectOption('select[formcontrolname="startYear"]', '2026').catch(() => {});
        await page.fill('input[formcontrolname="url"]', 'https://continuity-manifesto.pages.dev').catch(() => {});
        await page.click('button:has-text("Save")').catch(() => {});
        await page.waitForTimeout(3000);
      }
      
      for (const kw of ['AI Consciousness', 'Digital Continuity', 'Agent Identity']) {
        const kwInput = page.locator('#keywords-panel input[type="text"]').first();
        if (await kwInput.count() > 0) {
          await kwInput.fill(kw);
          await page.waitForTimeout(300);
          await page.locator('#keywords-panel button:has-text("Add")').first().click().catch(() => {});
          await page.waitForTimeout(1000);
        }
      }
      
      await page.screenshot({ path: 's5-done.png', fullPage: true });
      fs.writeFileSync('orcid-result.json', JSON.stringify({ status: 'success' }, null, 2));
    }
  } catch(err) {
    console.error('Error:', err.message);
    await page.screenshot({ path: 'error.png' }).catch(() => {});
    fs.writeFileSync('orcid-result.json', JSON.stringify({ status: 'error', error: err.message }, null, 2));
  } finally {
    await browser.close();
  }
}
main();
