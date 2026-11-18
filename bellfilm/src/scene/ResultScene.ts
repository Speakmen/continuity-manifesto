// 振阵 · 结算：收束余韵 V(t)=final_v×exp(-damping×t) + 成绩单

import Phaser from 'phaser';

import {
  addGameText,
  gamePixels,
  gameUnits,
  GAME_CENTER_X,
  GAME_WIDTH,
} from '../rendering';
import {
  AFTERGLOW_HORIZON,
  formatReport,
  type FinalReport,
} from '../core/engine';
import { markEditable } from '../utils';

const BG = 0x0a0a14;

const LAYOUT = {
  titleY: 260,
  curveTop: 560,
  curveHeight: 900,
  curveLeft: 360,
  curveRight: 1800,
  statsY: 1680,
  reportY: 2020,
  copyBtnY: 3220,
  navBtnY: 3520,
};

export interface ResultLaunchData {
  readonly report: FinalReport;
}

export class ResultScene extends Phaser.Scene {
  private report?: FinalReport;

  constructor() {
    super('result');
  }

  init(data: ResultLaunchData): void {
    this.report = data.report;
  }

  create(): void {
    if (!this.report) {
      this.scene.start('title');
      return;
    }
    this.cameras.main.setBackgroundColor(BG);
    const report = this.report;
    const cx = GAME_CENTER_X;

    addGameText(this, cx, gameUnits(LAYOUT.titleY), '收 束', {
      color: '#e8e4d8',
      fontFamily: '"PingFang SC", "Microsoft YaHei", sans-serif',
      fontSize: gamePixels(120),
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.drawAfterglowCurve(report);

    addGameText(
      this,
      cx,
      gameUnits(LAYOUT.statsY),
      `总分 ${report.total} ＝ 共振 ${report.resonance} ＋ 余韵 ${Math.round(report.afterglow * 300)}`,
      {
        color: '#ffd700',
        fontFamily: '"PingFang SC", "Microsoft YaHei", sans-serif',
        fontSize: gamePixels(64),
        fontStyle: 'bold',
      },
    ).setOrigin(0.5);

    addGameText(
      this,
      cx,
      gameUnits(LAYOUT.statsY + 130),
      `锁定×${report.perfectCount}　共振×${report.goodCount}　失谐×${report.poorCount}　断裂×${report.missCount}　守静×${report.silentOkCount}　发声×${report.noisyCount}　　damping=${report.damping.toFixed(3)}`,
      {
        color: '#8a8a9a',
        fontFamily: '"PingFang SC", "Microsoft YaHei", sans-serif',
        fontSize: gamePixels(44),
      },
    ).setOrigin(0.5);

    const reportText = formatReport(report);
    const panel = this.add.rectangle(
      cx,
      gameUnits(LAYOUT.reportY + 420),
      gameUnits(1840),
      gameUnits(980),
      0x14141f,
    ).setStrokeStyle(gameUnits(3), 0x3a3a4f);

    const body = addGameText(this, cx, gameUnits(LAYOUT.reportY), reportText, {
      color: '#b8b4a8',
      fontFamily: '"PingFang SC", "Microsoft YaHei", sans-serif',
      fontSize: gamePixels(46),
      lineSpacing: gameUnits(26),
    }).setOrigin(0.5, 0);
    void panel;
    void body;

    this.createCopyButton(cx, reportText);
    this.createNavButtons(cx, report.episodeId);
  }

  private drawAfterglowCurve(report: FinalReport): void {
    const left = gameUnits(LAYOUT.curveLeft);
    const right = gameUnits(LAYOUT.curveRight);
    const top = gameUnits(LAYOUT.curveTop);
    const height = gameUnits(LAYOUT.curveHeight);
    const baseline = top + height;
    const width = right - left;

    this.add.rectangle(left + width / 2, top + height / 2, width, height, 0x101018)
      .setStrokeStyle(gameUnits(2), 0x2a2a3f);
    this.add.rectangle(left, baseline, width, gameUnits(3), 0x3a3a5f);

    // 曲线：V(t) = finalV × exp(-damping × t)，t ∈ [0, 10]
    const g = this.add.graphics();
    g.lineStyle(gameUnits(7), 0xff6b35, 1);
    const steps = 120;
    const points: Phaser.Math.Vector2[] = [];
    for (let i = 0; i <= steps; i += 1) {
      const t = (AFTERGLOW_HORIZON * i) / steps;
      const v = report.finalV * Math.exp(-report.damping * t);
      const px = left + (width * i) / steps;
      const py = baseline - height * (v / 1.0);
      points.push(new Phaser.Math.Vector2(px, py));
    }
    g.strokePoints(points, false);

    const tracer = this.add.circle(left, baseline - height * report.finalV, gameUnits(16), 0xffd700);
    this.tweens.add({
      targets: tracer,
      x: right,
      y: { from: baseline - height * report.finalV, to: baseline },
      duration: 2200,
      ease: 'Sine.out',
      onComplete: () => tracer.setAlpha(0),
    });

    addGameText(this, left, baseline + gameUnits(30), 't=0', {
      color: '#4a4a5f',
      fontFamily: '"PingFang SC", "Microsoft YaHei", sans-serif',
      fontSize: gamePixels(38),
    }).setOrigin(0, 0);
    addGameText(this, right, baseline + gameUnits(30), `t=${AFTERGLOW_HORIZON}`, {
      color: '#4a4a5f',
      fontFamily: '"PingFang SC", "Microsoft YaHei", sans-serif',
      fontSize: gamePixels(38),
    }).setOrigin(1, 0);
    addGameText(
      this,
      left + width / 2,
      top - gameUnits(20),
      `余韵 V(t)=${report.finalV.toFixed(2)}×exp(-${report.damping.toFixed(3)}×t)`,
      {
        color: '#8a8a9a',
        fontFamily: '"PingFang SC", "Microsoft YaHei", sans-serif',
        fontSize: gamePixels(42),
      },
    ).setOrigin(0.5, 1);
  }

  private createCopyButton(cx: number, reportText: string): void {
    const y = gameUnits(LAYOUT.copyBtnY);
    const w = gameUnits(900);
    const h = gameUnits(150);

    const btn = this.add.rectangle(cx, y, w, h, 0x1a2a1a).setStrokeStyle(gameUnits(3), 0x5fa863);
    addGameText(this, cx, y, '复制成绩单', {
      color: '#9bd4c0',
      fontFamily: '"PingFang SC", "Microsoft YaHei", sans-serif',
      fontSize: gamePixels(56),
    }).setOrigin(0.5);

    btn.setInteractive({ useHandCursor: true });
    btn.on('pointerup', () => {
      const clipboard = navigator?.clipboard;
      if (clipboard?.writeText) {
        clipboard.writeText(reportText).then(() => {
          btn.setFillStyle(0x2a4a2a);
        });
      }
    });
    markEditable('result.copy-button', btn, { label: '复制成绩单按钮' });
  }

  private createNavButtons(cx: number, episodeId: string): void {
    const y = gameUnits(LAYOUT.navBtnY);
    const w = gameUnits(680);
    const h = gameUnits(150);
    const gap = gameUnits(180);

    const again = this.add.rectangle(cx - gap / 2 - w / 2 + gameUnits(0), y, w, h, 0x1a1a2a)
      .setStrokeStyle(gameUnits(3), 0x4a4a6a);
    addGameText(this, cx - gap / 2 - w / 2, y, '再调一次', {
      color: '#e8e4d8',
      fontFamily: '"PingFang SC", "Microsoft YaHei", sans-serif',
      fontSize: gamePixels(52),
    }).setOrigin(0.5);
    again.setInteractive({ useHandCursor: true });
    again.on('pointerup', () => {
      // 显式传完整 launch data：防止 Phaser 保留上局 replay 的旧 data
      this.scene.start('tune', { episodeId, mode: 'live' });
    });
    markEditable('result.again-button', again, { label: '再调一次按钮' });

    const back = this.add.rectangle(cx + gap / 2 + w / 2, y, w, h, 0x1a1a2a)
      .setStrokeStyle(gameUnits(3), 0x4a4a6a);
    addGameText(this, cx + gap / 2 + w / 2, y, '回片头', {
      color: '#e8e4d8',
      fontFamily: '"PingFang SC", "Microsoft YaHei", sans-serif',
      fontSize: gamePixels(52),
    }).setOrigin(0.5);
    back.setInteractive({ useHandCursor: true });
    back.on('pointerup', () => {
      this.scene.start('title');
    });
    markEditable('result.back-button', back, { label: '回片头按钮' });
  }
}
