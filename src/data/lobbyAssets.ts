const assetRoot = `${import.meta.env.BASE_URL}assets/lobby/`;

export const LOBBY_ASSETS = {
  palace: { key: 'lobby-palace', url: `${assetRoot}palace.webp` },
  featuredHero: { key: 'lobby-zhang-fei', url: `${assetRoot}zhang-fei.webp` },
} as const;

