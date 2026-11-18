# 振阵 视觉组合台账（VISUAL_COMPOSITION.md）

记录实际采用的正式素材、Scene/UI owner、显示尺寸与目标视口关系。PVT 与 `.work/` 候选只作验收依据，不绑定 Runtime。

## 目标视口

- 设计分辨率：2160×3840（9:16 竖屏），`GAME_DESIGN_WIDTH/HEIGHT`
- 渲染尺寸：`GAME_WIDTH × GAME_HEIGHT`（`GAME_RENDER_METRICS`，按设备缩放）
- 所有正式背景按渲染画幅 cover/contain 适配，不沿用素材原生尺寸

## 正式素材接入记录

| 素材行（ASSETS.md） | payload | 资源 key | 消费路径 | Scene owner | 显示方式 |
|---|---|---|---|---|---|
| 标题背景 | assets/image/title-background-v1/title-background.jpg | `title-background` | src/assets.ts `OPTIONAL_IMAGES` → src/scene/TitleScene.ts preload | TitleScene | `add.image(cx, GAME_CENTER_Y)` + `coverImage(GAME_WIDTH, GAME_HEIGHT)`，origin 0.5，depth -10 |
| Production Visual Target | assets/image/production-visual-target-v1/production-visual-target.jpg | （不绑定 Runtime） | 仅作为概念基线与后续素材参考 | — | — |

## 标题背景（title-background-v1）

- 素材原生尺寸：1600×2848（比例 0.5618，与目标视口 0.5625 基本一致，cover 裁切极小）
- 显示边界：游戏画幅全屏（`GAME_WIDTH × GAME_HEIGHT`），center 对齐
- depth：-10，位于所有标题文本/卡片/按钮之下
- 加载与失败状态：TitleScene.preload 自加载；FILE_LOAD_ERROR 打 console.warn 并降级；create 时 `textures.exists` 判定，缺失则渲染程序化波纹环兜底（createBackdropRings）
- 被停用的 prototype 绘制：接入后 `createBackdropRings` 仅作为加载失败的兜底路径，正常路径不再叠加 rings，避免重复波纹
- 适配约束：coverImage 通过 setDisplaySize 写入 scale，之后不对该对象做 scale tween

## 程序化视觉（不变更）

- 调谐轨、目标环、玩家环、粒子、HUD、判定文案、余韵曲线、成绩单面板、按钮：TuneScene / ResultScene 程序化绘制承担
- PVT 的环占比偏差已记录于 ASSETS.md 已知限制，实际比例以引擎常量为准
