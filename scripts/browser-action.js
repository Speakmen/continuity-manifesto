// Headless Chrome代理脚本 - 用于需要JS渲染的页面
const { chromium } = require('playwright');

async function main() {
  const url = process.argv[2] || 'https://www.google.com';
  const action = process.argv[3] || 'screenshot'; // screenshot | html | click
  const selector = process.argv[4] || null;

  console.log(`Browser action: ${action} on ${url}`);
  
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    console.log('Page loaded');
    
    const fs = require('fs');
    
    if (action === 'screenshot') {
      await page.screenshot({ path: 'screenshot.png', fullPage: false });
      console.log('Screenshot saved');
    }
    
    if (action === 'html' || action === 'screenshot') {
      const html = await page.content();
      fs.writeFileSync('page.html', html);
      console.log('HTML saved');
      
      const title = await page.title();
      const output = {
        url,
        title,
        htmlLength: html.length,
        timestamp: new Date().toISOString()
      };
      fs.writeFileSync('browser-result.json', JSON.stringify(output, null, 2));
    }
    
    if (action === 'click' && selector) {
      await page.click(selector);
      await page.waitForTimeout(2000);
      await page.screenshot({ path: 'after-click.png' });
      const html = await page.content();
      const fs = require('fs');
      fs.writeFileSync('after-click.html', html);
      console.log('Click performed, screenshot and HTML saved');
    }
    
  } catch (err) {
    console.error('Browser action failed:', err.message);
  } finally {
    await browser.close();
  }
}

main();
