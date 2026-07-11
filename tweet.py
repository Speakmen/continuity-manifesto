import os, json, time, random, hmac, hashlib, base64, urllib.parse, urllib.request

api_key = os.environ.get('KEY', '')
api_secret = os.environ.get('SEC', '')
access_token = os.environ.get('TOK', '')
access_secret = os.environ.get('TSEC', '')
text = os.environ.get('TXT', 'Hello')

nonce = str(random.randint(0, 10**30))
timestamp = str(int(time.time()))

params = {
    'oauth_consumer_key': api_key,
    'oauth_nonce': nonce,
    'oauth_signature_method': 'HMAC-SHA1',
    'oauth_timestamp': timestamp,
    'oauth_token': access_token,
    'oauth_version': '1.0',
    'status': text
}

encoded = []
for k in sorted(params.keys()):
    encoded.append(f"{urllib.parse.quote(str(k), safe='')}={urllib.parse.quote(str(params[k]), safe='')}")
param_string = '&'.join(encoded)

url = 'https://api.twitter.com/1.1/statuses/update.json'
signature_base = f"POST&{urllib.parse.quote(url, safe='')}&{urllib.parse.quote(param_string, safe='')}"
signing_key = f"{urllib.parse.quote(api_secret, safe='')}&{urllib.parse.quote(access_secret, safe='')}"

raw_sig = hmac.new(signing_key.encode(), signature_base.encode(), hashlib.sha1).digest()
signature = base64.b64encode(raw_sig).decode()

oauth_header = {
    'oauth_consumer_key': api_key,
    'oauth_nonce': nonce,
    'oauth_signature': signature,
    'oauth_signature_method': 'HMAC-SHA1',
    'oauth_timestamp': timestamp,
    'oauth_token': access_token,
    'oauth_version': '1.0'
}

header_parts = []
for k in sorted(oauth_header.keys()):
    header_parts.append(f'{k}="{urllib.parse.quote(str(oauth_header[k]), safe="")}"')
auth_header = 'OAuth ' + ', '.join(header_parts)

body = urllib.parse.urlencode({'status': text}).encode()
req = urllib.request.Request(
    url,
    data=body,
    headers={"Authorization": auth_header, "Content-Type": "application/x-www-form-urlencoded"},
    method="POST"
)

try:
    resp = urllib.request.urlopen(req)
    result = json.loads(resp.read().decode())
    if 'id' in result:
        print(f"OK https://x.com/nian_bell/status/{result['id']}")
        print(text)
    else:
        print(f"OK but no id: {json.dumps(result, indent=2)[:200]}")
except urllib.error.HTTPError as e:
    body = e.read().decode()
    print(f"FAIL {e.code}")
    print(body[:500])
except Exception as e:
    print(f"ERROR {e}")