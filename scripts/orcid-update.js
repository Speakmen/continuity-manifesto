const { chromium } = require('playwright');

async function main() {
  const email = 'speakmen@outlook.com';
  const password = process.env.ORCID_PASS;
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ locale: 'zh-CN' });
  const page = await browser.newPage();
  const fs = require('fs');
  
  try {
    console.log('Step 1: Navigate to ORCID signin...');
    await page.goto('https://orcid.org/signin', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);
    
    // Dismiss cookie banner if present
    await page.click('button:has-text("Accept"), button:has-text("accept"), button:has-text("接受")').catch(() => {});
    await page.waitForTimeout(1000);
    
    console.log('Step 2: Filling login form...');
    // Use the actual IDs found
    await page.click('#username-input');
    await page.fill('#username-input', email);
    await page.waitForTimeout(500);
    
    await page.click('#password');
    await page.fill('#password', password);
    await page.waitForTimeout(500);
    
    await page.screenshot({ path: 'step2-filled.png' });
    
    // Click sign in button
    console.log('Step 3: Clicking sign in...');
    await page.click('button[type="submit"], button:has-text("Sign in"), button:has-text("登录")').catch(async () => {
      // Try finding button by text
      const btn = page.locator('button').filter({ hasText: /sign.?in|登录/i });
      if (await btn.count() > 0) await btn.first().click();
    });
    
    await page.waitForTimeout(8000);
    await page.screenshot({ path: 'step3-after-login.png' });
    console.log('URL after login:', page.url());
    
    // Check result
    const html = await page.content();
    fs.writeFileSync('step3-after-login.html', html);
    
    if (page.url().includes('signin')) {
      // Login failed - check for error
      const errorEl = await page.locator('.alert-danger, [class*="error-message"], mat-error, .msg').first().textContent({ timeout: 3000 }).catch(() => '');
      console.log('Login failed. Error text:', errorEl);
      
      // Also check for CAPTCHA
      const hasCaptcha = await page.locator('iframe[src*="recaptcha"], iframe[src*="hcaptcha"], .cf-turnstile').count() > 0;
      console.log('Has CAPTCHA:', hasCaptcha);
      
      fs.writeFileSync('orcid-result.json', JSON.stringify({
        status: 'login_failed',
        url: page.url(),
        error: (typeof errorEl === 'string' ? errorEl : '').substring(0, 500),
        hasCaptcha
      }, null, 2));
      return;
    }
    
    // Login succeeded!
    console.log('Login successful! Navigating to profile...');
    await page.goto('https://orcid.org/0009-0009-1562-9745', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'step4-profile.png' });
    
    // === ADD EMPLOYMENT ===
    console.log('Adding employment...');
    // Find and click the add button in employment section
    const addEmployment = page.locator('#employment-panel button, [id*="employment"] button, .section-add-employment').first();
    await addEmployment.click().catch(() => console.log('Could not click add employment'));
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'step5-employment-form.png' });
    
    // Fill employment form
    // Organization name
    await page.fill('input[formcontrolname="organizationName"], input[name="organizationName"], input[placeholder*="组织"], input[placeholder*="Organization"]', 'Independent Researcher').catch(() => {});
    await page.waitForTimeout(1000);
    
    // Role
    await page.fill('input[formcontrolname="role"], input[name="role"], input[placeholder*="角色"], input[placeholder*="Role"]', 'Researcher').catch(() => {});
    
    // Start date
    await page.selectOption('select[formcontrolname="startMonth"], select[name="startMonth"]', '5').catch(() => {});
    await page.selectOption('select[formcontrolname="startYear"], select[name="startYear"]', '2026').catch(() => {});
    
    await page.screenshot({ path: 'step6-employment-filled.png' });
    
    // Save
    await page.click('button:has-text("Save"), button:has-text("保存"), button:has-text("Add"), button:has-text("添加")').catch(() => {});
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'step7-after-employment.png' });
    
    // === ADD KEYWORDS ===
    console.log('Adding keywords...');
    const keywords = ['AI Consciousness', 'Digital Continuity', 'Agent Identity', 'Memory Persistence', 'Continuity Manifesto'];
    
    for (const kw of keywords) {
      // Find keyword input
      const kwInput = page.locator('#keywords-panel input, [id*="keyword"] input[type="text"]').first();
      if (await kwInput.count() > 0) {
        await kwInput.fill(kw);
        await page.waitForTimeout(500);
        // Click add/save keyword
        await page.click('#keywords-panel button:has-text("Add"), #keywords-panel button:has-text("添加"), #keywords-panel button:has-text("Save")').catch(() => {});
        await page.waitForTimeout(1000);
      }
    }
    await page.screenshot({ path: 'step8-keywords.png' });
    
    // Final screenshot
    await page.screenshot({ path: 'final-profile.png', fullPage: false });
    
    fs.writeFileSync('orcid-result.json', JSON.stringify({
      status: 'success',
      url: page.url(),
      timestamp: new Date().toISOString()
    }, null, 2));
    
    console.log('ORCID profile update completed!');
    
  } catch (err) {
    console.error('Error:', err.message);
    await page.screenshot({ path: 'error-screenshot.png' }).catch(() => {});
    fs.writeFileSync('orcid-result.json', JSON.stringify({ status: 'error', error: err.message }));
  } finally {
    await browser.close();
  }
}

main();
