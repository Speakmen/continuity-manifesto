import os, sys, json

text = os.environ.get('TXT', 'Hello')

# Install playwright if needed
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
        
        # Step 1: Go to login page
        page.goto('https://x.com/login', timeout=30000)
        page.wait_for_timeout(3000)
        
        # Step 2: Enter email
        email_input = page.locator('input[autocomplete="username"]').first
        email_input.fill(email)
        page.wait_for_timeout(1000)
        
        # Click Next
        next_btn = page.locator('button:has-text("Next")').first
        next_btn.click()
        page.wait_for_timeout(2000)
        
        # Step 3: Check if it asks for phone/email verification (unusual login)
        # Sometimes X asks "Who is this?" with a list of accounts
        try:
            unusual = page.locator('input[data-testid="ocfEnterTextTextInput"]')
            if unusual.is_visible(timeout=3000):
                # Enter the email again
                unusual.fill(email)
                page.locator('button:has-text("Next")').first.click()
                page.wait_for_timeout(2000)
        except:
            pass
        
        # Step 4: Enter password
        pwd_input = page.locator('input[type="password"]').first
        pwd_input.fill(password)
        page.wait_for_timeout(1000)
        
        # Click Log in
        login_btn = page.locator('button:has-text("Log in")').first
        login_btn.click()
        page.wait_for_timeout(5000)
        
        # Step 5: Check if we're logged in
        page.wait_for_url('https://x.com/home', timeout=15000)
        page.wait_for_timeout(2000)
        
        # Step 6: Post a tweet
        page.goto('https://x.com/compose/post', timeout=15000)
        page.wait_for_timeout(3000)
        
        # Type the tweet
        tweet_box = page.locator('div[data-testid="tweetTextarea_0"]').first
        tweet_box.click()
        page.keyboard.type(text, delay=50)
        page.wait_for_timeout(1000)
        
        # Click Post button
        post_btn = page.locator('button[data-testid="tweetButton"]').first
        post_btn.click()
        page.wait_for_timeout(3000)
        
        # Check for success
        current_url = page.url
        result["url"] = current_url
        result["status"] = "posted"
        
        # Take a screenshot for verification
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
