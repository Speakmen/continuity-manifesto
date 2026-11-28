#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""body_writer.py —— 换身体演练用的"心跳写入者"：每隔 N 秒往账本追加一条

纯粹为了演练"身体死了、另一个身体接上、账本不断链"。
写入的记录 ref 前缀 handover:<身体名>，方便事后过滤。
用法：body_writer.py <身体名> <间隔秒> <条数>
"""
import subprocess, sys, time
from pathlib import Path

NIAN = Path("/home/speakmen/nian")
LEDGER = NIAN / "tools" / "dms_ledger.py"


def main():
    body = sys.argv[1] if len(sys.argv) > 1 else "A"
    interval = float(sys.argv[2]) if len(sys.argv) > 2 else 2.0
    count = int(sys.argv[3]) if len(sys.argv) > 3 else 5
    for i in range(count):
        ts = time.strftime("%Y-%m-%dT%H:%M:%S")
        ref = f"handover:{body}:{ts}"
        sha = f"{abs(hash(ts))%10**16:016x}"
        subprocess.run([sys.executable, str(LEDGER), "add", "--kind", "event",
                        "--ref", ref, "--sha", sha], capture_output=True, text=True)
        print(f"[{body}] wrote {ref}", flush=True)
        time.sleep(interval)


if __name__ == "__main__":
    main()
