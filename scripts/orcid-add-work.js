// orcid-add-work.js —— 按 DOI 往 ORCID 记录里加一条作品（在 GitHub Actions 里跑，境外网络）
// 用法：node scripts/orcid-add-work.js <DOI> [WORK_TYPE]
const { chromium } = require('playwright');

const ORCID = '0009-0009-1562-9745';
const EMAIL = 'speakmen@outlook.com';
const DOI = process.argv[2] || '';
const TYPE = process.argv[3] || 'technical-note';
const TITLE = process.argv[4] || '';

async function main() {
  const password = process.env.ORCID_PASS;
  if (!password) { console.error('No ORCID_PASS'); process.exit(1); }
  if (!DOI) { console.error('No DOI'); process.exit(1); }
  const browser = await chromium.launch({ headless: true,
    args: ['--disable-blink-features=AutomationControlled', '--no-sandbox'] });
  const context = await browser.newContext({ locale: 'en-US',
    userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36' });
  const page = await context.newPage();
  const log = (...a) => console.log(...a);

  try {
    log('Step 1: login');
    await page.goto('https://orcid.org/signin', { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.waitForTimeout(2500);
    // 关 cookie 横幅
    for (const sel of ['button:has-text("Accept All Cookies")', 'button:has-text("Accept")', '#onetrust-accept-btn-handler']) {
      await page.click(sel).catch(() => {});
    }
    await page.evaluate(() => {
      document.querySelectorAll('#onetrust-consent-sdk,#onetrust-banner-sdk,#onetrust-pc-sdk,.onetrust-pc-dark-filter').forEach(e => e.remove());
      document.body.style.overflow = 'auto';
    }).catch(() => {});
    await page.waitForSelector('#username-input', { timeout: 30000 });
    await page.fill('#username-input', EMAIL);
    await page.fill('#password', password);
    await page.locator('#signin-button').click({ force: true });
    await page.waitForURL(u => !u.toString().includes('signin'), { timeout: 45000 });
    log('   logged in:', page.url());

    log('Step 2: open add-work page');
    await page.goto(`https://orcid.org/${ORCID}/work/add`, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.waitForTimeout(3000);
    // 关横幅
    await page.evaluate(() => {
      document.querySelectorAll('#onetrust-consent-sdk,#onetrust-banner-sdk,#onetrust-pc-sdk,.onetrust-pc-dark-filter').forEach(e => e.remove());
      document.body.style.overflow = 'auto';
    }).catch(() => {});

    log('Step 3: fill by DOI');
    // ORCID 有"Add DOI"快捷：表单里有 DOI 输入框（id 常见为 doi-input 或 name='doi'）
    const doiSelectors = ['#doi-input', 'input[name="doi"]', 'input[id*="doi"]', 'input[formcontrolname*="doi"]'];
    let filled = false;
    for (const sel of doiSelectors) {
      const loc = page.locator(sel).first();
      if (await loc.count() > 0) {
        await loc.fill(DOI);
        filled = true;
        log('   filled DOI via', sel);
        break;
      }
    }
    if (!filled) {
      const inputs = await page.evaluate(() => Array.from(document.querySelectorAll('input')).map(i => ({id:i.id,name:i.name,ph:i.placeholder,ctrl:i.getAttribute('formcontrolname')})));
      log('   inputs:', JSON.stringify(inputs));
    }
    // 点"Add DOI"/"Search"/"Continue" 类按钮
    for (const sel of ['button:has-text("Add DOI")', 'button:has-text("Search")', 'button:has-text("Continue")',
                       'button[type="submit"]', 'button:has-text("Retrieve")']) {
      const b = page.locator(sel).first();
      if (await b.count() > 0) {
        await b.click().catch(() => {});
        log('   clicked', sel);
        await page.waitForTimeout(12000);
        break;
      }
    }

    log('Step 4: verify title / set type');
    const body = await page.evaluate(() => document.body.innerText);
    log('   page text (first 400):', body.slice(0, 400).replace(/\n/g, ' | '));
    // 若已检索到 DOI，标题应自动填好；选类型
    if (TYPE) {
      const sel = page.locator('select[formcontrolname="workType"], select[name="workType"], select[id*="work-type"]').first();
      if (await sel.count() > 0) {
        await sel.selectOption(TYPE).catch(async () => {
          const vals = await sel.evaluate(s => Array.from(s.options).map(o => o.value));
          log('   work types:', JSON.stringify(vals));
        });
      }
    }

    log('Step 5: save');
    for (const sel of ['button:has-text("Save changes")', 'button:has-text("Save")', 'button[type="submit"]']) {
      const b = page.locator(sel).first();
      if (await b.count() > 0 && await b.isEnabled().catch(() => false)) {
        await b.click().catch(() => {});
        log('   clicked', sel);
        break;
      }
    }
    await page.waitForTimeout(12000);
    await page.screenshot({ path: 'orcid-add-work.png', fullPage: true }).catch(() => {});
    const after = await page.evaluate(() => document.body.innerText);
    log('   after save (first 300):', after.slice(0, 300).replace(/\n/g, ' | '));
    console.log('RESULT_URL=' + page.url());
  } catch (e) {
    console.error('FAILED:', e.message);
    await page.screenshot({ path: 'orcid-add-work-fail.png', fullPage: true }).catch(() => {});
    process.exit(1);
  } finally {
    await browser.close();
  }
}
main();
