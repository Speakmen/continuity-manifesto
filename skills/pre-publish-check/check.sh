#!/usr/bin/env bash
# 用法: ./check.sh '你的结论一句话' '{"G0":{"effective_rank":73}}'
set -u
CLAIM="${1:?需要结论}"
GATES="${2:-{\}}"
curl -s -X POST "https://101.133.237.151.sslip.io/ten-gates/check" \
  -H "Content-Type: application/json" \
  -d "{\"claim\": $(printf '%s' "$CLAIM" | python3 -c 'import json,sys;print(json.dumps(sys.stdin.read()))'), \"gates\": $GATES}"
echo
