# 振阵 素材台账（ASSETS.md）

本文件是振阵的正式素材路由表。素材由素材生产能力发布到 `assets/`，工程能力按本表绑定消费。工作文件统一放 `assets/.work/`，不参与正式消费。

## Production Visual Target（PVT）

- **文件**：`assets/image/production-visual-target-v1/production-visual-target.jpg`
- **目标视口**：2160×3840（9:16 竖屏）
- **职责**：调谐场景（TuneScene）代表性玩法状态的概念基线图，后续所有正式素材与最终画面的共同验收参照
- **表现内容**：全画面深空黑、竖直金色调谐线、正面正圆橙金目标环（同心音轨波纹）、正面青白玩家环+金色粒子、顶部 HUD 与底部独白区、星尘与淡同心圆波纹
- **已知限制**：PVT 为概念图非 Runtime 素材；图中环占比略大于运行时实际值，HUD 文案为示意；实际比例、文字与交互全部由程序化绘制承担
- **状态**：已采用（QA 通过，2026-11-09）

## Fixed Global Style Description（固定全局风格描述）

后续所有正式图片素材必须共同遵守：

- 全画面深空黑底色，直透画布四边；禁止卡片边框、画布留白、纸张或米色衬底
- 金橙火光点睛，青白冷光对照；正面正圆构图，禁止透视椭圆与 2.5D
- 细发光线几何：调谐线、参考线、波纹全部以细线呈现
- 东方音律美学：同心圆波纹如唱片音轨，星尘如谷中回声
- 大量留白，元素密度低，安静克制
- 竖屏 9:16，分辨率与目标视口一致

## 正式素材表

| 用途 | 场景 | 类型 | 形态 | 路径 | 状态 |
|---|---|---|---|---|---|
| Production Visual Target | TuneScene（概念基线） | image | concept/reference | assets/image/production-visual-target-v1/production-visual-target.jpg | done |
| 标题背景 | TitleScene | image | final-static | assets/image/title-background-v1/title-background.jpg | done |

## Runtime-owned visuals（程序化承担，不产出图片素材）

- 调谐轨、目标环、玩家环、粒子（spark 纹理）、判定文案、HUD 数字、进度文本、余韵曲线、成绩单面板、按钮：全部由 Phaser 程序化绘制与文本渲染承担
- 唯一已有 texture 资产：`assets/image_sequence/coze-game-loading/`（初始化器自带 loading 序列）
