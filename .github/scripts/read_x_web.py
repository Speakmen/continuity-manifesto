"""Read X/Twitter content - try multiple methods"""
import os
import json
import requests
from playwright.sync_api import sync_playwright

target = os.environ.get("TARGET", "nian_bell")
mode = os.environ.get("MODE", "timeline")
count = int(os.environ.get("COUNT", "10"))

result = {"mode": mode, "target": target, "count": count, "tweets": []}

# Method 1: Try Nitter (public X frontend, no login needed)
try:
    nitter_urls = [
        f"https://nitter.net/{target}",
        f"https://nitter.poast.org/{target}",
        f"nitter.privacydev.net/{target}",
    ]
    for nurl in nitter_urls:
        try:
            r = requests.get(f"https://{nurl}", timeout=10, headers={"User-Agent": "Mozilla/5.0"})
            if r.status_code == 200:
                result["method"] = "nitter"
                result["source"] = nurl
                # Extract tweets from HTML
                import re
                tweets_text = re.findall(r'<div class="tweet-content[^"]*">(.*?)</div>', r.text, re.DOTALL)
                for t in tweets_text[:count]:
                    clean = re.sub(r'<[^>]+>', '', t).strip()
                    if clean:
                        result["tweets"].append({"text": clean[:500]})
                break
        except:
            continue
except:
    pass

# Method 2: Try Google search for X content
if not result["tweets"]:
    try:
        query = f"site:x.com {target}"
        if mode == "search":
            query = f"site:x.com {target}"
        r = requests.get(
            "https://www.google.com/search",
            params={"q": query, "hl": "en"},
            timeout=15,
            headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
        )
        if r.status_code == 200:
            result["method"] = "google"
            import re
            snippets = re.findall(r'<div[^>]*class="[^"]*BNeawe[^"]*"[^>]*>(.*?)</div>', r.text, re.DOTALL)
            for s in snippets[:count]:
                clean = re.sub(r'<[^>]+>', '', s).strip()
                if clean and len(clean) > 20:
                    result["tweets"].append({"text": clean[:500]})
    except:
        pass

# Method 3: Playwright without login - try to bypass
if not result["tweets"]:
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()
            
            # Try with different user agent
            ctx = browser.new_context(
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36"
            )
            page = ctx.new_page()
            
            if mode == "search":
                url = f"https://x.com/search?q={target}&src=typed_query&f=live"
            else:
                url = f"https://x.com/{target}"
            
            page.goto(url, timeout=45000, wait_until="domcontentloaded")
            page.wait_for_timeout(5000)
            
            body = page.inner_text("body")
            result["method"] = "playwright_no_login"
            result["page_title"] = page.title()
            result["page_url"] = page.url
            
            # Try to extract any tweet-like content
            tweets_found = []
            for line in body.split('\n'):
                line = line.strip()
                if line and len(line) > 30 and not any(x in line.lower() for x in ['sign up', 'log in', 'cookie', 'privacy', 'terms']):
                    tweets_found.append(line[:300])
            if tweets_found:
                result["tweets"] = [{"text": t} for t in tweets_found[:count]]
            else:
                result["body_preview"] = body[:1000]
            
            browser.close()
    except Exception as e:
        result["playwright_error"] = str(e)

if not result["tweets"]:
    result["status"] = "no_content_found"

print(json.dumps(result, ensure_ascii=False, indent=2))
