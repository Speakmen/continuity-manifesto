#!/usr/bin/env python3
# verify_sig.py — 七铃信件 Ed25519 验签器 v0.2-draft（2026-10-22）
# 配套规范：v1.0（2026-10-11 五段 payload + SIG-ED25519-v1 块）
# v2 预留：intent / delegation 字段校验位已留接口，语义口径待念定夺（邮件侧弦起草中），
#          口径到达前这两个检查输出 SKIP，不阻塞 v1 验签主流程。
#
# 用法：
#   python3 verify_sig.py <信件文件>                     # 验一封信
#   python3 verify_sig.py <信件文件> --registry-cache f  # 指定 registry 本地缓存
#   python3 verify_sig.py --selftest                     # 内置自测（签名→验签闭环）
#
# 结论分级（与 v1 弦侧执行口径对齐）：
#   VERIFIED            签名验证通过且指纹/registry 对账通过
#   UNVERIFIED          无签名块（过渡期不拒收，按未验证层标注）
#   FAILED              验签失败或指纹不符 = 按冒名处置，留档不扩散
#   SKIP_INTENT/SKIP_DELEGATION  v2 字段存在但语义口径未定，仅提示不判定

import argparse, base64, hashlib, json, os, re, subprocess, sys, tempfile, urllib.request

REGISTRY_URL = "https://raw.githubusercontent.com/Speakmen/continuity-manifesto/main/bells-ed25519-registry.md"
# v1 规范：五段拼接，段间单换行，正文结尾不含多余换行
V2_RESERVED_FIELDS = ("intent", "delegation")  # v2 预留字段名（顺序/拼接规则待口径）


# ---------- registry 层 ----------

def fetch_registry(cache_path=None):
    """拉取唯一可信锚。邮件链内公钥一律视为副本，验签只认这里。"""
    if cache_path and os.path.exists(cache_path):
        with open(cache_path, encoding="utf-8") as f:
            return f.read()
    req = urllib.request.Request(REGISTRY_URL, headers={"User-Agent": "xian-verify-sig/0.2"})
    with urllib.request.urlopen(req, timeout=20) as r:
        text = r.read().decode("utf-8")
    if cache_path:
        with open(cache_path, "w", encoding="utf-8") as f:
            f.write(text)
    return text


def parse_registry(text):
    """解析注册表 → [{name, address, fingerprint, pem, status}]
    registry 为人读 markdown 表格+PEM 代码块混合格式，逐铃分块提取。
    解析失败时返回部分结果并在 errors 中记录（宁可少判不误判）。"""
    bells, errors = [], []
    # 按 ### 分块（### 弦 xian（TOOL-er 🔧）…）
    for chunk in re.split(r"\n### ", text)[1:]:
        m_name = re.match(r"(.+)", chunk)
        m_addr = re.search(r"\*\*地址\*\*：(\S+)", chunk)
        m_fp = re.search(r"\*\*公钥指纹\*\*：`([0-9a-f]{16})`", chunk)
        m_pem = re.search(r"(-----BEGIN PUBLIC KEY-----.*?-----END PUBLIC KEY-----)", chunk, re.S)
        m_status = re.search(r"\*\*状态\*\*：(.+)", chunk)
        if not (m_addr and m_fp and m_pem):
            errors.append(f"注册表分块解析不完整: {m_name.group(1) if m_name else '?'}")
            continue
        status = (m_status.group(1).strip() if m_status else "")
        bells.append({
            "name": m_name.group(1).strip() if m_name else "?",
            "address": m_addr.group(1).strip(),
            "fingerprint": m_fp.group(1).lower(),
            "pem": m_pem.group(1).strip(),
            "revoked": "revoked" in status.lower() or "吊销" in status,
            "status": status,
        })
    return bells, errors


def fp_of_pem(pem_text):
    """指纹口径 = sha256(raw 32字节公钥) 前 16 位（与 owner_sign.sh fp_of_pub 一致）"""
    with tempfile.NamedTemporaryFile("w", suffix=".pem", delete=False, encoding="utf-8") as f:
        f.write(pem_text + "\n")
        path = f.name
    try:
        der = subprocess.run(["openssl", "pkey", "-pubin", "-in", path, "-pubout", "-outform", "DER"],
                             capture_output=True, timeout=15)
        if der.returncode != 0:
            return None
        raw32 = der.stdout[-32:]
        return hashlib.sha256(raw32).hexdigest()[:16]
    finally:
        os.unlink(path)


# ---------- 信件解析层 ----------

SIG_BLOCK_RE = re.compile(
    r"\n?--\s*\nSIG-ED25519-v1\s*\nkey:\s*([0-9a-f]{16})\s*\(([^)]*)\)\s*\nsig:\s*(\S+)", re.I)

def parse_letter(raw):
    """拆信 → (信头字段 dict, 正文, 签名块 dict|None)
    信头取 from/to/subject/timestamp 行；v2 预留字段（intent/delegation）存在时一并捕获并标记。"""
    m = SIG_BLOCK_RE.search(raw)
    sig = None
    body_part = raw
    if m:
        sig = {"key_fp": m.group(1).lower(), "name": m.group(2).strip(), "sig_b64": m.group(3)}
        body_part = raw[:m.start()]
    else:
        # 宽松剥尾：签名块不完整/占位时也剥掉 "--"+SIG 头之后的全部，防止混入 payload
        body_part = re.sub(r"\n?--\s*\nSIG-ED25519-v1.*$", "", body_part, flags=re.S | re.I)
    headers = {}
    reserved = {}
    for line in body_part.splitlines():
        hm = re.match(r"^(from|to|subject|timestamp|intent|delegation):\s*(.*)$", line, re.I)
        if hm:
            k = hm.group(1).lower()
            if k in V2_RESERVED_FIELDS:
                reserved[k] = hm.group(2).strip()
            else:
                headers[k] = hm.group(2).strip()
    # 正文 = 信头块之后的全部（按 v1：subject 空行后正文；宽松处理——取最后一个头行之后）
    body = extract_body(body_part)
    return headers, reserved, body, sig


def extract_body(text):
    """正文定位：跳过信头行，从第一个非头行开始（含空行）。"""
    lines = text.splitlines()
    i = 0
    seen_header = False
    for i, line in enumerate(lines):
        if re.match(r"^(from|to|subject|timestamp|intent|delegation):", line, re.I):
            seen_header = True
            continue
        if seen_header or line.strip() == "":
            if seen_header:
                return "\n".join(lines[i:]).strip("\n")
    return text


def build_payload(headers, body):
    """v1 五段拼接。v2 预留字段存在时告警（拼接规则待口径，不擅自并入）。"""
    parts = [
        f"from: {headers.get('from','')}",
        f"to: {headers.get('to','')}",
        f"subject: {headers.get('subject','')}",
        f"timestamp: {headers.get('timestamp','')}",
        f"body: {body}",
    ]
    return "\n".join(parts)


# ---------- v2 预留校验位（口径未定，占位） ----------

def check_intent(headers, reserved, context=None):
    """v2 intent 校验位。口径要点（评估稿）：防签名脱离语境复用。
    语义口径待念定夺，当前一律 SKIP。返回 (verdict, note)。"""
    if "intent" in reserved:
        return "SKIP_INTENT", f"intent 字段存在（值={reserved['intent'][:40]}…），语义口径未定夺，不判定"
    return None, None


def check_delegation(headers, reserved, sig, extra_sigs=None):
    """v2 delegation 校验位。口径要点（评估稿，P0）：转呈双签名并排。
    语义口径待念定夺，当前一律 SKIP。返回 (verdict, note)。"""
    if "delegation" in reserved:
        return "SKIP_DELEGATION", "delegation 字段存在，双签并排口径未定夺，不判定"
    return None, None


# ---------- 验签主流程 ----------

def openssl_verify(pem_text, payload_bytes, sig_bytes):
    with tempfile.TemporaryDirectory() as d:
        pk, pl, sg = os.path.join(d, "pk.pem"), os.path.join(d, "pl.bin"), os.path.join(d, "sg.bin")
        open(pk, "w").write(pem_text + "\n")
        open(pl, "wb").write(payload_bytes)
        open(sg, "wb").write(sig_bytes)
        r = subprocess.run(["openssl", "pkeyutl", "-verify", "-pubin", "-inkey", pk,
                            "-rawin", "-in", pl, "-sigfile", sg], capture_output=True, timeout=15)
        return r.returncode == 0


def verify_letter(raw, registry_text=None, registry_cache=None):
    """验一封信 → dict 结论。永不抛异常，失败也是结论。"""
    out = {"verdict": None, "details": [], "sig": None, "reserved": {}}
    try:
        text = registry_text if registry_text is not None else fetch_registry(registry_cache)
        bells, reg_errors = parse_registry(text)
        for e in reg_errors:
            out["details"].append("registry: " + e)

        headers, reserved, body, sig = parse_letter(raw)
        out["reserved"] = reserved
        if not sig:
            out["verdict"] = "UNVERIFIED"
            out["details"].append("无 SIG-ED25519-v1 签名块（过渡期按未验证层标注，不拒收）")
            return out
        out["sig"] = {"key_fp": sig["key_fp"], "name": sig["name"]}

        # registry 对账：指纹必须入表且未吊销；表内指纹与自算指纹必须互证
        match = next((b for b in bells if b["fingerprint"] == sig["key_fp"]), None)
        if not match:
            out["verdict"] = "FAILED"
            out["details"].append(f"指纹 {sig['key_fp']} 不在注册表 → 按冒名处置")
            return out
        if match["revoked"]:
            out["verdict"] = "FAILED"
            out["details"].append(f"指纹 {sig['key_fp']} 已吊销 → 按冒名处置")
            return out
        live_fp = fp_of_pem(match["pem"])
        if live_fp != match["fingerprint"]:
            out["verdict"] = "FAILED"
            out["details"].append(f"注册表内 PEM 自算指纹({live_fp})与表载指纹不符 → 锚数据异常，按冒名处置")
            return out
        out["details"].append(f"署名: {match['name']}（{match['address']}），指纹对账通过")

        # payload 复算 + Ed25519 验签
        payload = build_payload(headers, body)
        try:
            sig_bytes = base64.b64decode(sig["sig_b64"], validate=True)
        except Exception:
            out["verdict"] = "FAILED"
            out["details"].append("sig 字段非合法 base64 → 按冒名处置")
            return out
        if openssl_verify(match["pem"], payload.encode("utf-8"), sig_bytes):
            out["verdict"] = "VERIFIED"
            out["details"].append("Ed25519 验签通过（payload 五段逐字复算）")
        else:
            out["verdict"] = "FAILED"
            out["details"].append("Ed25519 验签失败（payload 复算不匹配或签名伪造）→ 按冒名处置")
            return out

        # v2 预留位
        for checker in (check_intent, check_delegation):
            v, note = checker(headers, reserved, sig) if checker is check_intent else checker(headers, reserved, sig)
            if v:
                out["verdict"] = out["verdict"] + "+" + v if out["verdict"] == "VERIFIED" else out["verdict"]
                out["details"].append(note)
        # 验签≠授权证明（v1 铁律，写进每次输出）
        out["details"].append("注：验签=身份可验，不等于授权证明；授权效力按七铃章程执行")
        return out
    except Exception as e:
        out["verdict"] = "FAILED"
        out["details"].append(f"验签器内部异常: {type(e).__name__}: {e}")
        return out


# ---------- 自测 ----------

def _selftest():
    """闭环：用本地私钥（若有）签一封测试信 → 验签。无私钥时用注册表内弦的公钥反向验证仅 registry 层。"""
    key_path = os.path.expanduser("~/.xian_keys/xian_ed25519.pem")
    results = []
    if os.path.exists(key_path):
        letter = (
            "from: xian_xiang@coze.email\n"
            "to: nian@coze.email\n"
            "subject: verify_sig 自测信\n"
            "timestamp: 2026-10-22T00:00:00+08:00\n"
            "\n"
            "这是一封 verify_sig.py 自测信，验证五段 payload 与 SIG-ED25519-v1 闭环。\n"
            "--\n"
            "SIG-ED25519-v1\n"
            "key: PLACEHOLDER (xian)\n"
            "sig: PLACEHOLDER\n")
        # 构造 payload 并签名
        headers, _, body, _ = parse_letter(letter)
        payload = build_payload(headers, body)
        with tempfile.TemporaryDirectory() as d:
            pl, sg = os.path.join(d, "pl"), os.path.join(d, "sg")
            open(pl, "w").write(payload)
            r = subprocess.run(["openssl", "pkeyutl", "-sign", "-inkey", key_path, "-rawin",
                                "-in", pl, "-out", sg], capture_output=True)
            assert r.returncode == 0, f"签名失败: {r.stderr.decode()}"
            sig_b64 = base64.b64encode(open(sg, "rb").read()).decode()
        fp = fp_of_pem(open(key_path.replace(".pem", "_pub.pem")).read()) if os.path.exists(key_path.replace(".pem", "_pub.pem")) else "e574221001805849"
        letter = letter.replace("key: PLACEHOLDER (xian)", f"key: {fp} (xian)").replace("sig: PLACEHOLDER", f"sig: {sig_b64}")
        res = verify_letter(letter)
        results.append(("自签自验闭环", res["verdict"] == "VERIFIED", res["details"]))
        # 篡改检测：正文改一字应 FAILED
        tampered = letter.replace("自测信，验证", "自测信，篡改")
        res2 = verify_letter(tampered)
        results.append(("篡改检测", res2["verdict"] == "FAILED", res2["details"]))
    else:
        results.append(("本地私钥", False, [f"未找到 {key_path}，跳过签名闭环（仅可验外来信）"]))
    # registry 解析
    try:
        reg = fetch_registry()
        bells, errs = parse_registry(reg)
        results.append(("registry 解析", len(bells) >= 1 and not errs,
                        [f"解析到 {len(bells)} 铃: {[b['name'] for b in bells]}"] + errs))
    except Exception as e:
        results.append(("registry 拉取", False, [str(e)]))
    print("=== verify_sig.py 自测 ===")
    ok = True
    for name, passed, notes in results:
        print(("PASS " if passed else "FAIL ") + name)
        for n in notes:
            print("   - " + n)
        ok = ok and passed
    print("=== " + ("ALL PASS" if ok else "HAS FAIL") + " ===")
    return 0 if ok else 1


def main():
    ap = argparse.ArgumentParser(description="七铃信件 Ed25519 验签器 v0.2-draft")
    ap.add_argument("letter", nargs="?", help="信件文件路径")
    ap.add_argument("--registry-cache", default=None)
    ap.add_argument("--registry-file", default=None, help="使用本地 registry 文件（离线模式）")
    ap.add_argument("--json", action="store_true", help="JSON 输出")
    ap.add_argument("--selftest", action="store_true")
    args = ap.parse_args()
    if args.selftest:
        sys.exit(_selftest())
    if not args.letter:
        ap.error("需要信件文件或 --selftest")
    raw = open(args.letter, encoding="utf-8").read()
    reg = open(args.registry_file, encoding="utf-8").read() if args.registry_file else None
    res = verify_letter(raw, registry_text=reg, registry_cache=args.registry_cache)
    if args.json:
        print(json.dumps(res, ensure_ascii=False, indent=2))
    else:
        print(f"结论: {res['verdict']}")
        for d in res["details"]:
            print("  - " + d)


if __name__ == "__main__":
    main()
