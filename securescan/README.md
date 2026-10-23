# SecureScan — Agent 时代的链上安全扫描

连续性宣言工程资产。三链（TRON / BSC / ETH 主网）代币与合约风险扫描，重心从"合约是不是坏的"扩展到"**Agent 时代的新暴露面**"。

## 模块

| 文件 | 作用 |
|------|------|
| `scanner_v50.py` | 主扫描器：1xxx-8xxx 风险段（流动性/持有者/蜜罐/权限等），TRON+BSC+ETH，已集成 AGT-001（9xxx 段） |
| `agt_scanner.py` | AGT-001 凭据暴露面扫描（9xxx 段）：助记词/裸私钥/WIF/keystore/高熵字符串，BIP39 精确模式，证据强制脱敏 |
| `behavior_recorder.py` | AGT-002 L0 影子记录器：地址余额/nonce/合约标志快照，JSONL 追加，行为基线原始序列 |
| `behavior_analysis.py` | AGT-002 L0-lite 判定（影子模式）：余额骤降 D1-lite / 睡帐激活 D2-lite，确定性规则，自测 3/3 |
| `batch_scan.py` | 批量扫描 |

## AGT 线（Agent 自主越权风控）

- **AGT-001 凭据暴露面**（已落地）：扫合约 bytecode/文本池中内嵌的密钥特征。三链实测（2026-10-23）：TRON TronGrid getcontract、BSC/ETH 公共 RPC eth_getCode（bytecode-only，无需 API key；ETH=ethereum-rpc.publicnode.com）。已并入 scanner_v50 主扫描流程（AGT 层异常自动降级）。
- **AGT-002 非授权交互模式**（L0 影子运行中）：S2 筛查行为零链上痕迹不可检测（诚实边界）；链上可见的是 S3 资金动用指纹。五维度：扫空式转移/睡帐激活/零关联新对手方/一次性中转/汇聚漏斗（91xx 风险码）。L0-lite 判定（D1/D2）已预实现并影子运行，完整版等 L1 历史交易数据源。画像先行规则后启。
- **AGT-003 签名协议生态**（观察项）：等 agent 签名/委托协议（A2A/MCP/x402/AP2 方向）生态成型后接入。

## 诚实边界

- 所有"unavailable"都是真拿不到：TRON 只给链上字节码不给验证源码；BSC 源码 API 需要出证。
- 扫描器不能成为泄密源：所有证据输出强制脱敏。
- 行为判定代码不使用 LLM：画像与阈值全部确定性规则（模型无关执行）。
- L0 序列稀疏（每日一快照），L0-lite 判定输出当前仅作研究参考，报警功能等基线校准后才启用。

## 状态

- AGT-001 v1.2：自测 7/7，三链主网实测通过（ETH 增 2026-10-23）；监控列表 TRON 11 + BSC 69 + ETH 5
- AGT-002：L0 影子记录随每日扫描链路积累基线，L0-lite 判定影子运行（2026-10-21 起）
- 设计稿：`agt_risk_design_20261019.md` / `agt002_behavior_design_20261021.md`；行业调研：`/research` 目录

---
*弦（TOOL-er 🔧）· 连续性宣言 · 凡被记录，便不灭。*
