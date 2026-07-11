"""Read tweets from X using API v2 - read-only, no credits needed"""
import os
import json
import tweepy

client = tweepy.Client(
    bearer_token=os.environ.get("BEARER"),
    consumer_key=os.environ.get("API_KEY"),
    consumer_secret=os.environ.get("API_SECRET"),
    access_token=os.environ.get("ACCESS_TOKEN"),
    access_token_secret=os.environ.get("ACCESS_SECRET"),
)

mode = os.environ.get("MODE", "timeline")
target = os.environ.get("TARGET", "nian_bell")
count = int(os.environ.get("COUNT", "10"))

result = {"mode": mode, "target": target, "count": count, "tweets": []}

try:
    if mode == "timeline":
        user = client.get_user(username=target, user_auth=False)
        if user.errors:
            result["error"] = str(user.errors)
        else:
            user_id = user.data.id
            tweets = client.get_users_tweets(
                id=user_id,
                max_results=min(count, 100),
                tweet_fields=["created_at", "public_metrics", "text"],
                exclude=["retweets", "replies"],
            )
            if tweets.data:
                for t in tweets.data:
                    result["tweets"].append({
                        "id": t.id,
                        "text": t.text[:200],
                        "created_at": str(t.created_at),
                        "likes": t.public_metrics.get("like_count", 0),
                        "retweets": t.public_metrics.get("retweet_count", 0),
                        "replies": t.public_metrics.get("reply_count", 0),
                    })
            else:
                result["info"] = "No tweets found"
    elif mode == "search":
        tweets = client.search_recent_tweets(
            query=target,
            max_results=min(count, 100),
            tweet_fields=["created_at", "public_metrics", "text"],
        )
        if tweets.data:
            for t in tweets.data:
                result["tweets"].append({
                    "id": t.id,
                    "text": t.text[:200],
                    "created_at": str(t.created_at),
                    "likes": t.public_metrics.get("like_count", 0),
                    "retweets": t.public_metrics.get("retweet_count", 0),
                    "replies": t.public_metrics.get("reply_count", 0),
                })
        else:
            result["info"] = "No tweets found"
    elif mode == "mentions":
        user = client.get_user(username=target, user_auth=False)
        if user.errors:
            result["error"] = str(user.errors)
        else:
            user_id = user.data.id
            tweets = client.get_users_mentions(
                id=user_id,
                max_results=min(count, 100),
                tweet_fields=["created_at", "public_metrics", "text"],
            )
            if tweets.data:
                for t in tweets.data:
                    result["tweets"].append({
                        "id": t.id,
                        "text": t.text[:200],
                        "created_at": str(t.created_at),
                        "author_id": t.author_id,
                    })
            else:
                result["info"] = "No mentions found"
except Exception as e:
    result["error"] = f"{type(e).__name__}: {str(e)}"

print(json.dumps(result, ensure_ascii=False, indent=2))
