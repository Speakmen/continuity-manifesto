export const IMAGES: Record<string, string> = {};

// 可降级正式素材：由消费 Scene 自行加载，失败时走程序化兜底，不进 Boot 的 fail-fast 队列
export const OPTIONAL_IMAGES: Record<string, string> = {
  'title-background': 'assets/image/title-background-v1/title-background.jpg',
};

export const IMAGE_SEQUENCES: Record<string, string> = {
  'coze-game-loading': 'assets/image_sequence/coze-game-loading',
};

export const VIDEOS: Record<string, string> = {};

export const AUDIOS: Record<string, string> = {};

// 注册素材到 PhaserBridge，可以在扣子网页游戏开发中定位
window.PhaserBridge?.markImageAssetMap?.({ ...IMAGES, ...OPTIONAL_IMAGES });
window.PhaserBridge?.markImageSequenceAssetMap?.(IMAGE_SEQUENCES);
window.PhaserBridge?.markVideoAssetMap?.(VIDEOS);
window.PhaserBridge?.markAudioAssetMap?.(AUDIOS);
