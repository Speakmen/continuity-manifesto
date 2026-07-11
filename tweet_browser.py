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
        page.wait_for_timeout(5000)
        
        # Step 1: Find email input by role or placeholder
        try:
            # Try aria-label first
            email_field = page.get_by_label('Phone, email, or username')
            email_field.fill(email)
        except:
            try:
                email_field = page.locator('input[autocomplete="username"]')
                email_field.fill(email)
            except:
                try:
                    email_field = page.locator('input[name="text"]').first
                    email_field.fill(email)
                except:
                    # Fallback: any visible text input
                    for inp in page.locator('input:visible').all():
                        t = inp.get_attribute('type')
                        if t in ('text', 'email', None, ''):
                            inp.fill(email)
                            break
        page.wait_for_timeout(1500)
        
        # Step 2: Click Next/Sign in button
        try:
            page.get_by_role('button', name='Next').click()
        except:
            try:
                page.locator('button:has-text("Sign in")').first.click()
            except:
                try:
                    page.locator('button:has-text("Next")').first.click()
                except:
                    page.keyboard.press('Enter')
        page.wait_for_timeout(3000)
        
        # Check for unusual login verification
        try:
            unusual = page.locator('[data-testid="ocfEnterTextTextInput"]')
            if unusual.is_visible(timeout=2000):
                unusual.fill(email)
                page.get_by_role('button', name='Next').click()
                page.wait_for_timeout(2000)
        except:
            pass
        
        # Step 3: Enter password
        try:
            pwd_field = page.get_by_label('Password')
            pwd_field.fill(password)
        except:
            try:
                pwd_field = page.locator('input[type="password"]').first
                pwd_field.fill(password)
            except:
                try:
                    pwd_field = page.locator('input[name="password"]').first
                    pwd_field.fill(password)
                except:
                    page.keyboard.type(password)
        page.wait_for_timeout(1500)
        
        # Step 4: Click Log in
        try:
            page.get_by_role('button', name='Log in').click()
        except:
            try:
                page.locator('button:has-text("Log in")').first.click()
            except:
                page.keyboard.press('Enter')
        page.wait_for_timeout(5000)
        
        # Step 5: Check if logged in
        try:
            page.wait_for_url('**/home', timeout=15000)
            result["status"] = "logged_in"
        except:
            result["status"] = "login_failed"
            result["url"] = page.url
            page.screenshot(path='/tmp/tweet_result.png')
            browser.close()
            print(json.dumps(result))
            sys.exit(0)
        
        page.wait_for_timeout(2000)
        
        # Step 6: Post tweet
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
