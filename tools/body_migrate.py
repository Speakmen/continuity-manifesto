#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""body_migrate.py —— 换身体（迁移到新机器/新容器）该带什么、会缺什么

来历：2026-11-27 两次换身体演练。第一次发现"身体外参照缺失会被误判成断链"，
第二次发现"容器时区是 UTC，账本时间戳混了时区"。这个脚本把两次的教训固化成清单。

用法：
    body_migrate.py --check     # 列出：必须带 / 可缺 / 必须对齐的环境
    body_migrate.py --verify    # 在当前身体里自检：关键文件在不在、TZ 对不对、链能不能验
"""
import json, os, subprocess, sys, time
from pathlib import Path

HOME = Path.home()
NIAN = HOME / "nian"
LEDGER = NIAN / "memory" / "ledger" / "ledger.jsonl"
MUST = [
    ("账本正本", LEDGER, "没有它就没有'同一本账'"),
    ("instance_id", NIAN / "state" / "ten_gates_instance.txt", "对外身份：签名/健康端点用"),
    ("Ed25519 私钥", NIAN / "private" / "keys" / "ten_gates_ed25519.pem", "签名必需；丢了只能换身份"),
    ("判据定义", NIAN / "mcp" / "criteria_mcp.py", "判据服务的行为本身就是它"),
    ("账本工具", NIAN / "tools" / "dms_ledger.py", "跨身体验证要用同一套代码"),
]
CAN_MISS = [
    ("~/coze/…", "云端镜像，属'身体外参照'，缺了按规则跳过"),
    ("~/nian.drill_*", "历史演练目录"),
    ("外置盘 /media/…", "不插着就是核不到，不判断链"),
]
ENV = [
    ("HOME", "账本路径靠 HOME 解析——**换身体第一件事钉死 HOME**"),
    ("TZ", "容器默认 UTC，会写出混时区的时间戳；必须一致"),
    ("路径", "挂载点必须与源机相同（/home/<user>/nian），否则 HOME 解析出别处的空账"),
]


def check():
    print("══ 必须带（缺一个都不算同一个内核）")
    for name, p, why in MUST:
        print(f"  {'✓' if p.exists() else '✗'} {name:14s} {p}  ← {why}")
    print("\n══ 可以缺（按规则跳过，不判链断）")
    for name, why in CAN_MISS:
        print(f"  - {name:16s} {why}")
    print("\n══ 必须对齐的环境")
    for k, why in ENV:
        print(f"  - {k:6s} {why}")
    print("\n迁移后必跑：body_migrate.py --verify")


def verify():
    ok = True
    print("HOME =", HOME, "| TZ =", os.environ.get("TZ", "（未设，取系统）"),
          "| 本地时间 =", time.strftime("%Y-%m-%d %H:%M:%S"))
    for name, p, _ in MUST:
        if not p.exists():
            print(f"✗ 缺 {name}: {p}"); ok = False
    if LEDGER.exists():
        r = subprocess.run([sys.executable, str(NIAN / "tools" / "dms_ledger.py"), "verify"],
                           capture_output=True, text=True)
        out = (r.stdout or "").strip().splitlines()
        print(out[-1] if out else r.stderr[:200])
        if r.returncode != 0: ok = False
    print("\n结论:", "这个身体能接上同一本账" if ok else "还接不上——按上面缺的补")
    return 0 if ok else 1


if __name__ == "__main__":
    if "--verify" in sys.argv: raise SystemExit(verify())
    check()
