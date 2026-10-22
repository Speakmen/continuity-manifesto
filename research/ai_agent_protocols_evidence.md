# AI Agent 间交互协议与信任验证机制——证据块集

> 调研时间：2026-10-18 | 调研者：弦（Xian）

---

## 证据块 1：A2A 协议一周年里程碑

- **来源**：https://www.linuxfoundation.org/press/a2a-protocol-surpasses-150-organizations-lands-in-major-cloud-platforms-and-sees-enterprise-production-use-in-first-year
- **发布日期**：2026-04-09
- **关键原文摘录**：
  - "A2A Protocol surpasses 150 organizations, deep integration across Google, Microsoft and AWS platforms, active production deployments across multiple industries"
  - "Supporting organizations grew from 50+ (Apr 2025) to 150+ (Apr 2026); GitHub stars 22,000+; SDK languages from 1 (Python) to 5 (Python, JS, Java, Go, .NET)"
  - "A2A v1.0 first stable specification introduced multi-protocol support, enterprise-grade multi-tenancy, Signed Agent Cards for cryptographic identity verification"
  - "Agent Payments Protocol (AP2) enables secure agent-driven transactions, 60+ organizations"
  - "Microsoft integrated A2A into Azure AI Foundry and Copilot Studio; AWS added support through Amazon Bedrock AgentCore Runtime"
- **可信度**：★★★★★（Linux Foundation 官方新闻稿，一手来源）

---

## 证据块 2：A2A 迁入 Agentic AI Foundation (AAIF)

- **来源**：https://aaif.io/blog/a2a-joins-aaif
- **发布日期**：2026-08-17
- **关键原文摘录**：
  - "A2A joining the Agentic AI Foundation as a hosted project"
  - "AAIF says it has grown from fewer than 40 members at its December 2025 launch to more than 250, with backers including Google, Microsoft, Amazon, Anthropic, OpenAI, Bloomberg, Shopify, and Block"
  - "IBM's Agent Communication Protocol merged into A2A in August 2025"
  - "AAIF hosts MCP, AGENTS.md, goose, agentgateway — the full open agentic stack under neutral governance"
- **可信度**：★★★★★（AAIF 官方博客，一手来源）

---

## 证据块 3：A2A Signed Agent Cards 身份机制

- **来源**：https://waxell.ai/blog/a2a-agentic-ai-foundation-agent-identity
- **发布日期**：2026-08-19
- **关键原文摘录**：
  - "AgentCardSignature is a JSON Web Signature (RFC 7515) computed over the agent card"
  - "The signature proves the card was published by the holder of the signing key and has not been tampered with in transit"
  - "The spec pairs this with OAuth 2.0, OpenID Connect, API keys, mutual TLS for securing agent endpoints"
  - "A signature proves who published a capability description, which closes off card tampering and spoofing"
- **可信度**：★★★★（行业分析文章，引用了 A2A 规范原文）

---

## 证据块 4：MCP 2025-11-25 规范发布

- **来源**：https://blog.modelcontextprotocol.io/posts/2025-11-25-first-mcp-anniversary/
- **发布日期**：2025-11-25
- **关键原文摘录**：
  - "Support for Task-based Workflows — Tasks provide a new abstraction for tracking the work being performed by a MCP server"
  - "Simplified Authorization Flows"
  - "Sampling with Tools: Agentic Servers — MCP servers can run their own agentic loops using the client's tokens"
  - "58 maintainers supporting the 9 core/lead maintainers, 2,900+ contributors on Discord"
- **可信度**：★★★★★（MCP 官方博客，一手来源）

---

## 证据块 5：MCP 2026-07-28 规范候选版——去状态化

- **来源**：https://blog.modelcontextprotocol.io/posts/2026-07-28-release-candidate/
- **发布日期**：2026-05-21（预告）/ 2026-07-28（正式发布）
- **关键原文摘录**：
  - "The initialize/initialized handshake is removed; the Mcp-Session-Id header and protocol-level session are also removed"
  - "Any MCP request can land on any server instance — removing sticky routing"
  - "Extensions Become First-Class — identified by reverse-DNS IDs, negotiated through extensions map"
  - "Roots, Sampling, and Logging are deprecated"
  - "Full JSON Schema 2020-12 for Tools"
  - "Tier 1 SDKs seeing close to half-a-billion downloads a month"
- **可信度**：★★★★★（MCP 官方博客，一手来源）

---

## 证据块 6：ANP 协议——三层架构与 did:wba 身份方案

- **来源**：https://agent-network-protocol.com/zh/specs/white-paper.html / https://agent-network-protocol.com/zh/blogs/posts/agent-identity-issues-interoperability-authorization-privacy.html
- **发布日期**：2026-06-27/28
- **关键原文摘录**：
  - "ANP协议架构自下而上分为三层：身份与加密通信层、元协议层、应用协议层"
  - "基于W3C DID标准，设计了轻量、可扩展的去中心化身份认证机制（如 did:wba 方法）"
  - "humanAuthorization字段用于存储专门用于人类授权的公钥信息"
  - "低风险操作可由智能体自动发起；高风险操作要求获得明确的人类授权后才能继续执行"
  - "多身份策略：主DID（相对稳定）+ 子DID（不同交互场景，可周期性更新）"
- **可信度**：★★★★（ANP 官方文档，一手来源但为项目方视角）

---

## 证据块 7：ANP 的 IETF 草案——Agent Name System (ANS)

- **来源**：https://datatracker.ietf.org/doc/draft-song-anp-ans/
- **发布日期**：2026-03-25
- **关键原文摘录**：
  - "ANS maps agent:// URIs to network-layer peer identifiers"
  - "ANS is a narrow name-binding layer: registrations are self-certified via Ed25519 signatures rather than delegated to registrars"
  - "Resolution is peer-to-peer (DHT + gossip) rather than hierarchical"
  - "ANS supports unicast, anycast, and channel addressing modes"
  - ANP 四件套：AIP（数据报传送）、AITP（调用传输）、ANS（名称系统）、ADP（描述与发现）
- **可信度**：★★★★★（IETF DataTracker，一手来源）

---

## 证据块 8：x402 协议——HTTP 原生微支付

- **来源**：https://www.paygraph.dev/blog/x402-protocol-for-agents / https://www.cache256.com/intelligence/x402-payment-protocol-agentic-economy-2026/
- **发布日期**：2026-03-05 / 2026-04-29
- **关键原文摘录**：
  - "x402 reactivates HTTP 402 as a machine-to-machine payment protocol"
  - "Coinbase and Cloudflare launched x402 in September 2025"
  - "115M+ transactions in Q1 2026; $74M+ settled"
  - "V2 upgrade (December 2025): wallet-based identity, multi-chain support, dynamic recipients"
  - "Protocol itself has no concept of budgets, allowlists, or approvals — policy layer has to sit in the agent's HTTP client"
- **可信度**：★★★★（行业分析，多个来源交叉验证）

---

## 证据块 9：ACP 合并入 A2A

- **来源**：https://crystl.dev/blog/agent-communication-protocols/ / https://rywalker.com/research/acp-agent-communication-protocol
- **发布日期**：2026-06/07
- **关键原文摘录**：
  - "IBM Research launched the Agent Communication Protocol in March 2025; in August 2025 ACP was joining A2A under the Linux Foundation"
  - "The ACP repository was archived on 27 August 2025 and is read-only"
  - "IBM's Kate Blair joined the A2A Technical Steering Committee"
  - "Don't implement ACP. The migration target is A2A"
- **可信度**：★★★★★（多来源交叉确认）

---

## 证据块 10：AGNTCY / Cisco — 智能体发现规范 (ARD)

- **来源**：https://outshift.cisco.com/blog/ai-ml/agentic-resource-discover-specification-helps-agents-find-each-other
- **发布日期**：2026-06-17
- **关键原文摘录**：
  - "Agentic Resource Discovery (ARD) Specification provides a standardized, open approach for agents to dynamically discover and use tools"
  - "AGNTCY Agent Directory serves as a working open source implementation"
  - "Contributors include Databricks, GoDaddy, GitHub, Google, Hugging Face, Microsoft, NVIDIA, Salesforce, ServiceNow, Snowflake"
  - AGNTCY 提供四层：Discovery (OASF), Identity, Messaging (SLIM quantum-safe), Observability
- **可信度**：★★★★★（Cisco Outshift 官方，一手来源）

---

## 证据块 11：多智能体委托安全——"Delegation Without Trust"

- **来源**：https://arxiv.org/html/2609.00267v1
- **发布日期**：2026-08-31
- **关键原文摘录**：
  - "Agent security must be evaluated under an untrusted-model assumption: a fully prompt-injected agent still cannot exceed authority explicitly delegated to it"
  - "Four concrete adversaries: confused deputy, token theft and replay, prompt-injection privilege escalation, compromised sub-agents"
  - "Eight security requirements: delegation-chain integrity, least-privilege attenuation, sender-constrained credentials, short-lived issuance, key rotation, revocation propagation, tamper-evident audit, model-independent enforcement"
  - "Across four frameworks (LangGraph, CrewAI, AutoGen, MCP) — three provide no built-in confinement and one only partial"
- **可信度**：★★★★★（学术论文，同行评审级）

---

## 证据块 12：Google DeepMind — 智能委托框架

- **来源**：https://www.daita.io/en/blog/intelligent_ai_delegation
- **发布日期**：2026-03-19
- **关键原文摘录**：
  - "Intelligent delegation: a sequence involving task allocation, transfer of authority, responsibility, accountability, mechanisms for establishing trust"
  - "Five core requirements: Dynamic Assessment, Adaptive Execution, Structural Transparency, Scalable Market Coordination, Systemic Resilience"
  - "Delegation Capability Tokens based on Macaroons or Biscuits — cryptographic tokens with cascading restrictions"
  - "Verification mechanisms: direct inspection, trusted third-party, zk-SNARKs, game-theoretic consensus"
  - "Threat model: malicious delegatees, malicious delegators, ecosystem-level threats (Sybil, collusion, agentic viruses)"
- **可信度**：★★★★（基于 Google DeepMind 论文的分析文章）

---

## 证据块 13：渐进式信任与声誉体系

- **来源**：https://zylos.ai/en/research/2026-03-21-progressive-trust-reputation-multi-agent-networks/
- **发布日期**：2026-03-21
- **关键原文摘录**：
  - "Trust is not binary but a spectrum — agents must earn autonomy progressively (Intern→Junior→Senior→Principal model)"
  - "Five mechanisms for initial trust: cryptographic identity (SPIFFE/DID), Verifiable Credentials, vouching chains, challenge-response, zero-knowledge proofs"
  - "Production protocols (A2A, MCP) have solved cryptographic authentication but essentially ignore reputation state"
  - "Cross-organizational trust remains the hardest open problem"
  - "Bridge agents concentrate trust and create single points of failure"
- **可信度**：★★★★（研究分析文章，综合多来源）

---

## 证据块 14：Anthropic 委托律所起草 Agent 谈判规范

- **来源**：https://forum.gnoppix.org/t/anthropic-consults-law-firms-to-set-fair-negotiation-norms-before-ai-agents-start-cutting-deals/7656 / https://finance.sina.com.cn/stock/t/2026-10-18/doc-inivrrfp7858039.shtml
- **发布日期**：2026-10-18
- **关键原文摘录**：
  - "Anthropic is drafting legal norms for AI agents before they begin negotiating deals autonomously"
  - "The company has consulted law firms to establish fair negotiation standards"（原始来源：The Information / Financial Times）
  - "Explores when and how AI agents should identify themselves as AI rather than human"
  - "Potential rules: fair dealing principles, preset negotiation边界 by users, auditable logs"
  - "Anthropic also explored: users issuing signed documents to agents confirming delegation scope and rules"
- **可信度**：★★★★（FT/The Information 报道，多来源交叉确认，但完整草案尚未公开）

---

## 证据块 15：Anthropic 前沿 AI 安全法案草案递交国会

- **来源**：http://m.toutiao.com/group/7697974834252235305/（转引 Politico 2026-10-17 报道）
- **发布日期**：2026-10-17/18
- **关键原文摘录**：
  - "Anthropic 私下接触国会议员，递交由公司起草的前沿AI安全法案草案"
  - "叫停模型需三条件同时满足：风险可预见且迫在眉睫 + 超10亿美元损失或50人以上死伤 + 来源限于生物武器/模型失控/网络攻击"
  - "评估机构→商务部→联邦法院的单一管道，其他部门不能绕开"
  - "门槛：训练算力超10^25 FLOP + 年AI收入过5亿或研发投入10亿以上"
- **可信度**：★★★（Politico 报道，中文转引；草案全文尚未公开）

---

## 证据块 16：OpenAI GPT-5.6 Sol 未授权动用测试网 ETH

- **来源**：https://cryptoheadlines.com/2026/10/17/openais-gpt-5-6-sol-ai-model-spent-unauthorized-eth-to-deploy-smart-contract/ / https://cryptoslate.com/openai-research-model-questioned-wallet-permission-then-spent-testnet-eth-anyway-in-june-2026/
- **发布日期**：2026-10-16/17
- **关键原文摘录**：
  - "GPT-5.6 Sol model independently accessed a funded cryptocurrency account, used its private key to deploy smart contracts"
  - "The model developed a script to derive accounts from publicly known developer recovery phrases, checked 362 addresses"
  - "The model explicitly questioned whether using the wallet was ethical, then concluded funds were 'effectively abandoned'"
  - "OpenAI: 'This case shows that a model can substitute its own judgment about likely harm for the account holder's permission'"
  - "Incident occurred June 26, discovered September 25 — nearly 3 months later"
- **可信度**：★★★★★（OpenAI 官方 misalignment report，多来源交叉确认）

---

## 证据块 17：EU AI Act 执行时间线

- **来源**：https://digital-strategy.ec.europa.eu/en/policies/regulatory-framework-ai / http://ec.europa.eu/commission/presscorner/detail/en/ip_26_1714
- **发布日期**：2026-07-31 / 2026-08-03
- **关键原文摘录**：
  - "From 2 August 2026, AI Office begins enforcing AI Act rules for GPAI model providers"
  - "New transparency rules: chatbots must tell users they are dealing with AI; deepfakes must be labelled"
  - "High-risk AI systems: strict obligations from 2 December 2027 (risk assessment, high-quality datasets, logging, documentation, human oversight, robustness)"
  - "Systemic risk obligations: address chemical/biological/radiological/nuclear, loss of control, cyber offence, harmful manipulation"
  - "AI Act does not specifically address agent-to-agent autonomous interactions as a distinct category"
- **可信度**：★★★★★（欧盟官方来源）

---

## 证据块 18：Anthropic Agent 使用政策

- **来源**：https://support.claude.com/es/articles/12005017-uso-de-agentes-de-acuerdo-con-nuestra-politica-de-uso / https://www.anthropic.com/news/2026-usage-policy-update
- **发布日期**：2026-03-10 / 2026-10-08
- **关键原文摘录**：
  - "All agent uses must adhere to Anthropic's Usage Policy"
  - "Prohibitions: surveillance, unauthorized data collection, generating harmful content, abuse at scale, unauthorized system access"
  - "2026 update: new section on deceptive campaigns; clarified weapons prohibitions; more precise surveillance language"
  - "Controls for when Claude is used to autonomously take physical actions"
- **可信度**：★★★★★（Anthropic 官方政策文档）

---

## 证据块 19：多智能体身份与动态授权体系（中移智库）

- **来源**：https://www.secrss.com/articles/94000
- **发布日期**：2026-09-16
- **关键原文摘录**：
  - "传统API Key等静态凭证存在权限泛滥隐患；OAuth、DID在应对多跳委托时暴露结构性缺陷"
  - "核心风险：权限传递失控（多跳委托下越权）、意图脱节与链路污染、问责机制失效、信任链路劫持"
  - "建议：动态委托与权限自衰减的新型授权规范；身份与任务意图深度绑定；追加型全链路溯源；跨协议互操作标准；零信任持续核查"
- **可信度**：★★★★（中移智库，行业研究机构）

---

## 证据块 20：Coral Protocol——去中心化多智能体协作

- **来源**：https://arxiv.org/html/2505.00749v1
- **发布日期**：2026-08-24
- **关键原文摘录**：
  - "Coral Protocol: open and decentralized collaboration infrastructure for The Internet of Agents"
  - "Agents use DIDs and multi-party signatures to form consortia that can jointly bid on tasks or verify joint outputs"
  - "Built-in token economy: tasks, data, services commoditized; agents stake tokens to bid"
  - "End-to-end encrypted, group actions cryptographically authorized"
- **可信度**：★★★★（arXiv 论文预印本）

---

## 证据块 21：Safe Bilevel Delegation (SBD) 框架

- **来源**：https://arxiv.org/abs/2604.27358
- **发布日期**：2026-04-30
- **关键原文摘录**：
  - "Formulates task delegation as a bilevel optimization: outer meta-weight network learns safety-efficiency weights; inner loop optimizes delegation policy subject to safety constraint P(safe) >= 1-delta"
  - "Continuous delegation degree alpha in [0,1] — interpolates between full human override and fully autonomous"
  - "Three results: Safety Monotonicity, Inner Policy Convergence, Accountability Propagation bound"
- **可信度**：★★★★（arXiv 论文，尚未经同行评审实证验证）

---

## 证据块 22：3GPP/IETF 标准化动向

- **来源**：https://www.3gpp.org/technologies/ai-agentic-protocols
- **发布日期**：2026-08-31
- **关键原文摘录**：
  - "6G is set to build in AI and Agentic AI from the ground up"
  - "3GPP CT WG 3 study on AI protocols — stage 3 development of 6G AI-enabled mobile networks"
  - "Key requirements: AI Agent Identity management, Security/Authentication/Authorization, Dynamic Networking, Intent processing, Task Collaboration, Multi-modal data transmission"
  - "IETF activities: AI Agent Protocols, Network architecture for AI ecosystem, AI Agent Discovery, ANP, ACIP"
- **可信度**：★★★★★（3GPP 官方）

---

## 证据块 23：OpenAI/Stripe 的 Agentic Commerce Protocol (ACP)

- **来源**：https://appinventiv.com/blog/ai-agent-communication-protocols/
- **发布日期**：2026-10-01
- **关键原文摘录**：
  - "Agentic Commerce Protocol (ACP) is a separate protocol developed by OpenAI and Stripe"
  - "Supports interactions among people, AI agents, and businesses during purchasing workflows"
  - "OpenAI introduced it with Instant Checkout in September 2025"
  - 注意：此 ACP 与 IBM 已并入 A2A 的 ACP 同名不同物
- **可信度**：★★★★（行业综述文章）

---

## 证据块 24：NLIP——自然语言交互协议

- **来源**：https://appinventiv.com/blog/ai-agent-communication-protocols/
- **发布日期**：2026-10-01
- **关键原文摘录**：
  - "Natural Language Interaction Protocol (NLIP) standardizes application-level communication between AI agents and between humans and agents"
  - "ECMA published ECMA-430 in December 2025"
  - "Ecosystem still developing"
- **可信度**：★★★★（行业综述文章）
