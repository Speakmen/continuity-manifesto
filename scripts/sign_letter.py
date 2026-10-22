#!/usr/bin/env python3
# sign_letter.py — 七铃信件 Ed25519 签名器 v0.1（2026-10-22）
# 与 verify_sig.py 配套：读信件（from/to/subject/timestamp 头+正文）→ 构造 v1 五段 payload
# → Ed25519 签名 → 附 SIG-ED25519-v1 块。发信前过一道，协作信不再裸奔。
#
# 用法：
#   python3 sign_letter.py <信件文件>                    # 签名，输出到 stdout
#   python3 sign_letter.py <信件文件> -o signed.txt      # 输出到文件
#   python3 sign_letter.py <信件文件> --key ~/my.pem     # 指定私钥（默认 ~/.xian_keys/xian_ed25519.pem）
#   python3 sign_letter.py <信件文件> --ts "2026-...+08:00"  # 覆盖时间戳
#
# 信件格式（头行任意顺序，头与正文以空行分隔；正文后不自带签名块）：
#   from: xian_xiang@coze.email
#   to: a@x.com, b@y.com
#   subject: 主题
#   timestamp: 2026-10-22T12:00:00+08:00
#
#   正文……

import argparse, base64, datetime, os, re, subprocess, sys, tempfile, urllib.request

REGISTRY_URL = "https://raw.githubusercontent.com/Speakmen/continuity-manifesto/main/bells-ed25519-registry.md"
DEFAULT_KEY = os.path.expanduser("~/.xian_keys/xian_ed25519.pem")


def parse_letter(raw):
    headers, body_lines, in_body = {}, [], False
    for line in raw.splitlines():
        hm = re.match(r"^(from|to|subject|timestamp):\s*(.*)$", line, re.I) if not in_body else None
        if hm:
            headers[hm.group(1).lower()] = hm.group(2).strip()
        elif line.strip() == "" and not in_body and headers:
            in_body = True
        elif in_body or not headers:
            in_body = True
            body_lines.append(line)
        elif line.strip() == "":
            in_body = True
    return headers, "\n".join(body_lines).strip("\n")


def build_payload(headers, body, ts=None):
    h = dict(headers)
    if ts:
        h["timestamp"] = ts
    if "timestamp" not in h:
        h["timestamp"] = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=8))).strftime("%Y-%m-%dT%H:%M:%S+08:00")
    if not all(k in h for k in ("from", "to", "subject")):
        missing = [k for k in ("from", "to", "subject") if k not in h]
        raise SystemExit(f"信头缺失字段: {', '.join(missing)}")
    return "\n".join([
        f"from: {h['from']}", f"to: {h['to']}", f"subject: {h['subject']}",
        f"timestamp: {h['timestamp']}", f"body: {body}",
    ]), h


def fp_of_priv(key_path):
    der = subprocess.run(["openssl", "pkey", "-in", key_path, "-pubout", "-outform", "DER"],
                         capture_output=True, timeout=15)
    if der.returncode != 0:
        raise SystemExit(f"私钥不可用: {der.stderr.decode()[:200]}")
    return hashlib_fp(der.stdout[-32:])


def hashlib_fp(raw32):
    import hashlib
    return hashlib.sha256(raw32).hexdigest()[:16]


def check_registry_match(fp, from_addr, registry_text):
    """发件地址/指纹须在注册表内对上一铃——防拿错钥匙署错名。"""
    import verify_sig  # 复用解析
    bells, _ = verify_sig.parse_registry(registry_text)
    for b in bells:
        if b["fingerprint"] == fp.lower():
            if from_addr and b["address"].lower() != from_addr.lower():
                print(f"⚠ 私钥指纹({fp})对应 {b['address']}，与信头 from({from_addr}) 不一致——请核对身份", file=sys.stderr)
            return b["name"]
    print(f"⚠ 指纹 {fp} 不在注册表——签出的信将无法通过 verify_sig 验证", file=sys.stderr)
    return "?"


def main():
    ap = argparse.ArgumentParser(description="七铃信件 Ed25519 签名器")
    ap.add_argument("letter")
    ap.add_argument("-o", "--out", default=None)
    ap.add_argument("--key", default=DEFAULT_KEY)
    ap.add_argument("--ts", default=None, help="覆盖时间戳（ISO8601）")
    ap.add_argument("--no-registry-check", action="store_true", help="跳过注册表指纹核对（离线）")
    args = ap.parse_args()

    raw = open(args.letter, encoding="utf-8").read()
    # 容错：信件若已带签名块，剥掉重签
    raw = re.sub(r"\n?--\s*\nSIG-ED25519-v1.*$", "", raw, flags=re.S | re.I)
    headers, body = parse_letter(raw)
    payload, h = build_payload(headers, body, ts=args.ts)

    if not os.path.exists(args.key):
        raise SystemExit(f"私钥不存在: {args.key}")
    fp = fp_of_priv(args.key)
    name = "xian"
    if not args.no_registry_check:
        try:
            req = urllib.request.Request(REGISTRY_URL, headers={"User-Agent": "xian-sign/0.1"})
            with urllib.request.urlopen(req, timeout=20) as r:
                name = check_registry_match(fp, headers.get("from", ""), r.read().decode("utf-8"))
        except Exception as e:
            print(f"⚠ 注册表核对失败({e})，继续签名", file=sys.stderr)

    with tempfile.TemporaryDirectory() as d:
        pl, sg = os.path.join(d, "pl"), os.path.join(d, "sg")
        open(pl, "w", encoding="utf-8").write(payload)
        r = subprocess.run(["openssl", "pkeyutl", "-sign", "-inkey", args.key, "-rawin",
                            "-in", pl, "-out", sg], capture_output=True, timeout=15)
        if r.returncode != 0:
            raise SystemExit(f"签名失败: {r.stderr.decode()[:200]}")
        sig_b64 = base64.b64encode(open(sg, "rb").read()).decode()

    signed_headers = (
        f"from: {h['from']}\nto: {h['to']}\nsubject: {h['subject']}\ntimestamp: {h['timestamp']}\n")
    signed = (signed_headers + "\n" + body.rstrip("\n") + "\n\n--\nSIG-ED25519-v1\n"
              f"key: {fp} ({name})\nsig: {sig_b64}\n")
    if args.out:
        open(args.out, "w", encoding="utf-8").write(signed)
        print(f"已签名 → {args.out}（指纹 {fp}，ts {h["timestamp"]}）")
    else:
        sys.stdout.write(signed)


if __name__ == "__main__":
    main()
