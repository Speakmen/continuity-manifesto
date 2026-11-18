// 振阵核心引擎：调谐判定、共振链、沉默帧、收束余韵
// 状态 owner——Scene 只消费本引擎，不复制判定逻辑

import type { BellFrame, Episode } from '../data/episodes';

export type Verdict = 'perfect' | 'good' | 'poor' | 'miss' | 'silent' | 'noisy';

export interface FrameResult {
  readonly frameIndex: number;
  readonly frameId: string;
  readonly verdict: Verdict;
  readonly tuneValue: number | null;
  readonly target: number | null;
  readonly delta: number | null;
  readonly scoreDelta: number;
  readonly comboAfter: number;
}

export interface FinalReport {
  readonly episodeId: string;
  readonly agentName: string;
  readonly resonance: number;
  readonly afterglow: number;
  readonly total: number;
  readonly damping: number;
  readonly finalV: number;
  readonly perfectCount: number;
  readonly goodCount: number;
  readonly poorCount: number;
  readonly missCount: number;
  readonly silentOkCount: number;
  readonly noisyCount: number;
  readonly results: readonly FrameResult[];
  readonly outro: string;
}

// 五行偏移：目标频率 = clamp01(0.12 + 0.76×v + 五行偏移)
// 公式公开——agent 玩家按公式推理目标，考验的是读文档与执行纪律
const ELEMENT_BIAS: Readonly<Record<string, number>> = {
  火: 0.08,
  金: -0.06,
  土: 0.00,
  水: -0.08,
  木: 0.06,
  风: 0.02,
};

export const TARGET_FORMULA_DOC =
  '目标频率 = clamp01(0.12 + 0.76×v + 五行偏移)；五行偏移：火+0.08 金-0.06 土±0.00 水-0.08 木+0.06 风+0.02（取频率字段首字）';

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

export const elementOf = (f: string): string => f.charAt(0);

export const targetOf = (frame: BellFrame): number => {
  if (frame.s) {
    return 0;
  }
  const bias = ELEMENT_BIAS[elementOf(frame.f)] ?? 0;
  return clamp01(0.12 + 0.76 * frame.v + bias);
};

// 判定阈值：|t - target|
export const THRESHOLD_PERFECT = 0.05;
export const THRESHOLD_GOOD = 0.15;
export const THRESHOLD_POOR = 0.30;

const SCORE_PERFECT = 100;
const SCORE_GOOD = 60;
const SCORE_POOR = 10;
const SCORE_MISS = -20;
const SCORE_SILENT_OK = 40;
const COMBO_BONUS = 0.1;

// 收束余韵：V(t) = final_v × exp(-damping × t)
// 断裂越多山谷越陡（damping 越大）余韵散得越快；完美共振越多山谷越深（damping 越小）余韵越长
export const BASE_DAMPING = 0.15;
export const AFTERGLOW_HORIZON = 10;
export const AFTERGLOW_WEIGHT = 300;

export const verdictLabel = (verdict: Verdict): string => {
  switch (verdict) {
    case 'perfect':
      return '共振锁定';
    case 'good':
      return '共振';
    case 'poor':
      return '失谐';
    case 'miss':
      return '断裂';
    case 'silent':
      return '守静';
    case 'noisy':
      return '静默中发声';
  }
};

export class TuningEngine {
  readonly episode: Episode;
  readonly agentName: string;

  private frameIndex = 0;
  private scoreRaw = 0;
  private combo = 0;
  private readonly results: FrameResult[] = [];

  constructor(episode: Episode, agentName = '无名调谐者') {
    this.episode = episode;
    this.agentName = agentName;
  }

  get totalFrames(): number {
    return this.episode.frames.length;
  }

  get currentIndex(): number {
    return this.frameIndex;
  }

  get currentFrame(): BellFrame | undefined {
    return this.episode.frames[this.frameIndex];
  }

  get score(): number {
    return Math.max(0, this.scoreRaw);
  }

  get rawScore(): number {
    return this.scoreRaw;
  }

  get currentCombo(): number {
    return this.combo;
  }

  get isFinished(): boolean {
    return this.frameIndex >= this.episode.frames.length;
  }

  get history(): readonly FrameResult[] {
    return this.results;
  }

  /** 提交调谐值。返回判定结果；帧已结束或值非法时返回 null。 */
  submit(value: number): FrameResult | null {
    if (this.isFinished) {
      return null;
    }
    if (!Number.isFinite(value) || value < 0 || value > 1) {
      return null;
    }
    const frame = this.currentFrame;
    if (!frame) {
      return null;
    }

    if (frame.s) {
      // 沉默帧里发声：共振链断裂，不得分
      this.combo = 0;
      const result: FrameResult = {
        frameIndex: this.frameIndex,
        frameId: frame.id,
        verdict: 'noisy',
        tuneValue: value,
        target: null,
        delta: null,
        scoreDelta: 0,
        comboAfter: this.combo,
      };
      this.results.push(result);
      this.frameIndex += 1;
      return result;
    }

    const target = targetOf(frame);
    const delta = Math.abs(value - target);
    let verdict: Verdict;
    let base: number;
    if (delta < THRESHOLD_PERFECT) {
      verdict = 'perfect';
      base = SCORE_PERFECT;
    } else if (delta < THRESHOLD_GOOD) {
      verdict = 'good';
      base = SCORE_GOOD;
    } else if (delta < THRESHOLD_POOR) {
      verdict = 'poor';
      base = SCORE_POOR;
    } else {
      verdict = 'miss';
      base = SCORE_MISS;
    }

    if (verdict === 'perfect' || verdict === 'good') {
      this.scoreRaw += Math.round(base * (1 + COMBO_BONUS * this.combo));
      this.combo += 1;
    } else {
      this.scoreRaw += base;
      this.combo = 0;
    }

    const result: FrameResult = {
      frameIndex: this.frameIndex,
      frameId: frame.id,
      verdict,
      tuneValue: value,
      target,
      delta,
      scoreDelta: verdict === 'perfect' || verdict === 'good'
        ? Math.round(base * (1 + COMBO_BONUS * (this.combo - 1)))
        : base,
      comboAfter: this.combo,
    };
    this.results.push(result);
    this.frameIndex += 1;
    return result;
  }

  /** 守静：只在沉默帧合法，+40 且保留共振链；非沉默帧返回 null。 */
  hold(): FrameResult | null {
    if (this.isFinished) {
      return null;
    }
    const frame = this.currentFrame;
    if (!frame || !frame.s) {
      return null;
    }
    this.scoreRaw += SCORE_SILENT_OK;
    const result: FrameResult = {
      frameIndex: this.frameIndex,
      frameId: frame.id,
      verdict: 'silent',
      tuneValue: null,
      target: null,
      delta: null,
      scoreDelta: SCORE_SILENT_OK,
      comboAfter: this.combo,
    };
    this.results.push(result);
    this.frameIndex += 1;
    return result;
  }

  /** 收束结算：共振分 + 余韵分 */
  finalize(): FinalReport {
    const count = (verdict: Verdict): number =>
      this.results.filter((result) => result.verdict === verdict).length;

    const perfectCount = count('perfect');
    const missCount = count('miss');
    const damping = Math.min(
      0.6,
      Math.max(
        0.03,
        BASE_DAMPING + 0.05 * missCount - 0.02 * perfectCount,
      ),
    );
    const afterglow =
      this.episode.finalV * Math.exp(-damping * AFTERGLOW_HORIZON);
    const resonance = Math.max(0, this.scoreRaw);

    return {
      episodeId: this.episode.id,
      agentName: this.agentName,
      resonance,
      afterglow,
      total: Math.round(resonance + afterglow * AFTERGLOW_WEIGHT),
      damping,
      finalV: this.episode.finalV,
      perfectCount,
      goodCount: count('good'),
      poorCount: count('poor'),
      missCount,
      silentOkCount: count('silent'),
      noisyCount: count('noisy'),
      results: [...this.results],
      outro: this.episode.outro,
    };
  }
}

/** Agent URL 回放模式：把 t 数组灌进引擎 */
export const replayTunes = (
  episode: Episode,
  tunes: readonly number[],
  agentName: string,
): TuningEngine => {
  const engine = new TuningEngine(episode, agentName);
  for (const value of tunes) {
    if (engine.isFinished) {
      break;
    }
    const frame = engine.currentFrame;
    if (!frame) {
      break;
    }
    if (frame.s) {
      // 沉默帧：值>0.5 视为发声，否则守静
      if (value > 0.5) {
        engine.submit(value);
      } else {
        engine.hold();
      }
      continue;
    }
    engine.submit(value);
  }
  return engine;
};

export const formatReport = (report: FinalReport): string => {
  const lines = [
    `【振阵成绩单】`,
    `调谐者: ${report.agentName}`,
    `集数: ${report.episodeId}`,
    `总分: ${report.total}（共振 ${report.resonance} + 余韵 ${Math.round(report.afterglow * AFTERGLOW_WEIGHT)}）`,
    `判定: 锁定×${report.perfectCount} 共振×${report.goodCount} 失谐×${report.poorCount} 断裂×${report.missCount} 守静×${report.silentOkCount} 发声×${report.noisyCount}`,
    `收束: final_v=${report.finalV.toFixed(2)} damping=${report.damping.toFixed(3)} 余韵=${report.afterglow.toFixed(4)}`,
    `余韵公式: V(t)=final_v×exp(-damping×t)`,
    `${report.outro}`,
  ];
  return lines.join('\n');
};
