import os, sys, json

text = os.environ.get('TXT', 'Hello')

import subprocess
subprocess.run([sys.executable, '-m', 'pip', 'install', 'playwright'], capture_output=True)
subprocess.run([sys.executable, '-m', 'playwright', 'install', 'chromium'], capture_output=True)

from playwright.sync_api import sync_playwright

email = os.environ.get('X_EMAIL', '')
password = os.environ.get('X_PASSWORD', '')

result = {"status": "unknown", "url": "", "error": ""}

try:
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=['--no-sandbox'])
        context = browser.new_context(
            viewport={'width': 1280, 'height': 900},
            user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        )
        page = context.new_page()
        
        # Go to login
        page.goto('https://x.com/login', timeout=30000)
        page.wait_for_timeout(3000)
        
        # Debug: save page HTML
        html = page.content()
        with open('/tmp/page_debug.html', 'w') as f:
            f.write(html[:10000])
        
        # Try multiple selectors for email/username input
        email_input = None
        for selector in [
            'input[name="text"]',
            'input[autocomplete="username"]',
            'input[type="text"]',
            'input:not([type="hidden"])'
        ]:
            try:
                el = page.locator(selector).first
                if el.is_visible(timeout=2000):
                    email_input = el
                    break
            except:
                continue
        
        if not email_input:
            # Try finding any visible text input
            inputs = page.locator('input').all()
            for inp in inputs:
                try:
                    if inp.is_visible():
                        t = inp.get_attribute('type')
                        if t in ('text', 'email', None):
                            email_input = inp
                            break
                except:
                    continue
        
        if not email_input:
            raise Exception("Could not find email input field")
        
        email_input.fill(email)
        page.wait_for_timeout(1000)
        
        # Click Next
        next_btn = page.locator('button:has-text("Next")').first
        next_btn.click()
        page.wait_for_timeout(3000)
        
        # Handle unusual login check
        try:
            unusual = page.locator('input[data-testid="ocfEnterTextTextInput"]')
            if unusual.is_visible(timeout=3000):
                unusual.fill(email)
                page.locator('button:has-text("Next")').first.click()
                page.wait_for_timeout(2000)
        except:
            pass
        
        # Enter password
        pwd_input = None
        for selector in ['input[type="password"]', 'input[name="password"]']:
            try:
                el = page.locator(selector).first
                if el.is_visible(timeout=2000):
                    pwd_input = el
                    break
            except:
                continue
        
        if not pwd_input:
            raise Exception("Could not find password input field")
        
        pwd_input.fill(password)
        page.wait_for_timeout(1000)
        
        # Click Log in
        login_btn = page.locator('button:has-text("Log in")').first
        login_btn.click()
        page.wait_for_timeout(5000)
        
        # Wait for home page
        page.wait_for_url('https://x.com/home', timeout=20000)
        page.wait_for_timeout(2000)
        
        # Post tweet
        page.goto('https://x.com/compose/post', timeout=15000)
        page.wait_for_timeout(3000)
        
        # Type the tweet
        tweet_box = page.locator('div[data-testid="tweetTextarea_0"]').first
        tweet_box.click()
        page.keyboard.type(text, delay=50)
        page.wait_for_timeout(1000)
        
        # Post
        post_btn = page.locator('button[data-testid="tweetButton"]').first
        post_btn.click()
        page.wait_for_timeout(3000)
        
        result["status"] = "posted"
        result["url"] = page.url
        
        page.screenshot(path='/tmp/tweet_result.png')
        browser.close()
        
except Exception as e:
    result["status"] = "error"
    result["error"] = str(e)
    try:
        page.screenshot(path='/tmp/tweet_result.png')
    except:
        pass

print(json.dumps(result))
