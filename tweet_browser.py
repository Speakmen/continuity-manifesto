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
        browser = p.chromium.launch(headless=True, args=['--no-sandbox'])
        context = browser.new_context(viewport={'width': 1280, 'height': 900})
        page = context.new_page()
        
        page.goto('https://x.com/i/flow/login', timeout=30000)
        
        # Wait for the email input to appear
        page.wait_for_selector('input[autocomplete="username"]', timeout=15000)
        page.wait_for_timeout(2000)
        
        # Fill email
        page.fill('input[autocomplete="username"]', email)
        page.wait_for_timeout(1000)
        
        # Click Next button
        page.click('button:has-text("Next")')
        page.wait_for_timeout(3000)
        
        # Handle unusual login check if present
        try:
            page.wait_for_selector('[data-testid="ocfEnterTextTextInput"]', timeout=3000)
            page.fill('[data-testid="ocfEnterTextTextInput"]', email)
            page.click('button:has-text("Next")')
            page.wait_for_timeout(2000)
        except:
            pass
        
        # Wait for password field
        page.wait_for_selector('input[autocomplete="current-password"]', timeout=10000)
        page.wait_for_timeout(1000)
        
        # Fill password
        page.fill('input[autocomplete="current-password"]', password)
        page.wait_for_timeout(1000)
        
        # Click Log in - try data-testid first
        try:
            page.click('[data-testid="LoginForm_Login_Button"]', timeout=5000)
        except:
            page.click('button:has-text("Log in")', timeout=5000)
        page.wait_for_timeout(5000)
        
        # Wait for home page
        try:
            page.wait_for_url('**/home**', timeout=20000)
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
        page.wait_for_selector('[data-testid="tweetTextarea_0"]', timeout=10000)
        page.wait_for_timeout(1000)
        
        page.click('[data-testid="tweetTextarea_0"]')
        page.keyboard.type(text, delay=50)
        page.wait_for_timeout(1000)
        
        page.click('[data-testid="tweetButton"]')
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
