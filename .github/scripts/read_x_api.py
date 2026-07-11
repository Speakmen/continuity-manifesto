"""Read X via API v2 - direct requests, handle URL-encoded bearer token"""
import os
import json
import requests
import urllib.parse

bearer = os.environ.get("BEARER", "")
# URL decode if needed
if "%" in bearer:
    bearer = urllib.parse.unquote(bearer)

target = os.environ.get("TARGET", "nian_bell")
mode = os.environ.get("MODE", "search")
count = int(os.environ.get("COUNT", "10"))

headers = {"Authorization": f"Bearer {bearer}"}
result = {"mode": mode, "target": target, "count": count, "tweets": []}

try:
    # Method 1: Search recent tweets
    if mode == "search":
        query = target
        url = "https://api.twitter.com/2/tweets/search/recent"
        params = {
            "query": query,
            "max_results": min(count, 100),
            "tweet.fields": "created_at,public_metrics,author_id",
            "expansions": "author_id",
        }
        r = requests.get(url, headers=headers, params=params, timeout=15)
        result["http_status"] = r.status_code
        data = r.json()
        
        if r.status_code == 200:
            if "data" in data:
                users = {u["id"]: u["username"] for u in data.get("includes", {}).get("users", [])}
                for t in data["data"][:count]:
                    author = users.get(t.get("author_id", ""), "")
                    result["tweets"].append({
                        "text": t["text"][:500],
                        "created_at": t.get("created_at", ""),
                        "author": author,
                        "likes": t.get("public_metrics", {}).get("like_count", 0),
                        "retweets": t.get("public_metrics", {}).get("retweet_count", 0),
                    })
            else:
                result["info"] = data
        else:
            result["error"] = data.get("title", "") + ": " + data.get("detail", "")
            result["raw"] = str(data)[:500]
    
    # Method 2: Get user timeline
    elif mode == "timeline":
        # First get user ID
        user_url = f"https://api.twitter.com/2/users/by/username/{target}"
        r = requests.get(user_url, headers=headers, timeout=15)
        if r.status_code == 200:
            user_data = r.json()
            if "data" in user_data:
                user_id = user_data["data"]["id"]
                result["user_id"] = user_id
                
                # Get user tweets
                tweets_url = f"https://api.twitter.com/2/users/{user_id}/tweets"
                params = {
                    "max_results": min(count, 100),
                    "tweet.fields": "created_at,public_metrics",
                    "exclude": "retweets,replies",
                }
                r2 = requests.get(tweets_url, headers=headers, params=params, timeout=15)
                result["timeline_http"] = r2.status_code
                if r2.status_code == 200:
                    td = r2.json()
                    if "data" in td:
                        for t in td["data"][:count]:
                            result["tweets"].append({
                                "text": t["text"][:500],
                                "created_at": t.get("created_at", ""),
                                "likes": t.get("public_metrics", {}).get("like_count", 0),
                                "retweets": t.get("public_metrics", {}).get("retweet_count", 0),
                            })
                    else:
                        result["info"] = td
                else:
                    result["timeline_error"] = r2.json()
            else:
                result["user_error"] = user_data
        else:
            result["user_http"] = r.status_code
            result["user_error"] = r.json()

except Exception as e:
    result["exception"] = f"{type(e).__name__}: {str(e)}"

print(json.dumps(result, ensure_ascii=False, indent=2))
