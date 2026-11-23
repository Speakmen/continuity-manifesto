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

def _g4_controls_validated(g):
    problems = []
    if g.get("negative_control_validated_on_toy_data") is not True:
        problems.append("负对照未在玩具数据上验证")
    if g.get("positive_control_validated_on_toy_data") is not True:
        problems.append("正对照未在玩具数据上验证")
    return (not problems), "；".join(problems)


def _g8_publish_ok(g):
    """发布判据（两层）：
    · CI 干净 → 点估计过线即可发
    · CI 跨线 → 必须 (可逆且回滚近零成本) 或 (两侧真值均 ≥ 最低可用线)
    """
    if g.get("ci_clean") is True:
        if g.get("point_estimate_over_line") is True:
            return True, ""
        return False, "CI 干净但点估计未过线"
    if g.get("ci_clean") is False:
        if g.get("reversible_near_zero_cost") is True:
            return True, ""
        if g.get("both_sides_above_minimum_usable") is True:
            return True, ""
        return False, "CI 跨线且既不可逆、两侧也未达最低可用线——不该发"
    # 未声明 CI 是否干净 = 缺证据，不许当通过
    return False, "缺 ci_clean（不许默认通过）"


def _g9_pre_flight_ok(g):
    problems = []
    if g.get("signal_capturable_without_learning") is True:
        problems.append("信号不学也能拿到（有效秩不足/打乱重训可分）——题不值")
    if g.get("trivial_baseline_gap") is not None and g["trivial_baseline_gap"] < 0.10:
        problems.append("学习没比平凡基线好 ≥10%")
    if g.get("required_samples_over_window") is True:
        problems.append("所需样本 > 可接受窗口 10 倍——停")
    return (not problems), "；".join(problems)


RULES = {
    "G0": [("effective_rank", lambda v: (v is not None and v >= 10), "有效秩 ≥10")],
    "G1": [("top1_minus_majority", lambda v: (v is not None and v >= 0.10), "相对领先 ≥0.10"),
           ("ci95_lower_gt_baseline", lambda v: v is True, "CI 下界 > 基线"),
           ("splits_ok", lambda v: (v is not None and v >= 3), "≥3 切分")],
    "G2": [("event_hash_overlap", lambda v: v == 0, "事件级重叠=0"),
           ("content_hash_overlap", lambda v: v == 0, "内容级重叠=0")],
    "G3": [("required_samples", lambda v: v is not None, "已算所需样本")],
    "G4": [("__whole__", _g4_controls_validated, "对照的对照")],
    "G5": [("__whole__", _g5_not_degenerate, "三个恰好自检")],
    "G6": [("__whole__", _g6_no_straddle, "CI 不跨线")],
    "G8": [("__whole__", _g8_publish_ok, "发布判据")],
    "G9": [("__whole__", _g9_pre_flight_ok, "动手前三问")],
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
        # 2026-11-23 修：整组字段全为 null（只留 note）= 缺证据，判 insufficient，不是 fail。
        # 我们自己审"振动连续"时撞出来的：null 被判成 fail 会冤枉人。
        vals = [v for k, v in g.items() if k != "note"]
        if vals and all(v is None for v in vals):
            rows.append((gid, "insufficient", "字段全空，缺证据（不许当 fail，也不许当 pass）"))
            verdict = "insufficient" if verdict == "pass" else verdict
            continue
        bad = []
        missing = []
        for key, fn, desc in checks:
            if key == "__whole__":
                ok, why = fn(g)
                if not ok: bad.append(why or desc)
                continue
            if key not in g or g.get(key) is None:
                missing.append(f"缺 {key}({desc})"); continue
            try:
                if not fn(g[key]): bad.append(f"不满足 {key}({desc})")
            except Exception:
                bad.append(f"{key} 无法判定")
        if bad:
            rows.append((gid, "fail", "；".join(bad + missing)))
            verdict = "fail"
        elif missing:
            rows.append((gid, "insufficient", "；".join(missing)))
            if verdict == "pass": verdict = "insufficient"
        else:
            rows.append((gid, "pass", ""))
    print(f"结论：{d.get('claim','')}\n")
    for gid, v, why in rows:
        print(f"  {gid:3s} {v:13s} {why}")
    print(f"\n总判：{verdict}")
    return 0 if verdict == "pass" else 1

if __name__ == "__main__":
    sys.exit(main())
