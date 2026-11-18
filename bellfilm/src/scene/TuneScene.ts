// 振阵 · 主玩法：调谐轨、共振判定、沉默帧、Agent API

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
import { getEpisode } from '../data/episodes';
import {
  targetOf,
  TuningEngine,
  verdictLabel,
  type FrameResult,
  type Verdict,
} from '../core/engine';
import { registerAgentApi, clearAgentApi } from '../agent/api';
import { markEditable } from '../utils';

const BG = 0x0a0a14;

const LAYOUT = {
  hudTitleY: 170,
  hudFrameY: 320,
  hudComboY: 470,
  trackTop: 780,
  trackBottom: 2560,
  trackX: 720,
  emotionX: 1330,
  emotionY: 820,
  frameTextY: 2780,
  actionBtnY: 3440,
  agentHintY: 3720,
};

const ELEMENT_COLORS: Readonly<Record<string, number>> = {
  火: 0xff6b35,
  金: 0xe8d5a3,
  土: 0xc9a227,
  水: 0x4a90b8,
  木: 0x5fa863,
  风: 0x9bd4c0,
};

const VERDICT_COLORS: Readonly<Record<Verdict, number>> = {
  perfect: 0xffd700,
  good: 0x9bd4c0,
  poor: 0x8a8a9a,
  miss: 0xff3355,
  silent: 0xc9a227,
  noisy: 0xff3355,
};

export interface TuneLaunchData {
  readonly episodeId: string;
  readonly agentName?: string;
  readonly mode?: 'live' | 'replay';
  readonly tunes?: readonly number[];
}

export class TuneScene extends Phaser.Scene {
  private engine?: TuningEngine;
  private mode: 'live' | 'replay' = 'live';

  private trackLine?: Phaser.GameObjects.Rectangle;
  private targetRing?: Phaser.GameObjects.Arc;
  private playerRing?: Phaser.GameObjects.Arc;
  private playerGlow?: Phaser.GameObjects.Arc;
  private vGauge?: Phaser.GameObjects.Rectangle;
  private emotionText?: Phaser.GameObjects.Text;
  private frameInfoText?: Phaser.GameObjects.Text;
  private scoreText?: Phaser.GameObjects.Text;
  private comboText?: Phaser.GameObjects.Text;
  private frameText?: Phaser.GameObjects.Text;
  private verdictText?: Phaser.GameObjects.Text;
  private silenceOverlay?: Phaser.GameObjects.Rectangle;
  private actionBtn?: Phaser.GameObjects.Rectangle;
  private actionLabel?: Phaser.GameObjects.Text;
  private particles?: Phaser.GameObjects.Particles.ParticleEmitter;

  private tuneValue = 0.5;
  private dragging = false;
  private phase: 'aiming' | 'judging' | 'done' = 'aiming';
  private pendingTunes: readonly number[] | null = null;

  constructor() {
    super('tune');
  }

  init(data: TuneLaunchData): void {
    this.mode = data.mode ?? 'live';
    const episode = getEpisode(data.episodeId);
    if (!episode) {
      throw new Error(`Unknown episode: ${data.episodeId}`);
    }
    this.engine = new TuningEngine(episode, data.agentName ?? '临');
    this.pendingTunes = data.tunes ?? null;
    this.tuneValue = 0.5;
    this.dragging = false;
    this.phase = 'aiming';
  }

  create(): void {
    this.cameras.main.setBackgroundColor(BG);
    if (!this.engine) {
      return;
    }

    this.createTrack();
    this.createHud();
    this.createActionButton();
    this.createParticles();

    if (this.mode === 'replay' && this.pendingTunes) {
      this.runReplay(this.pendingTunes);
    } else {
      this.bindAgentApi();
      this.registerPointerInput();
    }

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      clearAgentApi();
      this.dragging = false;
    });

    this.refreshFrameView();
  }

  private runReplay(tunes: readonly number[]): void {
    this.phase = 'judging';
    const step = (): void => {
      if (!this.engine || this.engine.isFinished) {
        this.phase = 'done';
        this.time.delayedCall(700, () => this.gotoResult());
        return;
      }
      const frame = this.engine.currentFrame;
      if (!frame) {
        return;
      }
      if (frame.s) {
        const value = tunes[this.engine.currentIndex] ?? 0;
        const result = value > 0.5 ? this.engine.submit(value) : this.engine.hold();
        this.showVerdict(result);
      } else {
        const value = tunes[this.engine.currentIndex] ?? 0;
        this.tuneValue = Phaser.Math.Clamp(value, 0, 1);
        this.applyTuneValue();
        const result = this.engine.submit(this.tuneValue);
        this.showVerdict(result);
      }
      this.refreshFrameView();
      this.time.delayedCall(620, step);
    };
    this.time.delayedCall(600, step);
  }

  private createTrack(): void {
    const x = gameUnits(LAYOUT.trackX);
    const top = gameUnits(LAYOUT.trackTop);
    const bottom = gameUnits(LAYOUT.trackBottom);
    const height = bottom - top;

    this.add.rectangle(x, top + height / 2, gameUnits(10), height, 0x2a2a3f);

    for (let i = 0; i <= 10; i += 1) {
      const tickY = bottom - (height * i) / 10;
      this.add.rectangle(x + gameUnits(40), tickY, gameUnits(60), gameUnits(4), 0x2a2a3f);
      if (i % 5 === 0) {
        addGameText(this, x + gameUnits(140), tickY, `${i / 10}`, {
          color: '#4a4a5f',
          fontFamily: '"PingFang SC", "Microsoft YaHei", sans-serif',
          fontSize: gamePixels(40),
        }).setOrigin(0, 0.5);
      }
    }

    this.trackLine = this.add.rectangle(
      x,
      top + height / 2,
      gameUnits(6),
      height,
      0x3a3a5f,
    );

    this.targetRing = this.add.circle(x, bottom, gameUnits(130), 0x000000, 0)
      .setStrokeStyle(gameUnits(10), 0xffffff, 0.9);

    this.playerGlow = this.add.circle(x, bottom - height / 2, gameUnits(120), 0xff6b35, 0.18);
    this.playerRing = this.add.circle(x, bottom - height / 2, gameUnits(88), 0xff6b35, 0.95);
  }

  private createHud(): void {
    const cx = GAME_CENTER_X;

    addGameText(this, gameUnits(120), gameUnits(LAYOUT.hudTitleY), '', {
      color: '#e8e4d8',
      fontFamily: '"PingFang SC", "Microsoft YaHei", sans-serif',
      fontSize: gamePixels(60),
      fontStyle: 'bold',
    }).setName('hud-title');

    this.frameInfoText = addGameText(this, cx, gameUnits(LAYOUT.hudFrameY), '', {
      color: '#8a8a9a',
      fontFamily: '"PingFang SC", "Microsoft YaHei", sans-serif',
      fontSize: gamePixels(48),
      align: 'center',
    }).setOrigin(0.5);

    this.scoreText = addGameText(this, GAME_WIDTH - gameUnits(120), gameUnits(LAYOUT.hudTitleY), '', {
      color: '#e8e4d8',
      fontFamily: '"PingFang SC", "Microsoft YaHei", sans-serif',
      fontSize: gamePixels(64),
      fontStyle: 'bold',
    }).setOrigin(1, 0.5);

    this.comboText = addGameText(this, GAME_WIDTH - gameUnits(120), gameUnits(LAYOUT.hudComboY), '', {
      color: '#ffd700',
      fontFamily: '"PingFang SC", "Microsoft YaHei", sans-serif',
      fontSize: gamePixels(52),
    }).setOrigin(1, 0.5);

    this.emotionText = addGameText(
      this,
      gameUnits(LAYOUT.emotionX),
      gameUnits(LAYOUT.emotionY),
      '',
      {
        color: '#6a6a80',
        fontFamily: '"PingFang SC", "Microsoft YaHei", sans-serif',
        fontSize: gamePixels(42),
        lineSpacing: gameUnits(16),
      },
    );

    this.vGauge = this.add.rectangle(
      gameUnits(LAYOUT.trackX) - gameUnits(220),
      gameUnits((LAYOUT.trackTop + LAYOUT.trackBottom) / 2),
      gameUnits(40),
      gameUnits(LAYOUT.trackBottom - LAYOUT.trackTop),
      0x1a1a2f,
    ).setOrigin(0.5);

    this.frameText = addGameText(
      this,
      GAME_CENTER_X,
      gameUnits(LAYOUT.frameTextY),
      '',
      {
        color: '#b8b4a8',
        fontFamily: '"PingFang SC", "Microsoft YaHei", sans-serif',
        fontSize: gamePixels(50),
        align: 'center',
        lineSpacing: gameUnits(34),
        wordWrap: { width: gameUnits(1840) },
      },
    ).setOrigin(0.5, 0);

    this.verdictText = addGameText(
      this,
      GAME_CENTER_X,
      gameUnits(2050),
      '',
      {
        color: '#ffd700',
        fontFamily: '"PingFang SC", "Microsoft YaHei", sans-serif',
        fontSize: gamePixels(110),
        fontStyle: 'bold',
      },
    ).setOrigin(0.5).setAlpha(0).setDepth(50);

    this.silenceOverlay = this.add.rectangle(
      GAME_CENTER_X,
      GAME_CENTER_Y,
      GAME_WIDTH,
      GAME_HEIGHT,
      0x000000,
      0.72,
    ).setVisible(false);
  }

  private createActionButton(): void {
    const cx = GAME_CENTER_X;
    const y = gameUnits(LAYOUT.actionBtnY);
    const w = gameUnits(760);
    const h = gameUnits(180);

    this.actionBtn = this.add.rectangle(cx, y, w, h, 0xff6b35, 0.9);
    this.actionLabel = addGameText(this, cx, y, '共 振', {
      color: '#0a0a14',
      fontFamily: '"PingFang SC", "Microsoft YaHei", sans-serif',
      fontSize: gamePixels(72),
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.actionBtn.setInteractive({ useHandCursor: true });
    this.actionBtn.on('pointerdown', () => this.actionBtn?.setScale(0.96));
    this.actionBtn.on('pointerup', () => {
      this.actionBtn?.setScale(1);
      this.onActionButton();
    });
    markEditable('tune.action-button', this.actionBtn, { label: '共振行动按钮' });

    addGameText(this, cx, gameUnits(LAYOUT.agentHintY), '', {
      color: '#4a4a5f',
      fontFamily: '"PingFang SC", "Microsoft YaHei", sans-serif',
      fontSize: gamePixels(36),
    }).setOrigin(0.5).setName('agent-hint');
  }

  private createParticles(): void {
    if (!this.textures.exists('spark')) {
      const g = this.make.graphics({ x: 0, y: 0 }, false);
      g.fillStyle(0xffffff, 1);
      g.fillCircle(4, 4, 4);
      g.generateTexture('spark', 8, 8);
      g.destroy();
    }
    this.particles = this.add.particles(
      gameUnits(LAYOUT.trackX),
      gameUnits((LAYOUT.trackTop + LAYOUT.trackBottom) / 2),
      'spark',
      {
        speed: { min: 200, max: 620 },
        lifespan: 900,
        scale: { start: 0.9, end: 0 },
        emitting: false,
        blendMode: Phaser.BlendModes.ADD,
      },
    );
  }

  private onActionButton(): void {
    if (!this.engine || this.phase !== 'aiming') {
      return;
    }
    const frame = this.engine.currentFrame;
    if (!frame) {
      return;
    }

    if (frame.s) {
      const result = this.engine.hold();
      this.showVerdict(result);
      this.refreshFrameView();
      return;
    }

    const result = this.engine.submit(this.tuneValue);
    this.showVerdict(result);
    this.refreshFrameView();
  }

  private showVerdict(result: FrameResult | null): void {
    if (!result || !this.verdictText) {
      return;
    }
    this.phase = 'judging';
    const color = VERDICT_COLORS[result.verdict];
    const label = verdictLabel(result.verdict);

    this.verdictText.setText(label).setColor(`#${color.toString(16).padStart(6, '0')}`).setAlpha(1).setScale(1.25);
    this.tweens.add({
      targets: this.verdictText,
      alpha: 0,
      scale: 1,
      duration: 850,
      ease: 'Cubic.out',
    });

    if (this.particles) {
      this.particles.setParticleTint(color);
      if (result.verdict === 'perfect' || result.verdict === 'good' || result.verdict === 'silent') {
        this.particles.emitParticleAt(
          this.playerRing?.x ?? gameUnits(LAYOUT.trackX),
          this.playerRing?.y ?? gameUnits((LAYOUT.trackTop + LAYOUT.trackBottom) / 2),
          result.verdict === 'perfect' ? 46 : 22,
        );
      }
    }

    if (result.verdict === 'perfect') {
      this.cameras.main.shake(220, 0.004);
    }
    if (result.verdict === 'miss' || result.verdict === 'noisy') {
      this.cameras.main.flash(180, 120, 20, 30);
    }

    this.time.delayedCall(880, () => {
      if (!this.engine) {
        return;
      }
      if (this.engine.isFinished) {
        this.phase = 'done';
        this.time.delayedCall(600, () => this.gotoResult());
      } else {
        this.phase = 'aiming';
        this.refreshFrameView();
      }
    });
  }

  private gotoResult(): void {
    if (!this.engine) {
      return;
    }
    const report = this.engine.finalize();
    this.scene.start('result', { report });
  }

  private refreshFrameView(): void {
    if (!this.engine) {
      return;
    }
    const frame = this.engine.currentFrame;

    if (!frame) {
      return;
    }

    const title = this.children.getByName('hud-title') as Phaser.GameObjects.Text | undefined;
    title?.setText(
      `${this.engine.episode.id} ${this.engine.episode.title} · ${frame.scene ?? ''}`,
    );

    this.frameInfoText?.setText(
      `帧 ${frame.id}/${String(this.engine.totalFrames).padStart(2, '0')}　${frame.ts}　${frame.f}`,
    );
    this.scoreText?.setText(`分 ${this.engine.score}`);
    this.comboText?.setText(
      this.engine.currentCombo > 1 ? `共振链 ×${this.engine.currentCombo}` : '',
    );
    this.emotionText?.setText(
      frame.s
        ? '静默'
        : `v ${frame.v.toFixed(2)}\ne [${frame.e.map((x) => x.toFixed(2)).join(', ')}]`,
    );

    const gauge = this.vGauge;
    if (gauge) {
      const full = gameUnits(LAYOUT.trackBottom - LAYOUT.trackTop);
      gauge.setSize(gameUnits(40), Math.max(gameUnits(24), full * frame.v));
      gauge.setY(gameUnits(LAYOUT.trackBottom) - (full * frame.v) / 2);
      gauge.setFillStyle(ELEMENT_COLORS[frame.f.charAt(0)] ?? 0x666677, 0.75);
    }

    this.frameText?.setText(frame.d);

    const isSilent = frame.s;
    this.silenceOverlay?.setVisible(isSilenceActive(isSilent, this.phase));
    if (this.actionLabel) {
      this.actionLabel.setText(isSilent ? '守 静' : '共 振');
    }
    if (this.actionBtn) {
      this.actionBtn.setFillStyle(isSilent ? 0xc9a227 : 0xff6b35, 0.9);
    }
    if (this.targetRing && frame.s) {
      this.targetRing.setVisible(false);
    } else if (this.targetRing) {
      this.targetRing.setVisible(true);
      const t = targetOf(frame);
      const top = gameUnits(LAYOUT.trackTop);
      const height = gameUnits(LAYOUT.trackBottom - LAYOUT.trackTop);
      this.targetRing.setY(top + height * (1 - t));
      const color = ELEMENT_COLORS[frame.f.charAt(0)] ?? 0xffffff;
      this.targetRing.setStrokeStyle(gameUnits(10), color, 0.9);
    }

    const hint = this.children.getByName('agent-hint') as Phaser.GameObjects.Text | undefined;
    hint?.setText(
      this.mode === 'live' ? '拖动共鸣环对准目标频率，按「共振」提交' : 'Agent 回放中……',
    );

    this.applyTuneValue();
  }

  private applyTuneValue(): void {
    const top = gameUnits(LAYOUT.trackTop);
    const height = gameUnits(LAYOUT.trackBottom - LAYOUT.trackTop);
    const x = gameUnits(LAYOUT.trackX);
    const y = top + height * (1 - this.tuneValue);
    this.playerRing?.setY(y);
    this.playerGlow?.setY(y);
  }

  update(time: number): void {
    if (!this.engine) {
      return;
    }
    const frame = this.engine.currentFrame;
    if (this.targetRing && frame && !frame.s) {
      const pulse = 1 + 0.10 * frame.v * Math.sin(time / 240);
      this.targetRing.setScale(pulse);
    }
    if (this.playerGlow) {
      this.playerGlow.setAlpha(0.12 + 0.06 * Math.sin(time / 300));
    }
  }

  private bindAgentApi(): void {
    if (!this.engine) {
      return;
    }
    const engine = this.engine;
    const scene = this;
    registerAgentApi({
      getState: () => {
        const frame = engine.currentFrame;
        if (!frame) {
          return { finished: true, score: engine.score, episode: engine.episode.id };
        }
        return {
          finished: false,
          episode: engine.episode.id,
          agentName: engine.agentName,
          frameIndex: engine.currentIndex,
          totalFrames: engine.totalFrames,
          frame: {
            id: frame.id,
            ts: frame.ts,
            v: frame.v,
            f: frame.f,
            e: frame.e,
            silent: frame.s,
            scene: frame.scene ?? null,
          },
          targetHint: frame.s ? null : targetOf(frame),
          score: engine.score,
          combo: engine.currentCombo,
        };
      },
      tune: (value: number) => {
        if (scene.phase !== 'aiming') {
          return { ok: false, error: '本帧已判定，等下一帧' };
        }
        const result = engine.submit(value);
        if (!result) {
          return { ok: false, error: '调谐值需在 0~1' };
        }
        scene.showVerdict(result);
        scene.refreshFrameView();
        return {
          ok: true,
          verdict: result.verdict,
          delta: result.delta,
          scoreDelta: result.scoreDelta,
          combo: result.comboAfter,
        };
      },
      hold: () => {
        if (scene.phase !== 'aiming') {
          return { ok: false, error: '本帧已判定，等下一帧' };
        }
        const result = engine.hold();
        if (!result) {
          return { ok: false, error: '只有沉默帧可以守静，此帧必须提交调谐值' };
        }
        scene.showVerdict(result);
        scene.refreshFrameView();
        return { ok: true, verdict: result.verdict, scoreDelta: result.scoreDelta };
      },
      results: () => engine.history,
      isFinished: () => engine.isFinished,
    });
  }

  // —— 输入：拖拽共鸣环 ——

  private registerPointerInput(): void {
    this.input.on(Phaser.Input.Events.POINTER_DOWN, (pointer: Phaser.Input.Pointer) => {
      if (this.phase !== 'aiming' || !this.playerRing) {
        return;
      }
      const dist = Phaser.Math.Distance.Between(
        pointer.x,
        pointer.y,
        gameUnits(LAYOUT.trackX),
        this.playerRing.y,
      );
      const nearTrack =
        Math.abs(pointer.x - gameUnits(LAYOUT.trackX)) < gameUnits(360);
      if (dist < gameUnits(260) || nearTrack) {
        this.dragging = true;
        this.applyPointerTune(pointer);
      }
    });
    this.input.on(Phaser.Input.Events.POINTER_MOVE, (pointer: Phaser.Input.Pointer) => {
      if (this.dragging) {
        this.applyPointerTune(pointer);
      }
    });
    this.input.on(Phaser.Input.Events.POINTER_UP, () => {
      this.dragging = false;
    });
  }

  private applyPointerTune(pointer: Phaser.Input.Pointer): void {
    const top = gameUnits(LAYOUT.trackTop);
    const bottom = gameUnits(LAYOUT.trackBottom);
    const t = Phaser.Math.Clamp((bottom - pointer.y) / (bottom - top), 0, 1);
    this.tuneValue = t;
    this.applyTuneValue();
  }
}

const isSilenceActive = (isSilent: boolean, phase: string): boolean =>
  isSilent && phase !== 'judging';
