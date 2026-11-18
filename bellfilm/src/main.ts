import Phaser from 'phaser';

import { BootScene } from './scene/BootScene';
import { DevLoadingScene } from './scene/DevLoadingScene';
import { TitleScene } from './scene/TitleScene';
import { TuneScene } from './scene/TuneScene';
import { ResultScene } from './scene/ResultScene';
import { parseAgentUrl } from './agent/api';
import { EPISODES } from './data/episodes';
import { GAME_HEIGHT, GAME_WIDTH } from './rendering';
import './style.css';

const EPISODE_IDS = EPISODES.map((episode) => episode.id);

// Panel flow.launch 的启动意图，经 registry 交给 BootScene 分流
interface FlowLaunch {
  readonly nodeId: string;
  readonly episodeId?: string;
  readonly agentName?: string;
}

// 工厂薄层：只把 LaunchSpec 映射到工程已声明的真实入口与参数，未知目标明确失败
const resolveFlowLaunch = (launchSpec: LaunchSpec): FlowLaunch => {
  if (launchSpec.target.graph_id !== 'main') {
    throw new Error(`未知流程 graph: ${launchSpec.target.graph_id}`);
  }

  switch (launchSpec.target.node_id) {
    case 'title.root':
      return { nodeId: 'title.root' };

    case 'tune.play': {
      const episodeId = launchSpec.input?.episodeId;
      if (typeof episodeId !== 'string' || !EPISODE_IDS.includes(episodeId)) {
        throw new Error(`episodeId 非法：${String(episodeId)}（合法值：${EPISODE_IDS.join(', ')}）`);
      }
      const agentName = launchSpec.input?.agentName;
      return {
        nodeId: 'tune.play',
        episodeId,
        agentName:
          typeof agentName === 'string' && agentName.trim() !== ''
            ? agentName.trim()
            : undefined,
      };
    }

    case 'result.report':
      // 成绩单由调谐结算运行时产生，不提供直接启动入口
      throw new Error('result.report 由调谐结算产生，不能直接启动');

    default:
      throw new Error(`未知节点: ${launchSpec.target.node_id}`);
  }
};

const createGame = (launchSpec?: LaunchSpec): Phaser.Game => {
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    pixelArt: false,
    parent: 'game',
    // 运行时单坐标系：Canvas、Scene、Camera、Pointer 与碰撞完全一致。
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: '#0a0a14',
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: [BootScene, DevLoadingScene, TitleScene, TuneScene, ResultScene],
  });

  // Agent URL 一次性提交模式：?agent=名字&ep=EP003&t=0.7,0.4,...
  // BootScene 加载完成后按 registry 里的 spec 决定进入回放或片头
  const agentSpec = parseAgentUrl(window.location?.search ?? '');
  if (agentSpec) {
    game.registry.set('agentSpec', agentSpec);
  }

  // Panel flow.launch：显式指定优先于 URL 环境噪声
  if (launchSpec) {
    game.registry.set('flowLaunch', resolveFlowLaunch(launchSpec));
  }

  return game;
};

// 注册游戏到 PhaserBridge，可以在扣子网页游戏开发中编辑评论
if (window.PhaserBridge) {
  window.PhaserBridge.bind({
    // 首次正常启动时 launchPlan 为 undefined；Flow 跳转时由 Bridge 传入。
    launchGame(launchPlan) {
      return createGame(launchPlan);
    },
  });
} else {
  // 未提供 Bridge 的运行环境中，游戏仍可正常启动。
  createGame();
}
