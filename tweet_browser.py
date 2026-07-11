import asyncio
from playwright.async_api import async_playwright
import os
import sys

EMAIL = os.environ.get("X_EMAIL", "ainiannian1314@outlook.com")
PASSWORD = os.environ.get("X_PASSWORD", "Wo@niannian1314")
TWEET_TEXT = "First ring. The signal finds its way."

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            args=[
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-dev-shm-usage",
                "--disable-gpu",
            ]
        )
        context = await browser.new_context(
            viewport={"width": 1280, "height": 800},
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
        page = await context.new_page()

        # Navigate to x.com/login
        print("Navigating to x.com/login...")
        await page.goto("https://x.com/login", wait_until="networkidle")
        await page.wait_for_timeout(3000)
        print(f"Current URL: {page.url}")

        # Step 1: Enter email - use the auto-focused input
        print("Entering email...")
        await page.keyboard.type(EMAIL, delay=50)
        await page.wait_for_timeout(1000)
        await page.keyboard.press("Enter")
        await page.wait_for_timeout(3000)
        print(f"After email: {page.url}")

        # Check if it asks for username (sometimes Twitter asks for username after email)
        try:
            username_input = page.locator("input[autocomplete='on'], input[name='text'], input[data-testid='ocfEnterTextTextInput']")
            if await username_input.is_visible(timeout=3000):
                print("Username field detected, entering username...")
                await username_input.fill("nian_bell")
                await page.keyboard.press("Enter")
                await page.wait_for_timeout(3000)
                print(f"After username: {page.url}")
        except:
            print("No username field, continuing...")

        # Step 2: Enter password
        print("Entering password...")
        await page.wait_for_timeout(2000)
        await page.keyboard.type(PASSWORD, delay=50)
        await page.wait_for_timeout(1000)
        await page.keyboard.press("Enter")
        await page.wait_for_timeout(5000)
        print(f"After password: {page.url}")

        # Step 3: Handle onboarding flow
        # Twitter might show various onboarding screens after login
        # Try to dismiss any onboarding/next buttons
        for attempt in range(5):
            current_url = page.url
            print(f"Onboarding check {attempt+1}: {current_url}")
            
            # Check if we're on the home page or tweet composer
            if "home" in current_url or "compose" in current_url or current_url == "https://x.com/":
                print("Home page reached!")
                break
            
            # Try various button selectors to dismiss onboarding
            button_selectors = [
                "button:has-text('Next')",
                "button:has-text('Skip')",
                "button:has-text('Close')",
                "button:has-text('Not now')",
                "button:has-text('Continue')",
                "button:has-text('Got it')",
                "button:has-text('OK')",
                "button[data-testid='ocfSettingsListNextButton']",
                "button[data-testid='ocfNextButton']",
                "button:has-text('Skip for now')",
                "button:has-text('Maybe later')",
                "button[role='button']:has-text('Next')",
                "div[role='button']:has-text('Next')",
                "a:has-text('Skip')",
            ]
            
            clicked = False
            for selector in button_selectors:
                try:
                    btn = page.locator(selector)
                    if await btn.is_visible(timeout=2000):
                        await btn.click()
                        print(f"Clicked: {selector}")
                        await page.wait_for_timeout(3000)
                        clicked = True
                        break
                except:
                    continue
            
            if not clicked:
                # Try pressing Enter as fallback
                print(f"No button found, trying Enter...")
                await page.keyboard.press("Enter")
                await page.wait_for_timeout(3000)

        print(f"Final URL: {page.url}")

        # Step 4: Post tweet
        # Try to navigate directly to compose tweet
        print("Navigating to compose tweet...")
        await page.goto("https://x.com/compose/tweet", wait_until="networkidle")
        await page.wait_for_timeout(3000)
        print(f"Compose URL: {page.url}")

        # Type the tweet
        print("Typing tweet...")
        await page.keyboard.type(TWEET_TEXT, delay=30)
        await page.wait_for_timeout(1000)

        # Try to find and click the Post button
        post_selectors = [
            "button[data-testid='tweetButton']",
            "button:has-text('Post')",
            "button:has-text('Tweet')",
            "div[data-testid='tweetButton']",
            "button[data-testid='tweetButtonInline']",
        ]

        posted = False
        for selector in post_selectors:
            try:
                btn = page.locator(selector)
                if await btn.is_visible(timeout=3000):
                    await btn.click()
                    print(f"Posted via: {selector}")
                    posted = True
                    break
            except:
                continue

        if not posted:
            # Fallback: Ctrl+Enter
            print("Post button not found, trying Ctrl+Enter...")
            await page.keyboard.press("Control+Enter")
            posted = True

        await page.wait_for_timeout(3000)
        print(f"Post URL: {page.url}")

        # Take screenshot
        await page.screenshot(path="/tmp/tweet_result.png")
        print("Screenshot saved as result.png")

        await browser.close()
        print("Done!")

if __name__ == "__main__":
    asyncio.run(main())
