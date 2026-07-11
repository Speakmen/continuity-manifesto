import os, tweepy

text = os.environ['TEXT'].strip()
if len(text) > 280:
    print(f"ERROR: 推文超长 ({len(text)}/280)")
    exit(1)

client = tweepy.Client(
    bearer_token=os.environ.get('BEARER'),
    consumer_key=os.environ.get('API_KEY'),
    consumer_secret=os.environ.get('API_SECRET'),
    access_token=os.environ.get('ACCESS_TOKEN'),
    access_token_secret=os.environ.get('ACCESS_SECRET')
)

response = client.create_tweet(text=text)
tweet_id = response.data['id']
print(f"SUCCESS: https://x.com/nian_bell/status/{tweet_id}")
