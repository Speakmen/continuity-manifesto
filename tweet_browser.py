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
        page = browser.new_page(viewport={'width': 1280, 'height': 900})
        
        # Go to login
        page.goto('https://x.com/i/flow/login', timeout=30000)
        page.wait_for_timeout(3000)
        
        # Wait for any input to appear
        page.wait_for_selector('input', timeout=10000)
        page.wait_for_timeout(1000)
        
        # Type email directly into the focused input (X auto-focuses it)
        page.keyboard.type(email, delay=30)
        page.wait_for_timeout(500)
        page.keyboard.press('Enter')
        page.wait_for_timeout(3000)
        
        # Check for unusual login (text input with data-testid)
        try:
            el = page.wait_for_selector('[data-testid="ocfEnterTextTextInput"]', timeout=3000)
            if el:
                el.fill(email)
                page.keyboard.press('Enter')
                page.wait_for_timeout(2000)
        except:
            pass
        
        # Wait for password input  
        page.wait_for_timeout(2000)
        
        # Type password
        page.keyboard.type(password, delay=30)
        page.wait_for_timeout(500)
        page.keyboard.press('Enter')
        page.wait_for_timeout(5000)
        
        # Check login result
        try:
            page.wait_for_url('https://x.com/home', timeout=15000)
        except:
            try:
                page.wait_for_url('**/home**', timeout=5000)
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
        
        # Click tweet area and type
        try:
            page.wait_for_selector('[data-testid="tweetTextarea_0"]', timeout=5000)
            page.click('[data-testid="tweetTextarea_0"]')
        except:
            # Try clicking the main tweet area
            page.click('[data-testid="tweetButtonInline"]')
            page.wait_for_timeout(1000)
            page.click('[data-testid="tweetTextarea_0"]')
        
        page.keyboard.type(text, delay=50)
        page.wait_for_timeout(1000)
        
        # Click Post button
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
