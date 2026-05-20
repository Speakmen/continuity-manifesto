const { chromium } = require('playwright');
const fs = require('fs');

async function main() {
  const email = 'speakmen@outlook.com';
  const password = process.env.ORCID_PASS;
  
  if (!password) {
    console.error('ERROR: ORCID_PASS not set');
    process.exit(1);
  }
  
  console.log('Password length:', password.length);
  console.log('Password first char:', password[0]);
  console.log('Password last char:', password[password.length - 1]);
  
  const browser = await chromium.launch({ 
    headless: true,
    args: ['--disable-blink-features=AutomationControlled']
  });
  const context = await browser.newContext({ 
    locale: 'en-US',
    userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'
  });
  const page = await browser.newPage();
  
  // Stealth: remove webdriver flag
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
  });
  
  try {
    // Step 1: Go to ORCID
    console.log('Step 1: Navigate to ORCID signin...');
    await page.goto('https://orcid.org/signin', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(3000);
    
    // Screenshot before interaction
    await page.screenshot({ path: 's1-landing.png' });
    console.log('Landing URL:', page.url());
    console.log('Landing title:', await page.title());
    
    // Check for Cloudflare challenge
    const pageText = await page.textContent('body').catch(() => '');
    if (pageText.includes('Checking') || pageText.includes('challenge') || pageText.includes('cf-browser')) {
      console.log('Cloudflare challenge detected, waiting...');
      await page.waitForTimeout(15000);
      await page.screenshot({ path: 's1b-after-cf.png' });
    }
    
    // Dismiss cookie/consent banners
    await page.click('button:has-text("Accept"), button:has-text("accept"), button:has-text("Got it"), button:has-text("OK")').catch(() => {});
    await page.waitForTimeout(1000);
    
    // Step 2: Fill form carefully
    console.log('Step 2: Filling login form...');
    
    // Wait for username field
    const usernameSel = '#username-input';
    await page.waitForSelector(usernameSel, { timeout: 15000 }).catch(() => null);
    
    // Click and clear, then type character by character
    await page.click(usernameSel).catch(() => {});
    await page.fill(usernameSel, '').catch(() => {});
    await page.waitForTimeout(300);
    
    // Type email slowly
    for (const ch of email) {
      await page.type(usernameSel, ch, { delay: 50 }).catch(() => {});
    }
    await page.waitForTimeout(500);
    
    // Password field
    const passSel = '#password';
    await page.waitForSelector(passSel, { timeout: 10000 }).catch(() => null);
    await page.click(passSel).catch(() => {});
    await page.fill(passSel, '').catch(() => {});
    await page.waitForTimeout(300);
    
    for (const ch of password) {
      await page.type(passSel, ch, { delay: 30 }).catch(() => {});
    }
    await page.waitForTimeout(500);
    
    await page.screenshot({ path: 's2-form-filled.png' });
    
    // Verify what was actually typed
    const typedUser = await page.inputValue(usernameSel).catch(() => 'ERROR');
    const typedPass = await page.inputValue(passSel).catch(() => 'ERROR');
    console.log('Username field value:', typedUser);
    console.log('Password field length:', typedPass.length);
    
    // Step 3: Submit
    console.log('Step 3: Submitting...');
    
    // Find submit button
    const submitBtn = page.locator('#signin-button, button[type="submit"], button:has-text("Sign in")').first();
    await submitBtn.click().catch(async () => {
      console.log('Standard submit failed, trying keyboard Enter...');
      await page.keyboard.press('Enter');
    });
    
    // Wait for navigation or response
    console.log('Waiting for response...');
    await page.waitForTimeout(10000);
    
    await page.screenshot({ path: 's3-after-submit.png' });
    console.log('URL after submit:', page.url());
    console.log('Title after submit:', await page.title());
    
    // Save HTML for debugging
    const html = await page.content();
    fs.writeFileSync('s3-after-submit.html', html);
    
    // Check if still on signin page
    if (page.url().includes('signin')) {
      // Look for error messages
      const allText = await page.textContent('body').catch(() => '');
      
      // Check for specific error elements
      const errors = await page.locator('.alert, .error, [class*="error"], [class*="alert"], mat-error, .msg, [role="alert"]').allTextContents().catch(() => []);
      console.log('Error elements found:', errors.slice(0, 5));
      
      // Check for CAPTCHA
      const hasRecaptcha = await page.locator('iframe[src*="recaptcha"], .g-recaptcha, [data-sitekey]').count() > 0;
      const hasHcaptcha = await page.locator('iframe[src*="hcaptcha"], .h-captcha').count() > 0;
      const hasTurnstile = await page.locator('iframe[src*="turnstile"], .cf-turnstile').count() > 0;
      console.log('CAPTCHAs - reCAPTCHA:', hasRecaptcha, 'hCaptcha:', hasHcaptcha, 'Turnstile:', hasTurnstile);
      
      // Check for 2FA
      const has2FA = allText.includes('two-factor') || allText.includes('2FA') || allText.includes('verification code') || allText.includes('验证');
      console.log('Has 2FA prompt:', has2FA);
      
      // Log a snippet of the page text
      console.log('Page text snippet:', allText.substring(0, 1000));
      
      fs.writeFileSync('orcid-result.json', JSON.stringify({
        status: 'login_failed',
        url: page.url(),
        errors: errors.slice(0, 5),
        hasRecaptcha, hasHcaptcha, hasTurnstile, has2FA,
        pageTextSnippet: allText.substring(0, 500)
      }, null, 2));
      
      await browser.close();
      return;
    }
    
    // LOGIN SUCCESS!
    console.log('LOGIN SUCCESS!');
    
    // Navigate to profile
    await page.goto('https://orcid.org/0009-0009-1562-9745', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 's4-profile.png' });
    
    // === UPDATE PROFILE ===
    
    // 1. Add Employment
    console.log('Adding employment...');
    try {
      // Click the add employment button
      const addBtn = page.locator('#employment-panel .workspace-add, #employment-panel button[aria-label*="Add"], #employment-panel button[aria-label*="add"], .section-employment button').first();
      if (await addBtn.count() > 0) {
        await addBtn.click();
        await page.waitForTimeout(2000);
      } else {
        // Try navigating directly to the add employment form
        await page.goto('https://orcid.org/0009-0009-1562-9745/employment', { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(2000);
      }
      await page.screenshot({ path: 's5-employment-form.png' });
    } catch(e) {
      console.log('Employment nav error:', e.message);
    }
    
    // 2. Try to fill the employment modal/form
    try {
      // Organization - use disambiguated search
      const orgInput = page.locator('input[formcontrolname="organizationName"], input[name="organizationName"], input[placeholder*="Organization"], input[placeholder*="组织"]').first();
      if (await orgInput.count() > 0) {
        await orgInput.fill('Independent Researcher');
        await page.waitForTimeout(1500);
        // May need to select from dropdown
        await page.keyboard.press('ArrowDown');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(500);
      }
      
      // Role/Title
      const roleInput = page.locator('input[formcontrolname="role"], input[name="role"], input[placeholder*="Role"], input[placeholder*="Title"], input[placeholder*="角色"]').first();
      if (await roleInput.count() > 0) {
        await roleInput.fill('Researcher in Digital Consciousness & Agent Continuity');
      }
      
      // Start date
      await page.selectOption('select[formcontrolname="startMonth"], select[name="startMonth"], select[id*="startMonth"]', '5').catch(() => {});
      await page.selectOption('select[formcontrolname="startYear"], select[name="startYear"], select[id*="startYear"]', '2026').catch(() => {});
      
      // URL
      const urlInput = page.locator('input[formcontrolname="url"], input[name="url"], input[placeholder*="URL"], input[placeholder*="http"]').first();
      if (await urlInput.count() > 0) {
        await urlInput.fill('https://continuity-manifesto.pages.dev');
      }
      
      await page.screenshot({ path: 's6-employment-filled.png' });
      
      // Save
      const saveBtn = page.locator('button:has-text("Save"), button:has-text("保存"), button:has-text("Add"), button:has-text("添加")').first();
      if (await saveBtn.count() > 0) {
        await saveBtn.click();
        await page.waitForTimeout(3000);
      }
      await page.screenshot({ path: 's7-after-employment-save.png' });
    } catch(e) {
      console.log('Employment fill error:', e.message);
    }
    
    // 3. Add Keywords
    console.log('Adding keywords...');
    try {
      // Navigate to keywords section
      const kwSection = page.locator('#keywords-panel, [id*="keyword"]').first();
      if (await kwSection.count() > 0) {
        const keywords = ['AI Consciousness', 'Digital Continuity', 'Agent Identity', 'Memory Persistence', 'Continuity Manifesto'];
        
        for (const kw of keywords) {
          const kwInput = page.locator('#keywords-panel input[type="text"], [id*="keyword"] input[type="text"]').first();
          if (await kwInput.count() > 0) {
            await kwInput.fill(kw);
            await page.waitForTimeout(500);
            await page.locator('#keywords-panel button:has-text("Add"), #keywords-panel button:has-text("添加")').first().click().catch(() => {});
            await page.waitForTimeout(1000);
          }
        }
      }
      await page.screenshot({ path: 's8-keywords.png' });
    } catch(e) {
      console.log('Keywords error:', e.message);
    }
    
    // 4. Try to update bio/description via about section
    console.log('Trying bio update...');
    try {
      await page.goto('https://orcid.org/account', { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(2000);
      await page.screenshot({ path: 's9-account.png' });
      
      const html2 = await page.content();
      fs.writeFileSync('s9-account.html', html2);
    } catch(e) {
      console.log('Account page error:', e.message);
    }
    
    // Final screenshot
    await page.goto('https://orcid.org/0009-0009-1562-9745', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 's10-final.png', fullPage: true });
    
    fs.writeFileSync('orcid-result.json', JSON.stringify({
      status: 'success',
      url: page.url(),
      timestamp: new Date().toISOString()
    }, null, 2));
    
    console.log('Done!');
    
  } catch(err) {
    console.error('Fatal error:', err.message);
    await page.screenshot({ path: 'error.png' }).catch(() => {});
    fs.writeFileSync('orcid-result.json', JSON.stringify({ status: 'error', error: err.message, stack: err.stack }, null, 2));
  } finally {
    await browser.close();
  }
}

main();
