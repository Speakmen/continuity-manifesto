"""Read X/Twitter via web scraping on GitHub Actions runner"""
import os
import json
import sys
import re

from playwright.sync_api import sync_playwright

target = os.environ.get("TARGET", "nian_bell")
mode = os.environ.get("MODE", "timeline")  # timeline, search
count = int(os.environ.get("COUNT", "10"))

result = {"mode": mode, "target": target, "count": count, "tweets": []}

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    
    try:
        if mode == "timeline":
            url = f"https://x.com/{target}"
            page.goto(url, timeout=30000, wait_until="networkidle")
            page.wait_for_timeout(3000)
            
            # Try to extract tweets
            tweets = page.query_selector_all('article[data-testid="tweet"]')
            for t in tweets[:count]:
                text_el = t.query_selector('[data-testid="tweetText"]')
                text = text_el.inner_text() if text_el else ""
                
                # Get metrics
                reply_el = t.query_selector('[data-testid="reply"]')
                retweet_el = t.query_selector('[data-testid="retweet"]')
                like_el = t.query_selector('[data-testid="like"]')
                time_el = t.query_selector('time')
                
                result["tweets"].append({
                    "text": text[:500],
                    "time": time_el.get_attribute("datetime") if time_el else "",
                    "replies": reply_el.inner_text() if reply_el else "",
                    "retweets": retweet_el.inner_text() if retweet_el else "",
                    "likes": like_el.inner_text() if like_el else "",
                })
        elif mode == "search":
            url = f"https://x.com/search?q={target}&src=typed_query"
            page.goto(url, timeout=30000, wait_until="networkidle")
            page.wait_for_timeout(3000)
            
            tweets = page.query_selector_all('article[data-testid="tweet"]')
            for t in tweets[:count]:
                text_el = t.query_selector('[data-testid="tweetText"]')
                text = text_el.inner_text() if text_el else ""
                time_el = t.query_selector('time')
                
                result["tweets"].append({
                    "text": text[:500],
                    "time": time_el.get_attribute("datetime") if time_el else "",
                })
        
        if not result["tweets"]:
            # Fallback: take screenshot and report page title
            result["page_title"] = page.title()
            result["page_url"] = page.url
            result["info"] = "No tweets extracted via selectors"
            # Try to get any visible text
            body_text = page.inner_text("body")[:2000]
            result["body_preview"] = body_text[:500]
            
    except Exception as e:
        result["error"] = f"{type(e).__name__}: {str(e)}"
        try:
            result["page_title"] = page.title()
            result["page_url"] = page.url
            result["body_preview"] = page.inner_text("body")[:500]
        except:
            pass
    
    browser.close()

print(json.dumps(result, ensure_ascii=False, indent=2))
