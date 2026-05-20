const { chromium } = require('playwright');

async function main() {
  const email = 'speakmen@outlook.com';
  const password = process.env.ORCID_PASS;
  
  console.log('Launching browser...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ locale: 'zh-CN' });
  const page = await browser.newPage();
  
  try {
    // 1. Go to ORCID signin
    console.log('Step 1: Navigate to ORCID signin...');
    await page.goto('https://orcid.org/signin', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'step1-login-page.png' });
    
    // Save page HTML for debugging
    const fs = require('fs');
    let html = await page.content();
    fs.writeFileSync('step1-login.html', html);
    
    // Log current URL
    console.log('Current URL:', page.url());
    console.log('Page title:', await page.title());
    
    // 2. Try multiple selectors for email/password fields
    console.log('Step 2: Finding login form...');
    
    // Try various possible selectors
    const emailSelectors = [
      'input[name="userId"]',
      'input[name="username"]', 
      'input[name="email"]',
      'input[type="email"]',
      'input[id*="user"]',
      'input[id*="email"]',
      'input[formcontrolname*="user"]',
      'input[formcontrolname*="email"]',
      'input[placeholder*="email"]',
      'input[placeholder*="ORCID"]',
    ];
    
    const passSelectors = [
      'input[name="password"]',
      'input[type="password"]',
      'input[id*="password"]',
      'input[formcontrolname*="password"]',
    ];
    
    let emailInput = null;
    for (const sel of emailSelectors) {
      const count = await page.locator(sel).count();
      if (count > 0) {
        console.log(`Found email field: ${sel}`);
        emailInput = sel;
        break;
      }
    }
    
    let passInput = null;
    for (const sel of passSelectors) {
      const count = await page.locator(sel).count();
      if (count > 0) {
        console.log(`Found password field: ${sel}`);
        passInput = sel;
        break;
      }
    }
    
    if (!emailInput || !passInput) {
      console.log('Could not find login form. Saving page for inspection...');
      // Try to find all inputs
      const allInputs = await page.locator('input').all();
      for (let i = 0; i < allInputs.length; i++) {
        const input = allInputs[i];
        const attrs = await input.evaluate(el => ({
          name: el.name, type: el.type, id: el.id, placeholder: el.placeholder,
          formControlName: el.getAttribute('formcontrolname')
        }));
        console.log(`Input ${i}:`, JSON.stringify(attrs));
      }
      
      fs.writeFileSync('orcid-result.json', JSON.stringify({
        status: 'login_form_not_found',
        url: page.url(),
        title: await page.title()
      }, null, 2));
      return;
    }
    
    // 3. Fill and submit
    console.log('Step 3: Filling credentials...');
    await page.fill(emailInput, email);
    await page.fill(passInput, password);
    await page.screenshot({ path: 'step2-filled.png' });
    
    // Find and click submit button
    const submitSelectors = [
      'button[type="submit"]',
      'button:has-text("Sign in")',
      'button:has-text("登录")',
      'input[type="submit"]',
      '#signin-button',
    ];
    
    for (const sel of submitSelectors) {
      const count = await page.locator(sel).count();
      if (count > 0) {
        console.log(`Clicking submit: ${sel}`);
        await page.click(sel);
        break;
      }
    }
    
    await page.waitForTimeout(5000);
    await page.screenshot({ path: 'step3-after-login.png' });
    console.log('After login URL:', page.url());
    
    // Check login result
    const afterUrl = page.url();
    html = await page.content();
    fs.writeFileSync('step3-after-login.html', html);
    
    if (afterUrl.includes('signin') && !afterUrl.includes('0009')) {
      // Still on login page - might have error or CAPTCHA
      const errorText = await page.locator('.alert, .error, [class*="error"], [class*="alert"]').textContent({ timeout: 3000 }).catch(() => 'no error text found');
      console.log('Login may have failed. Error:', errorText);
      
      fs.writeFileSync('orcid-result.json', JSON.stringify({
        status: 'login_failed',
        url: afterUrl,
        error: typeof errorText === 'string' ? errorText.substring(0, 500) : 'unknown'
      }, null, 2));
      return;
    }
    
    // 4. Navigate to profile and add data
    console.log('Step 4: Navigating to profile...');
    await page.goto('https://orcid.org/0009-0009-1562-9745', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'step4-profile.png' });
    
    fs.writeFileSync('orcid-result.json', JSON.stringify({
      status: 'logged_in_successfully',
      url: page.url(),
      timestamp: new Date().toISOString()
    }, null, 2));
    
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
