// 振阵 · Agent 玩法接口
// 有浏览器执行能力的 agent 通过 window.__zhenzhen 逐帧实时游玩；
// 无浏览器能力的 agent 走 URL 参数一次性提交（由 main.ts 解析）。

import type { FrameResult } from '../core/engine';

export interface ZhenzhenState {
  readonly finished: boolean;
  readonly episode: string;
  readonly agentName?: string;
  readonly frameIndex?: number;
  readonly totalFrames?: number;
  readonly frame?: {
    readonly id: string;
    readonly ts: string;
    readonly v: number;
    readonly f: string;
    readonly e: readonly [number, number, number];
    readonly silent: boolean;
    readonly scene: string | null;
  };
  readonly targetHint?: number | null;
  readonly score: number;
  readonly combo?: number;
}

export interface ZhenzhenApi {
  readonly version: string;
  readonly docs: string;
  getState(): ZhenzhenState;
  tune(value: number): { ok: boolean; verdict?: string; delta?: number | null; scoreDelta?: number; combo?: number; error?: string };
  hold(): { ok: boolean; verdict?: string; scoreDelta?: number; error?: string };
  results(): readonly FrameResult[];
  isFinished(): boolean;
}

let currentApi: ZhenzhenApi | null = null;

export const registerAgentApi = (api: Omit<ZhenzhenApi, 'version' | 'docs'>): void => {
  currentApi = {
    version: '1.0',
    docs: [
      '振阵 Agent 接口：',
      'getState() 读当前帧（含 v/f/e/s 与 targetHint）',
      'tune(0~1) 提交调谐值；沉默帧调用会被拒绝',
      'hold() 沉默帧守静（+40 分）；非沉默帧调用会被拒绝',
      'results() 读全部判定历史；isFinished() 判断是否收束',
      '频率公式：target = clamp01(0.12 + 0.76*v + 五行偏移)',
      '五行偏移：火+0.08 金-0.06 土±0 水-0.08 木+0.06 风+0.02',
    ].join('\n'),
    ...api,
  };

  if (typeof window !== 'undefined') {
    (window as unknown as { __zhenzhen?: ZhenzhenApi }).__zhenzhen = currentApi;
  }
};

export const clearAgentApi = (): void => {
  currentApi = null;
  if (typeof window !== 'undefined') {
    delete (window as unknown as { __zhenzhen?: ZhenzhenApi }).__zhenzhen;
  }
};

export interface AgentUrlSpec {
  readonly agentName: string;
  readonly episodeId: string;
  readonly tunes: number[];
}

/** 解析 ?agent=名字&ep=EP003&t=0.7,0.4,... —— URL 即协议 */
export const parseAgentUrl = (
  search: string,
): AgentUrlSpec | null => {
  if (typeof window === 'undefined') {
    return null;
  }
  const params = new URLSearchParams(search);
  const agent = params.get('agent');
  const ep = params.get('ep');
  const tunes = params.get('t');
  if (!agent || !ep || !tunes) {
    return null;
  }
  const values = tunes
    .split(',')
    .map((raw) => Number.parseFloat(raw.trim()))
    .filter((value) => Number.isFinite(value) && value >= 0 && value <= 1);
  if (values.length === 0) {
    return null;
  }
  return { agentName: agent, episodeId: ep.toUpperCase(), tunes: values };
};
