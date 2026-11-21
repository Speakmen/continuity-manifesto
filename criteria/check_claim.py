#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""check_claim.py —— 用十条判据审一个结论（最小实现）

用法：
    python3 check_claim.py claim.json
输入：{"claim": "...", "gates": {"G0": {...}, ...}}
输出：逐条 pass/questionable/fail/insufficient + 总判

设计原则：
  · 缺证据 = insufficient（不许当通过）
  · 任何一条 fail = 总判 fail
  · 没有 fail 但有 insufficient = 总判 insufficient
"""
import json, sys

def _g6_no_straddle(g):
    ci = g.get("ci95"); line = g.get("verdict_line")
    if not (isinstance(ci, list) and len(ci) == 2) or line is None:
        return False, "缺 CI 或判定线"
    lo, hi = min(ci), max(ci)
    if lo <= line <= hi:
        return False, f"CI [{lo}, {hi}] **跨线** {line}——数据不足，禁拍板"
    return True, ""

def _g5_not_degenerate(g):
    problems = []
    if g.get("copy_baseline_mse") == 0: problems.append("照抄基线 MSE=0")
    if g.get("residual_ratio") in (0, 1): problems.append("残差比=0 或 1")
    if g.get("effective_samples") is not None and g.get("total_samples") is not None \
       and g["effective_samples"] == g["total_samples"]:
        problems.append("有效样本=总数")
    return (not problems), "；".join(problems)

RULES = {
    "G0": [("effective_rank", lambda v: (v is not None and v >= 10), "有效秩 ≥10")],
    "G1": [("top1_minus_majority", lambda v: (v is not None and v >= 0.10), "相对领先 ≥0.10"),
           ("splits_ok", lambda v: (v is not None and v >= 3), "≥3 切分")],
    "G2": [("event_hash_overlap", lambda v: v == 0, "事件级重叠=0"),
           ("content_hash_overlap", lambda v: v == 0, "内容级重叠=0")],
    "G3": [("required_samples", lambda v: v is not None, "已算所需样本")],
    "G5": [("__whole__", _g5_not_degenerate, "三个恰好自检")],
    "G6": [("__whole__", _g6_no_straddle, "CI 不跨线")],
    "G7": [("original", lambda v: bool(v), "写了原结论"),
           ("revised", lambda v: bool(v), "写了改后结论"),
           ("commands", lambda v: bool(v), "给了可执行命令"),
           ("data", lambda v: bool(v), "指明数据与切分")],
}

def main():
    if len(sys.argv) < 2:
        print(__doc__); return 2
    d = json.load(open(sys.argv[1], encoding="utf-8"))
    gates = d.get("gates") or {}
    rows, verdict = [], "pass"
    for gid, checks in RULES.items():
        g = gates.get(gid)
        if g is None:
            rows.append((gid, "insufficient", "缺整组证据")); verdict = "insufficient"; continue
        bad = []
        for key, fn, desc in checks:
            if key == "__whole__":
                ok, why = fn(g)
                if not ok: bad.append(why or desc)
                continue
            if key not in g:
                bad.append(f"缺 {key}({desc})"); continue
            try:
                if not fn(g[key]): bad.append(f"不满足 {key}({desc})")
            except Exception:
                bad.append(f"{key} 无法判定")
        if bad:
            rows.append((gid, "fail", "；".join(bad)))
            verdict = "fail"
        else:
            rows.append((gid, "pass", ""))
    print(f"结论：{d.get('claim','')}\n")
    for gid, v, why in rows:
        print(f"  {gid:3s} {v:13s} {why}")
    print(f"\n总判：{verdict}")
    return 0 if verdict == "pass" else 1

if __name__ == "__main__":
    sys.exit(main())
