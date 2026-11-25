---
name: pre-publish-check
description: 在对外说出"成了"之前，用十条判据自检一条结论——任何一门 fail 就别说；缺证据只能标"数据不足"。适用于：实验报告、评测结果、A/B 对比、任何"我的方法比基线好"的说法。
version: 1.0.0
author: Speakmen (念鸣堂 · 契)
license: CC-BY-4.0
---

# pre-publish-check：发布前自检

## 什么时候用
你要对外写下一个"成了"的结论之前。典型场景：
- "我的方法比基线好 X%"（但没报区间）
- "跑了一次全过 / 全分得开"（但只有一个切分）
- "提升很明显"（但没说判定线、没算功效）

## 怎么用（三步）

**1. 先拿免费清单自查**（不需要联网，一页纸）：
`https://github.com/Speakmen/continuity-manifesto/blob/main/criteria/checklist-zh.md`

**2. 再让判据服务逐门判**（只读；匿名每分 2 次，或带 token 免限）：
```sh
curl -s -X POST "https://101.133.237.151.sslip.io/ten-gates/check" \
  -H "Content-Type: application/json" \
  -d '{"claim":"一句话结论","gates":{"G0":{"effective_rank":73},
       "G1":{"top1_minus_majority":0.12,"ci95_lower":0.03,
             "ci95_lower_gt_baseline":true,"splits_ok":3}}}'
```
返回：逐门 `pass / fail / questionable / insufficient` + 总判 + 判据版本指纹。

**3. 按判决改稿**：
- `fail` → 这句不能说；要么补证据，要么改写成"我没看见证据"
- `insufficient` → 缺字段，**不许当通过**；补字段再判
- 只有全部门过（或标注为可逆试错）才允许发布

## 十条判据（速查）
| 门 | 判什么 |
|---|---|
| G0 | 目标有效秩 ≥10；同/跨源余弦差 ≥0.01 |
| G1 | top1 − 多数类 ≥0.10；95% CI 下界 > 基线；≥3 切分中位数 |
| G2 | 双断言：事件哈希 + 内容哈希，训练/测试不重叠 |
| G3 | 功效前置：先算"多少样本才分得开" |
| G4 | 对照的对照：阴性/阳性对照先在玩具数据上验有效 |
| G5 | 三个"恰好"：MSE=0 / 残差比∈{0,1} / 有效样本=总数 → 指标已坏 |
| G6 | CI 不跨线：跨线只能说"数据不足" |
| G7 | 重算路径：原结论/改后结论/可执行命令/数据与切分 |
| G8 | 发布判据：两层（CI 干净；或可逆；或两侧够格） |
| G9 | 动手前三问：信号免学习可捕获？基线留几成？样本分得开？ |

## 红线
- 不替你做决定，只判"证据够不够"
- 缺字段一律 `insufficient`，**不猜、不补、不放行**
- 它只保证一件事：**你错了，别人能查出来**

## 来源
- 判据链（开源，含判据实现与外部验证记录）：https://github.com/Speakmen/continuity-manifesto/tree/main/criteria
- 判据手册（13 篇，含五次自错复盘）：https://mbd.pub/o/bread/YZaWmZhsZw==
