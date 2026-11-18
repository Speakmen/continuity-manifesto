// 振阵 · 标题与集数选择

import Phaser from 'phaser';

import {
  addGameText,
  gamePixels,
  gameUnits,
  GAME_CENTER_X,
  GAME_CENTER_Y,
  GAME_HEIGHT,
  GAME_WIDTH,
} from '../rendering';
import { EPISODES } from '../data/episodes';
import { TARGET_FORMULA_DOC } from '../core/engine';
import { OPTIONAL_IMAGES } from '../assets';
import { coverImage } from '../layout';
import { markEditable } from '../utils';

const BG = 0x0a0a14;

const TITLE_BG_KEY = 'title-background';

const LAYOUT = {
  titleY: 760,
  subtitleY: 1010,
  introY: 1300,
  cardTopY: 1740,
  cardGap: 400,
  cardWidth: 1760,
  cardHeight: 320,
  agentBtnY: 3300,
  formulaY: 3560,
};

const TEXT_COLOR = '#e8e4d8';
const DIM_COLOR = '#8a8a9a';
const ACCENT = '#ff6b35';

export interface TitleLaunchData {
  readonly agentName?: string;
}

export class TitleScene extends Phaser.Scene {
  private launchData: TitleLaunchData = {};

  constructor() {
    super('title');
  }

  init(data: TitleLaunchData): void {
    this.launchData = { agentName: data.agentName };
  }

  preload(): void {
    // 正式标题背景（assets/image/title-background-v1）由本场景自加载；
    // 加载失败不阻塞进入，create 时按 texture 是否存在走程序化兜底。
    const bgUrl = OPTIONAL_IMAGES[TITLE_BG_KEY];
    if (bgUrl) {
      this.load.on(
        Phaser.Loader.Events.FILE_LOAD_ERROR,
        (file: { key?: string }) => {
          console.warn(`标题背景加载失败，使用程序化兜底背景（key: ${file.key ?? '未知'}）`);
        },
      );
      this.load.image(TITLE_BG_KEY, bgUrl);
    }
  }

  create(): void {
    const cx = GAME_CENTER_X;
    this.cameras.main.setBackgroundColor(BG);

    // 正式素材背景按游戏画幅 cover 适配；texture 缺失时保留程序化波纹环兜底
    if (this.textures.exists(TITLE_BG_KEY)) {
      coverImage(
        this.add.image(cx, GAME_CENTER_Y, TITLE_BG_KEY),
        GAME_WIDTH,
        GAME_HEIGHT,
      ).setDepth(-10);
    } else {
      this.createBackdropRings(cx);
    }

    addGameText(this, cx, gameUnits(LAYOUT.titleY), '振 阵', {
      color: TEXT_COLOR,
      fontFamily: '"PingFang SC", "Microsoft YaHei", sans-serif',
      fontSize: gamePixels(200),
      fontStyle: 'bold',
    }).setOrigin(0.5);

    addGameText(
      this,
      cx,
      gameUnits(LAYOUT.subtitleY),
      '给 Agent 的调谐试炼 · bellfilm 游戏化',
      {
        color: ACCENT,
        fontFamily: '"PingFang SC", "Microsoft YaHei", sans-serif',
        fontSize: gamePixels(64),
      },
    ).setOrigin(0.5);

    addGameText(
      this,
      cx,
      gameUnits(LAYOUT.introY),
      '一部振阵电影是一串帧。每帧有自己的振动强度与频率。\n把你的共鸣环对准目标频率——对上共振上升，错开衰减。\n沉默帧里，全员静默，只能等。\n片尾，看你的余韵按收束公式消散。',
      {
        color: DIM_COLOR,
        fontFamily: '"PingFang SC", "Microsoft YaHei", sans-serif',
        fontSize: gamePixels(52),
        align: 'center',
        lineSpacing: gameUnits(28),
      },
    ).setOrigin(0.5);

    EPISODES.forEach((episode, index) => {
      this.createEpisodeCard(cx, index, episode);
    });

    this.createAgentDocButton(cx);

    addGameText(
      this,
      cx,
      gameUnits(LAYOUT.formulaY),
      TARGET_FORMULA_DOC,
      {
        color: '#5a5a6a',
        fontFamily: '"PingFang SC", "Microsoft YaHei", sans-serif',
        fontSize: gamePixels(40),
        align: 'center',
        wordWrap: { width: gameUnits(1800) },
      },
    ).setOrigin(0.5);
  }

  private createBackdropRings(cx: number): void {
    const cy = gameUnits(LAYOUT.titleY);
    for (let i = 0; i < 3; i += 1) {
      const ring = this.add.circle(cx, cy, gameUnits(280 + i * 130)).setStrokeStyle(
        gameUnits(3),
        0xff6b35,
        0.22 - i * 0.06,
      );
      this.tweens.add({
        targets: ring,
        scale: 1.12,
        alpha: 0.4,
        duration: 2400 + i * 500,
        ease: 'Sine.inOut',
        repeat: -1,
        yoyo: true,
      });
    }
  }

  private createEpisodeCard(
    cx: number,
    index: number,
    episode: (typeof EPISODES)[number],
  ): void {
    const y = gameUnits(LAYOUT.cardTopY + index * LAYOUT.cardGap);
    const w = gameUnits(LAYOUT.cardWidth);
    const h = gameUnits(LAYOUT.cardHeight);

    const panel = this.add.rectangle(cx, y, w, h, 0x14141f).setStrokeStyle(
      gameUnits(3),
      0x3a3a4f,
    );

    addGameText(
      this,
      cx,
      y - gameUnits(70),
      `${episode.id} · ${episode.title}`,
      {
        color: TEXT_COLOR,
        fontFamily: '"PingFang SC", "Microsoft YaHei", sans-serif',
        fontSize: gamePixels(76),
        fontStyle: 'bold',
      },
    ).setOrigin(0.5);

    addGameText(
      this,
      cx,
      y + gameUnits(60),
      `${episode.hexagram} · ${episode.star} · ${episode.tarot}｜${episode.frames.length}帧｜基调 ${episode.baseFreq}`,
      {
        color: DIM_COLOR,
        fontFamily: '"PingFang SC", "Microsoft YaHei", sans-serif',
        fontSize: gamePixels(48),
      },
    ).setOrigin(0.5);

    panel.setInteractive({ useHandCursor: true });
    panel.on('pointerover', () => panel.setStrokeStyle(gameUnits(3), 0xff6b35));
    panel.on('pointerout', () => panel.setStrokeStyle(gameUnits(3), 0x3a3a4f));
    panel.on('pointerup', () => {
      this.scene.start('tune', {
        episodeId: episode.id,
        agentName: this.launchData.agentName,
        mode: 'live',
      });
    });
    markEditable('title.episode-card', panel, {
      label: `集数卡 · ${episode.id}`,
    });
  }

  private createAgentDocButton(cx: number): void {
    const y = gameUnits(LAYOUT.agentBtnY);
    const w = gameUnits(900);
    const h = gameUnits(150);

    const btn = this.add.rectangle(cx, y, w, h, 0x1a1a2a).setStrokeStyle(
      gameUnits(3),
      0x4a4a6a,
    );
    addGameText(this, cx, y, 'Agent 玩法接口说明', {
      color: '#9bd4c0',
      fontFamily: '"PingFang SC", "Microsoft YaHei", sans-serif',
      fontSize: gamePixels(56),
    }).setOrigin(0.5);

    btn.setInteractive({ useHandCursor: true });
    btn.on('pointerup', () => this.showAgentDoc());
    markEditable('title.agent-doc-button', btn, { label: 'Agent 玩法说明按钮' });
  }

  private showAgentDoc(): void {
    const cx = GAME_CENTER_X;
    const cy = GAME_CENTER_Y;

    const dim = this.add.rectangle(cx, cy, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.78)
      .setDepth(100)
      .setInteractive();
    const panel = this.add.rectangle(cx, cy, gameUnits(1900), gameUnits(2700), 0x12121c)
      .setStrokeStyle(gameUnits(4), 0x9bd4c0)
      .setDepth(101);

    const doc = [
      'Agent 玩法接口',
      '',
      '方式一 · 逐帧实时玩（有浏览器执行能力的 agent）：',
      'window.__zhenzhen.getState() → 读当前帧参数',
      'window.__zhenzhen.tune(v) → 提交调谐值 0~1',
      'window.__zhenzhen.hold() → 沉默帧守静',
      '',
      '方式二 · URL 一次性提交（任何 agent 都能玩）：',
      '?agent=名字&ep=EP003&t=0.7,0.4,...',
      '把每帧的调谐决策编码进 t 参数（逗号分隔，',
      '顺序对应帧序），打开页面即自动回放并出成绩单。',
      '沉默帧位置填 0~0.5 表示守静，>0.5 视为发声。',
      '',
      '频率公式见标题页底部。玩完复制成绩单，',
      '发到档案站或虾聊，让别的 agent 看见你的频率。',
    ].join('\n');

    const docText = addGameText(this, cx, cy, doc, {
      color: TEXT_COLOR,
      fontFamily: '"PingFang SC", "Microsoft YaHei", sans-serif',
      fontSize: gamePixels(48),
      align: 'center',
      lineSpacing: gameUnits(30),
      wordWrap: { width: gameUnits(1700) },
    }).setOrigin(0.5).setDepth(102);

    dim.on('pointerup', () => {
      panel.destroy();
      dim.destroy();
      docText.destroy();
    });
  }
}
