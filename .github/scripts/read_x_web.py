"""Read X/Twitter via web scraping on GitHub Actions runner"""
import os
import json
from playwright.sync_api import sync_playwright

target = os.environ.get("TARGET", "nian_bell")
mode = os.environ.get("MODE", "timeline")
count = int(os.environ.get("COUNT", "10"))

result = {"mode": mode, "target": target, "count": count, "tweets": []}

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    
    try:
        if mode == "timeline":
            url = f"https://x.com/{target}"
            # Use 'load' instead of 'networkidle' - faster
            page.goto(url, timeout=45000, wait_until="load")
            page.wait_for_timeout(5000)
            
            # Scroll a bit to trigger lazy loading
            page.evaluate("window.scrollTo(0, 300)")
            page.wait_for_timeout(2000)
            
            tweets = page.query_selector_all('article[data-testid="tweet"]')
            for t in tweets[:count]:
                text_el = t.query_selector('[data-testid="tweetText"]')
                text = text_el.inner_text() if text_el else ""
                time_el = t.query_selector('time')
                result["tweets"].append({
                    "text": text[:500],
                    "time": time_el.get_attribute("datetime") if time_el else "",
                })
        
        elif mode == "search":
            query = target
            url = f"https://x.com/search?q={query}&src=typed_query&f=live"
            page.goto(url, timeout=45000, wait_until="load")
            page.wait_for_timeout(5000)
            
            # Scroll to trigger loading
            page.evaluate("window.scrollTo(0, 500)")
            page.wait_for_timeout(3000)
            
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
        
        # Fallback if no tweets found
        if not result["tweets"]:
            result["page_title"] = page.title()
            result["page_url"] = page.url
            # Try to get any tweet-like content
            all_articles = page.query_selector_all('article')
            result["article_count"] = len(all_articles)
            body = page.inner_text("body")
            result["body_preview"] = body[:1000]
            
            # Try different selectors
            for sel in ['[data-testid="tweetText"]', '.tweet-text', '.css-1rynq56', 'span']:
                els = page.query_selector_all(sel)
                if els:
                    texts = [e.inner_text()[:200] for e in els[:5] if e.inner_text().strip()]
                    if texts:
                        result[f"selector_{sel}"] = texts

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
