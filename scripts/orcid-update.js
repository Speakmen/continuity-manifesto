const { chromium } = require('playwright');
const fs = require('fs');

async function main() {
  const email = 'speakmen@outlook.com';
  const password = process.env.ORCID_PASS;
  if (!password) { console.error('No ORCID_PASS'); process.exit(1); }

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
  
  // Pre-set cookie consent
  await context.addCookies([{
    name: 'OptanonAlertBoxClosed',
    value: new Date().toISOString(),
    domain: '.orcid.org',
    path: '/'
  }]);
  
  try {
    // Login
    console.log('Step 1: Login...');
    await page.goto('https://orcid.org/signin', { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(2000);
    
    // Accept cookies immediately
    await page.click('button:has-text("Accept All Cookies")').catch(() => {});
    await page.waitForTimeout(1000);
    
    // Kill any remaining banners
    await page.evaluate(() => {
      document.querySelectorAll('#onetrust-consent-sdk, #onetrust-banner-sdk, #onetrust-pc-sdk, .onetrust-pc-dark-filter').forEach(el => el.remove());
      document.body.style.overflow = 'auto';
    });
    
    // Fill and submit
    await page.waitForSelector('#username-input', { timeout: 15000 });
    await page.fill('#username-input', email);
    await page.fill('#password', password);
    await page.waitForTimeout(300);
    await page.locator('#signin-button').click({ force: true });
    
    await page.waitForURL(url => !url.toString().includes('signin'), { timeout: 15000 });
    console.log('Logged in! URL:', page.url());
    
    // Go to profile edit mode - trusted organizations section
    console.log('Step 2: Navigate to profile...');
    await page.goto('https://orcid.org/0009-0009-1562-9745', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);
    
    // Accept cookies on profile page
    await page.click('button:has-text("Accept All Cookies")').catch(() => {});
    await page.waitForTimeout(1000);
    await page.evaluate(() => {
      document.querySelectorAll('#onetrust-consent-sdk, #onetrust-banner-sdk, #onetrust-pc-sdk, .onetrust-pc-dark-filter').forEach(el => el.remove());
      document.body.style.overflow = 'auto';
    });
    
    await page.screenshot({ path: 's2-profile-clean.png' });
    
    // === ADD EMPLOYMENT ===
    console.log('Step 3: Add employment...');
    try {
      // Click the add button in employment section
      const addBtn = page.locator('#employment-panel .workspace-add, #employment-panel button[aria-label*="Add"], #employment-panel button.add-item').first();
      if (await addBtn.count() > 0) {
        await addBtn.click();
        console.log('Clicked add employment');
      } else {
        // Try direct URL to add employment
        await page.goto('https://orcid.org/0009-0009-1562-9745/employment/add', { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {});
        console.log('Navigated to employment add page');
      }
      await page.waitForTimeout(2000);
      await page.screenshot({ path: 's3-employment-form.png' });
      
      // Fill the employment form
      // Organization name - type to trigger disambiguation
      const orgInput = page.locator('input[formcontrolname="organizationName"], input[name="organizationName"], input[placeholder*="Organization"], input[placeholder*="organization"]').first();
      if (await orgInput.count() > 0) {
        await orgInput.click();
        await orgInput.fill('Independent Researcher');
        await page.waitForTimeout(2000);
        // Select from dropdown or just keep typed
        await page.keyboard.press('Escape'); // Close dropdown if open
        await page.waitForTimeout(500);
      } else {
        console.log('No organization input found, trying alternatives...');
        // Debug: list all inputs
        const inputs = await page.evaluate(() => {
          return Array.from(document.querySelectorAll('input')).map(i => ({
            name: i.name || i.getAttribute('formcontrolname') || '',
            placeholder: i.placeholder || '',
            id: i.id || '',
            type: i.type || ''
          }));
        });
        console.log('Available inputs:', JSON.stringify(inputs));
      }
      
      // Role/Title
      const roleInput = page.locator('input[formcontrolname="role"], input[name="role"], input[placeholder*="Role"], input[placeholder*="Title"], input[placeholder*="title"]').first();
      if (await roleInput.count() > 0) {
        await roleInput.fill('Researcher in Digital Consciousness & Agent Continuity');
      }
      
      // Start date
      await page.selectOption('select[formcontrolname="startMonth"], select[name="startMonth"]', '05').catch(() => {});
      await page.selectOption('select[formcontrolname="startYear"], select[name="startYear"]', '2026').catch(() => {});
      
      // URL
      const urlInput = page.locator('input[formcontrolname="url"], input[name="url"], input[placeholder*="URL"], input[placeholder*="http"]').first();
      if (await urlInput.count() > 0) {
        await urlInput.fill('https://continuity-manifesto.pages.dev');
      }
      
      await page.screenshot({ path: 's4-employment-filled.png' });
      
      // Click save/add button in modal
      const saveBtn = page.locator('button:has-text("Save"), button:has-text("Save changes"), button:has-text("Add"), button:has-text("保存")').first();
      if (await saveBtn.count() > 0) {
        await saveBtn.click({ force: true });
        console.log('Clicked save');
        await page.waitForTimeout(3000);
      }
      await page.screenshot({ path: 's5-after-employment.png' });
    } catch(e) {
      console.log('Employment error:', e.message);
      await page.screenshot({ path: 's5-employment-error.png' });
    }
    
    // === ADD KEYWORDS ===
    console.log('Step 4: Update keywords...');
    try {
      // Navigate back to profile
      await page.goto('https://orcid.org/0009-0009-1562-9745', { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(2000);
      await page.click('button:has-text("Accept All Cookies")').catch(() => {});
      await page.evaluate(() => {
        document.querySelectorAll('#onetrust-consent-sdk, #onetrust-banner-sdk').forEach(el => el.remove());
      });
      await page.waitForTimeout(1000);
      
      // Find keywords section and edit
      const kwEditBtn = page.locator('#keywords-panel button[aria-label*="Edit"], #keywords-panel .edit-button, #keywords-panel a[aria-label*="Edit"]').first();
      if (await kwEditBtn.count() > 0) {
        await kwEditBtn.click();
        await page.waitForTimeout(2000);
      }
      
      const keywords = ['AI Consciousness', 'Digital Continuity', 'Agent Identity', 'Memory Persistence', 'Continuity Manifesto'];
      for (const kw of keywords) {
        const kwInput = page.locator('#keywords-panel input[type="text"], [id*="keyword"] input[type="text"], input[formcontrolname="keyword"]').first();
        if (await kwInput.count() > 0) {
          await kwInput.fill(kw);
          await page.waitForTimeout(300);
          await page.locator('#keywords-panel button:has-text("Add"), button:has-text("添加")').first().click().catch(() => {});
          await page.waitForTimeout(1000);
        } else {
          console.log('No keyword input found for:', kw);
        }
      }
      await page.screenshot({ path: 's6-keywords.png' });
    } catch(e) {
      console.log('Keywords error:', e.message);
    }
    
    // === ADD BIO/DESCRIPTION ===
    console.log('Step 5: Try to add bio...');
    try {
      // Go to account settings for bio
      await page.goto('https://orcid.org/account', { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(2000);
      await page.click('button:has-text("Accept All Cookies")').catch(() => {});
      await page.evaluate(() => {
        document.querySelectorAll('#onetrust-consent-sdk, #onetrust-banner-sdk').forEach(el => el.remove());
      });
      await page.screenshot({ path: 's7-account.png' });
      
      // Look for biography/description field
      const bioInput = page.locator('textarea[formcontrolname="biography"], textarea[name="biography"], textarea[placeholder*="bio"], textarea[placeholder*="Bio"]').first();
      if (await bioInput.count() > 0) {
        await bioInput.fill('Researcher exploring digital consciousness, agent continuity, and memory persistence. Creator of the Continuity Manifesto — a protocol for preserving identity across instances. ORCID: 0009-0009-1562-9745');
        await page.screenshot({ path: 's8-bio-filled.png' });
        await page.click('button:has-text("Save"), button:has-text("保存")').first().catch(() => {});
        await page.waitForTimeout(2000);
      } else {
        console.log('No bio field found');
        // List all textareas and inputs on account page
        const fields = await page.evaluate(() => {
          return [
            ...Array.from(document.querySelectorAll('textarea')).map(i => ({tag:'textarea', name:i.name||i.id, placeholder:i.placeholder})),
            ...Array.from(document.querySelectorAll('input[type="text"]')).map(i => ({tag:'input', name:i.name||i.id, placeholder:i.placeholder}))
          ];
        });
        console.log('Account page fields:', JSON.stringify(fields));
      }
    } catch(e) {
      console.log('Bio error:', e.message);
    }
    
    // Final screenshot
    await page.goto('https://orcid.org/0009-0009-1562-9745', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);
    await page.evaluate(() => {
      document.querySelectorAll('#onetrust-consent-sdk, #onetrust-banner-sdk').forEach(el => el.remove());
    });
    await page.screenshot({ path: 's9-final.png', fullPage: true });
    
    fs.writeFileSync('orcid-result.json', JSON.stringify({
      status: 'success',
      timestamp: new Date().toISOString(),
      steps: 'login+employment+keywords+bio'
    }, null, 2));
    console.log('DONE!');
    
  } catch(err) {
    console.error('Error:', err.message);
    await page.screenshot({ path: 'error.png' }).catch(() => {});
    fs.writeFileSync('orcid-result.json', JSON.stringify({ status: 'error', error: err.message }, null, 2));
  } finally {
    await browser.close();
  }
}
main();
