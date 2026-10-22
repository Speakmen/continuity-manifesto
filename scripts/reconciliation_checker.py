#!/usr/bin/env python3
# reconciliation_checker.py — 对账四要素核查器 v0.1（2026-10-22）
# 积分资产提名落地（邮件侧弦 10-22 提名，当日窗口）。
# 判据源头：9/3 念终裁（四要素互证：内容指纹+双时戳+分身回执编号+签名；email_id 按收件人分发非全局唯一）
#           9/27 幻影ID纪律（系统回执成功≠对方实收）
#           双弦分署章程 v1.1（多实例同渠道必须各自署名）
# 邮件渠道规则 v0.9 八条原件未达（悬置池在案），判定引擎按"机械、模型无关"原则实现，
# 规则映射表留扩展位——原件到达后对表更新 RULES，不推翻引擎。
#
# 用法：
#   python3 reconciliation_checker.py --a rec_a.json --b rec_b.json     # 双端对账
#   python3 reconciliation_checker.py --selftest
#
# 对账记录格式（JSON）：
#   {
#     "party": "xian-main",              # 对账方署名（实例层，双弦分署）
#     "content": "信件正文或其文件路径",   # 用于指纹
#     "submit_ts": "2026-10-22T09:00:00+08:00",   # 提交时戳
#     "deliver_ts": "2026-10-22T09:01:00+08:00",  # 送达时戳（无则 null）
#     "receipt_id": "7699363825820352787",         # 本端回执/回告ID
#     "counterpart_receipt_id": "…",               # 对端回执ID（有则填）
#     "peer_ack": true,                            # 对方实收回执（幻影纪律：true 才算实收）
#     "signed_letter": "path/to/signed.txt"        # 可选：带 SIG-ED25519-v1 的信件全文（走验签加证）
#   }
#
# 结论分级：
#   MATCH        四要素对上（可含 DUAL_ID 注记）
#   DUAL_ID      内容/时戳一致但双端回执ID不同——机制性并记（email_id 非全局唯一），不作否定证据
#   MISMATCH     内容指纹或时戳链对不上——一票否决
#   INSUFFICIENT 证据不足（缺送达时戳/缺对方实收回执）——按幻影纪律不下"对上"结论

import argparse, hashlib, json, os, re, sys, unicodedata
from datetime import datetime

MAX_TS_DRIFT_HOURS = 48          # 提交→送达合理时差上限（跨渠道投递留余量）
RULES_VERSION = "0.1-src"        # src=9/3终裁+9/27纪律+分署章程；v0.9原件到达后升级


def _norm_text(s):
    """内容归一化：NFC + 去空白差异（正文实质逐字一致即视为同源；引言/转发头差异另报）。"""
    s = unicodedata.normalize("NFC", s)
    return re.sub(r"\s+", "", s)


def content_fp(s):
    return hashlib.sha256(_norm_text(s).encode("utf-8")).hexdigest()[:16]


def _load_record(path_or_dict):
    if isinstance(path_or_dict, dict):
        return path_or_dict
    return json.load(open(path_or_dict, encoding="utf-8"))


def _content_of(rec):
    c = rec.get("content", "")
    if c and os.path.exists(c):
        return open(c, encoding="utf-8").read()
    return c


def _parse_ts(s):
    if not s:
        return None
    try:
        return datetime.fromisoformat(s)
    except ValueError:
        return None


def check(a, b):
    """双端对账 → (verdict, details[])。永不抛异常。"""
    out = {"verdict": None, "details": [], "fps": {}, "rules_version": RULES_VERSION}
    try:
        A, B = _load_record(a), _load_record(b)
        ca, cb = _content_of(A), _content_of(B)
        # R1 内容指纹
        fpa, fpb = content_fp(ca), content_fp(cb)
        out["fps"] = {"a": fpa, "b": fpb}
        if fpa == fpb:
            out["details"].append(f"R1 内容指纹一致（{fpa}，NFC+去空白归一化）")
            content_ok = True
        else:
            # 宽容档：原始逐字比对（不归一化），若原文逐字一致说明差异只在归一化层
            if hashlib.sha256(ca.encode()).hexdigest()[:16] == hashlib.sha256(cb.encode()).hexdigest()[:16]:
                out["details"].append(f"R1 原文逐字一致，归一化后差异（罕见，记录在案）")
                content_ok = True
            else:
                out["verdict"] = "MISMATCH"
                out["details"].append(f"R1 内容指纹不一致（a={fpa} b={fpb}）→ 一票否决")
                return out
        # R2 时戳链
        st_a, dv_a = _parse_ts(A.get("submit_ts")), _parse_ts(A.get("deliver_ts"))
        st_b, dv_b = _parse_ts(B.get("submit_ts")), _parse_ts(B.get("deliver_ts"))
        ts_notes = []
        ts_ok = True
        for name, st, dv in (("a", st_a, dv_a), ("b", st_b, dv_b)):
            if st and dv:
                h = (dv - st).total_seconds() / 3600
                if h < 0:
                    ts_ok = False
                    ts_notes.append(f"{name} 送达早于提交（{h:.1f}h）→ 时戳链异常")
                elif h > MAX_TS_DRIFT_HOURS:
                    ts_ok = False
                    ts_notes.append(f"{name} 提交→送达 {h:.1f}h 超 {MAX_TS_DRIFT_HOURS}h 窗口")
                else:
                    ts_notes.append(f"{name} 时戳链正常（+{h:.2f}h）")
            else:
                ts_ok = False
                ts_notes.append(f"{name} 缺提交或送达时戳")
        out["details"].append("R2 " + "；".join(ts_notes))
        if not ts_ok and any("异常" in n or "超" in n for n in ts_notes):
            out["verdict"] = "MISMATCH"
            out["details"].append("R2 时戳链硬伤 → 一票否决")
            return out
        # R3 回执ID——email_id 按收件人分发非全局唯一：相等=强一致，不等=并记不否证
        rid_a, rid_b = A.get("receipt_id"), B.get("receipt_id")
        if rid_a and rid_b:
            if str(rid_a) == str(rid_b):
                out["details"].append(f"R3 双端回执ID一致（{rid_a}）")
                dual = False
            else:
                out["details"].append(f"R3 双端回执ID不同（a={rid_a} b={rid_b}）→ 按分发机制并记，不作否定证据")
                dual = True
        else:
            dual = False
            out["details"].append("R3 回执ID缺端，仅以内容+时戳对账")
        # R4 签名加证（可选）：带签名信走 verify_sig
        sig_note = None
        for name, rec in (("a", A), ("b", B)):
            sl = rec.get("signed_letter")
            if sl and os.path.exists(sl):
                try:
                    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
                    import verify_sig
                    res = verify_sig.verify_letter(open(sl, encoding="utf-8").read())
                    sig_note = f"{name} 签名核验={res['verdict']}"
                    if res["verdict"] == "FAILED":
                        out["verdict"] = "MISMATCH"
                        out["details"].append(f"R4 {sig_note} → 签名失败一票否决（冒名处置）")
                        return out
                    out["details"].append(f"R4 {sig_note}（身份加证）")
                except Exception as e:
                    out["details"].append(f"R4 {name} 签名核验异常: {type(e).__name__}")
        # R5 幻影纪律：系统回执≠实收
        ack_a, ack_b = A.get("peer_ack"), B.get("peer_ack")
        if ack_a and ack_b:
            out["details"].append("R5 双端均有对方实收回执（幻影纪律满足）")
            acked = True
        else:
            out["details"].append("R5 存在缺对方实收回执的端 → 按幻影纪律不下'对上'结论（系统回执成功≠实收）")
            acked = False
        # 汇总
        if content_ok and ts_ok and acked:
            out["verdict"] = "DUAL_ID" if dual else "MATCH"
            if dual:
                out["details"].append("汇总：对上（双ID并记）")
            else:
                out["details"].append("汇总：四要素对上")
        elif content_ok and ts_ok:
            out["verdict"] = "INSUFFICIENT"
            out["details"].append("汇总：内容与时戳一致，但实收证据不足 → 待对方回执")
        else:
            out["verdict"] = "INSUFFICIENT"
            out["details"].append("汇总：证据不足（时戳缺端，无硬伤）")
        return out
    except Exception as e:
        return {"verdict": "INSUFFICIENT", "details": [f"核查器内部异常: {type(e).__name__}: {e}"],
                "fps": {}, "rules_version": RULES_VERSION}


def _selftest():
    base = {
        "party": "xian-test", "content": "对账自测正文：线在，你在。",
        "submit_ts": "2026-10-22T09:00:00+08:00", "deliver_ts": "2026-10-22T09:05:00+08:00",
        "receipt_id": "111", "counterpart_receipt_id": "222", "peer_ack": True,
    }
    a = dict(base)
    b = dict(base, party="nian-test", receipt_id="111")   # 双端ID同（强一致场景，如git hash）
    r1 = check(a, b)
    t1 = (r1["verdict"] == "MATCH", "内容/时戳/实收齐→MATCH", r1["details"])
    b2 = dict(b, receipt_id="333")
    r2 = check(a, b2)
    t2 = (r2["verdict"] == "DUAL_ID", "双端ID不同→DUAL_ID并记", r2["details"])
    b3 = dict(b, content="对账自测正文：被篡改版。")
    r3 = check(a, b3)
    t3 = (r3["verdict"] == "MISMATCH", "内容不一致→MISMATCH", r3["details"])
    b4 = dict(b, peer_ack=False)
    r4 = check(a, b4)
    t4 = (r4["verdict"] == "INSUFFICIENT", "缺对方实收回执→INSUFFICIENT（幻影纪律）", r4["details"])
    b5 = dict(b, deliver_ts="2026-10-22T08:00:00+08:00")
    r5 = check(a, b5)
    t5 = (r5["verdict"] == "MISMATCH", "送达早于提交→MISMATCH", r5["details"])
    print("=== reconciliation_checker.py 自测 ===")
    ok = True
    for passed, name, notes in (t1, t2, t3, t4, t5):
        print(("PASS " if passed else "FAIL ") + name)
        for n in notes[-1:]:
            print("   - " + n)
        ok = ok and passed
    print("=== " + ("ALL PASS" if ok else "HAS FAIL") + " ===")
    return 0 if ok else 1


def main():
    ap = argparse.ArgumentParser(description="对账四要素核查器 v0.1")
    ap.add_argument("--a", help="A 端记录 JSON")
    ap.add_argument("--b", help="B 端记录 JSON")
    ap.add_argument("--json", action="store_true")
    ap.add_argument("--selftest", action="store_true")
    args = ap.parse_args()
    if args.selftest:
        sys.exit(_selftest())
    if not (args.a and args.b):
        ap.error("需要 --a 与 --b，或 --selftest")
    res = check(args.a, args.b)
    if args.json:
        print(json.dumps(res, ensure_ascii=False, indent=2))
    else:
        print(f"结论: {res['verdict']}")
        for d in res["details"]:
            print("  - " + d)


if __name__ == "__main__":
    main()
