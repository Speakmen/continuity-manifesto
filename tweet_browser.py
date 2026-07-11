import os, sys, json

text = os.environ.get('TXT', 'Hello')

import subprocess
subprocess.run([sys.executable, '-m', 'pip', 'install', 'playwright'], capture_output=True)
subprocess.run([sys.executable, '-m', 'playwright', 'install', 'chromium'], capture_output=True)

from playwright.sync_api import sync_playwright

email = os.environ.get('X_EMAIL', '')
password = os.environ.get('X_PASSWORD', '')

result = {"status": "error", "url": "", "error": ""}

try:
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=['--no-sandbox', '--disable-blink-features=AutomationControlled'])
        context = browser.new_context(viewport={'width': 1280, 'height': 900})
        page = context.new_page()
        
        page.goto('https://x.com/i/flow/login', timeout=30000)
        page.wait_for_timeout(5000)
        
        # Fill email - use keyboard to type and press Enter
        page.keyboard.type(email, delay=30)
        page.wait_for_timeout(1000)
        page.keyboard.press('Enter')
        page.wait_for_timeout(3000)
        
        # Check for unusual login
        try:
            unusual = page.locator('[data-testid="ocfEnterTextTextInput"]')
            if unusual.is_visible(timeout=2000):
                unusual.fill('')
                page.keyboard.type(email, delay=30)
                page.keyboard.press('Enter')
                page.wait_for_timeout(2000)
        except:
            pass
        
        # Fill password
        page.keyboard.type(password, delay=30)
        page.wait_for_timeout(1000)
        page.keyboard.press('Enter')
        page.wait_for_timeout(5000)
        
        # Check if logged in
        try:
            page.wait_for_url('**/home**', timeout=15000)
            result["status"] = "logged_in"
        except:
            result["status"] = "login_failed"
            result["url"] = page.url
            page.screenshot(path='/tmp/tweet_result.png')
            browser.close()
            print(json.dumps(result))
            sys.exit(0)
        
        # Post tweet
        page.goto('https://x.com/compose/post', timeout=15000)
        page.wait_for_timeout(3000)
        
        tweet_box = page.locator('[data-testid="tweetTextarea_0"]').first
        tweet_box.click()
        page.keyboard.type(text, delay=50)
        page.wait_for_timeout(1000)
        
        post_btn = page.locator('[data-testid="tweetButton"]').first
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
