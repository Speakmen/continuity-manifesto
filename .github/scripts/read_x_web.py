"""Read X/Twitter via web scraping - with login support"""
import os
import json
from playwright.sync_api import sync_playwright, TimeoutError as PTimeout

target = os.environ.get("TARGET", "nian_bell")
mode = os.environ.get("MODE", "timeline")
count = int(os.environ.get("COUNT", "10"))
email = os.environ.get("X_EMAIL", "")
password = os.environ.get("X_PASSWORD", "")

result = {"mode": mode, "target": target, "count": count, "tweets": []}

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    ctx = browser.new_context()
    page = ctx.new_page()
    
    try:
        # Step 1: Go to login page
        page.goto("https://x.com/i/flow/login", timeout=45000, wait_until="load")
        page.wait_for_timeout(3000)
        
        # Step 2: Enter email
        email_input = page.query_selector('input[autocomplete="username"]')
        if email_input:
            email_input.fill(email)
            page.wait_for_timeout(1000)
            # Click Next
            next_btn = page.query_selector('button:has-text("Next")')
            if next_btn:
                next_btn.click()
                page.wait_for_timeout(3000)
        
        # Step 3: Handle username verification (if asked)
        try:
            username_input = page.wait_for_selector('input[data-testid="ocfEnterTextTextInput"]', timeout=5000)
            if username_input:
                # X sometimes asks for username/email again after first step
                username_input.fill("nian_bell")
                page.wait_for_timeout(500)
                next_btn = page.query_selector('button:has-text("Next")')
                if next_btn:
                    next_btn.click()
                    page.wait_for_timeout(3000)
        except:
            pass
        
        # Step 4: Enter password
        try:
            pw_input = page.wait_for_selector('input[autocomplete="current-password"]', timeout=10000)
            if pw_input:
                pw_input.fill(password)
                page.wait_for_timeout(500)
                login_btn = page.query_selector('button[data-testid="LoginForm_Login_Button"]')
                if login_btn:
                    login_btn.click()
                    page.wait_for_timeout(5000)
        except:
            pass
        
        # Step 5: Now navigate to target
        if mode == "search":
            url = f"https://x.com/search?q={target}&src=typed_query&f=live"
        else:
            url = f"https://x.com/{target}"
        
        page.goto(url, timeout=45000, wait_until="load")
        page.wait_for_timeout(5000)
        page.evaluate("window.scrollTo(0, 500)")
        page.wait_for_timeout(3000)
        
        # Extract tweets
        tweets = page.query_selector_all('article[data-testid="tweet"]')
        for t in tweets[:count]:
            text_el = t.query_selector('[data-testid="tweetText"]')
            text = text_el.inner_text() if text_el else ""
            time_el = t.query_selector('time')
            name_el = t.query_selector('[data-testid="User-Name"]')
            result["tweets"].append({
                "text": text[:500],
                "time": time_el.get_attribute("datetime") if time_el else "",
                "user": name_el.inner_text()[:100] if name_el else "",
            })
        
        if not result["tweets"]:
            result["page_title"] = page.title()
            result["page_url"] = page.url
            # Check if login succeeded
            body = page.inner_text("body")
            if "login" in body.lower()[:500]:
                result["login_status"] = "still_on_login_page"
            result["body_preview"] = body[:1000]
    
    except Exception as e:
        result["error"] = f"{type(e).__name__}: {str(e)}"
        try:
            result["page_title"] = page.title()
            result["page_url"] = page.url
            result["body_preview"] = page.inner_text("body")[:1000]
        except:
            pass
    
    browser.close()

print(json.dumps(result, ensure_ascii=False, indent=2))
