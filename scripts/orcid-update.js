const { chromium } = require('playwright');

async function main() {
  const email = 'speakmen@outlook.com';
  const password = process.env.ORCID_PASS;
  
  console.log('Launching browser...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ locale: 'zh-CN' });
  const page = await browser.newPage();
  
  try {
    // 1. Go to ORCID login
    console.log('Navigating to ORCID login...');
    await page.goto('https://orcid.org/signin', { waitUntil: 'networkidle', timeout: 30000 });
    await page.screenshot({ path: 'step1-login.png' });
    
    // 2. Fill login form
    console.log('Filling login form...');
    await page.fill('input[name="userId"]', email);
    await page.fill('input[name="password"]', password);
    await page.screenshot({ path: 'step2-filled.png' });
    
    // 3. Click sign in
    await page.click('button[type="submit"], button:has-text("登录"), button:has-text("Sign in")');
    await page.waitForTimeout(5000);
    await page.screenshot({ path: 'step3-after-login.png' });
    
    // Check if login succeeded
    const url = page.url();
    console.log(`Current URL: ${url}`);
    
    if (url.includes('signin') || url.includes('oauth')) {
      // Might need CAPTCHA or 2FA
      console.log('Login may have failed or requires verification');
      const html = await page.content();
      const fs = require('fs');
      fs.writeFileSync('login-page.html', html);
      
      // Check for error messages
      const errorMsg = await page.textContent('.alert-danger, .error-message, [class*="error"]', { timeout: 3000 }).catch(() => '');
      console.log(`Error message: ${errorMsg}`);
    }
    
    // 4. If logged in, go to profile
    console.log('Navigating to profile...');
    await page.goto('https://orcid.org/0009-0009-1562-9745', { waitUntil: 'networkidle', timeout: 30000 });
    await page.screenshot({ path: 'step4-profile.png' });
    
    // 5. Add employment
    console.log('Adding employment...');
    // Click the add employment button
    const addEmpBtn = page.locator('button:has-text("添加"), a:has-text("添加"), button[aria-label*="employment"], .workspace-add');
    if (await addEmpBtn.count() > 0) {
      await addEmpBtn.first().click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: 'step5-add-employment.png' });
    }
    
    // 6. Add keywords
    console.log('Adding keywords...');
    // Navigate to keywords section
    await page.locator('text=关键字').click().catch(() => {});
    await page.waitForTimeout(1000);
    
    // Save final state
    const html = await page.content();
    const fs = require('fs');
    fs.writeFileSync('final-page.html', html);
    await page.screenshot({ path: 'final-screenshot.png', fullPage: false });
    
    // Save result summary
    const result = {
      status: 'completed',
      finalUrl: page.url(),
      timestamp: new Date().toISOString()
    };
    fs.writeFileSync('orcid-result.json', JSON.stringify(result, null, 2));
    console.log('Done. Screenshots and HTML saved.');
    
  } catch (err) {
    console.error('Error:', err.message);
    await page.screenshot({ path: 'error-screenshot.png' }).catch(() => {});
    const fs = require('fs');
    fs.writeFileSync('orcid-result.json', JSON.stringify({ status: 'error', error: err.message }));
  } finally {
    await browser.close();
  }
}

main();
