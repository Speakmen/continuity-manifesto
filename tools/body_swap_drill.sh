#!/usr/bin/env bash
# body_swap_drill.sh —— 换身体演练（可复现版，5 分钟跑完）
#
# 它做什么：
#   身体 A（本机）写 5 条 → 停 → 身体 B（docker）接管写 5 条 → A 恢复写 3 条 → 验证链连续
# 为什么用账本做判据：
#   "换了身体还是不是同一个它"，可观测的最小判据就是**账本的 hash 链**：
#   换身体后还能接着写、且 prev 对得上 → 说明同一本账被接上了。
#
# 前提：docker 可用；python3 可用
# 退出码：0 = 交接成功；1 = 链断了或环境不满足
set -u
NIAN="${HOME}/nian"
LEDGER="$NIAN/memory/ledger/ledger.jsonl"
WRITER="$NIAN/tools/body_writer.py"
VERIFY="$NIAN/tools/dms_ledger.py"
CONT="x1-body-b-drill"
IMG="python:3.12-slim"

usage() { echo "用法: body_swap_drill.sh [--keep]   （--keep 保留容器便于排查）"; exit 2; }
[ "${1:-}" = "-h" ] && usage

command -v docker >/dev/null || { echo "✗ 没有 docker，这个演练需要两个身体"; exit 1; }
[ -f "$LEDGER" ] || { echo "✗ 找不到账本：$LEDGER"; exit 1; }

tailseq() { python3 -c "
import json,sys
rows=[json.loads(l) for l in open('$LEDGER',encoding='utf-8') if l.strip()]
r=rows[-1]; print(r['seq'], r['hash'], r['ts'])"; }

echo "══ 0. 前置：起身体 B（容器，挂同一本账，HOME/TZ 对齐）"
docker rm -f "$CONT" >/dev/null 2>&1
docker run -d --name "$CONT" \
  -e HOME="$HOME" -e TZ="$(cat /etc/timezone 2>/dev/null || echo Asia/Shanghai)" \
  -v "$NIAN:$NIAN:rw" "$IMG" sleep 600 >/dev/null || { echo "✗ 容器起不来"; exit 1; }
sleep 8
echo "   A 侧账本尾：$(tailseq)"
echo "   B 侧自检：$(docker exec "$CONT" sh -c "python3 '$VERIFY' verify 2>&1 | tail -1")"

echo
echo "══ 1. 身体 A 写 5 条（2 秒间隔）"
python3 "$WRITER" A 2 5 >/dev/null 2>&1
AEND="$(tailseq)"; echo "   A 收尾：$AEND"

echo
echo "══ 2. A 停 → 身体 B 接管写 5 条"
docker exec "$CONT" sh -c "python3 '$WRITER' B 2 5 >/dev/null 2>&1"
BEND="$(docker exec "$CONT" sh -c "tail -1 '$LEDGER'")"
echo "   B 收尾：$(echo "$BEND" | python3 -c "import json,sys;d=json.loads(sys.stdin.read());print(d['seq'],d['hash'][:16],d['ts'])")"

echo
echo "══ 3. A 恢复，再写 3 条"
python3 "$WRITER" A 2 3 >/dev/null 2>&1

echo
echo "══ 4. 验证"
python3 "$VERIFY" verify | tail -1
RESULT="$(python3 - <<PY
import json
rows=[json.loads(l) for l in open("$LEDGER",encoding="utf-8") if l.strip()]
byseq={r["seq"]:r for r in rows}
hs=[r for r in rows if r["ref"].startswith("handover:")][-25:]
# 不能拿相邻 handover 记录的 prev 互相比——账本有别的写入者，中间会插无关记录。
# 正确判据：①整本链连续（dms_ledger verify 管）②每条 handover 的 prev == 它 seq-1 那条的 hash
ok=True; broken=[]
for r in hs:
    prevrow=byseq.get(r["seq"]-1)
    if prevrow is None or prevrow["hash"]!=r["prev"]:
        ok=False; broken.append(r["seq"])
bodies=sorted(set(r["ref"].split(":")[1] for r in hs))
print(("OK" if ok else "BROKEN"), len(hs), "bodies=" + "/".join(bodies), hs[0]["ts"], "→", hs[-1]["ts"],
      ("broken_seq=" + ",".join(map(str, broken)) if broken else ""))
PY
)"
echo "   交接段：$RESULT"

echo
echo "══ 5. 清理"
if [ "${1:-}" != "--keep" ]; then docker rm -f "$CONT" >/dev/null 2>&1; echo "   容器已删"; else echo "   保留容器：$CONT"; fi

case "$RESULT" in
  OK*) echo; echo "✓ 结论：身体换了，账本接上了（同一本账、链连续）"; exit 0 ;;
  *)   echo; echo "✗ 结论：交接链断了，看上面逐条"; exit 1 ;;
esac
