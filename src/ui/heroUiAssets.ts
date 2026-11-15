import { SKILL_EFFECTS } from '../data/skillVfx';
import { HEROES } from '../data/heroes';
import type { Rarity } from '../domain/types';

export const HERO_UI_RANK: Record<Rarity, string> = { R: 'rank-r', SR: 'rank-sr', SSR: 'rank-ssr', 'SSS+': 'rank-legend' };
const textures = ['stage', 'paper', 'ribbon', 'roster', ...Object.values(HERO_UI_RANK),
  'crest-shu', 'crest-wei', 'crest-wu', 'crest-warlords',
  ...HEROES.flatMap(hero => [`${hero.id}-normal`, `${hero.id}-passive`,
    ...(SKILL_EFFECTS[hero.ultimateSkillId].icon ? [] : [`${hero.id}-ultimate`])]),
];
export const heroUiKey = (id: string) => `heroes-ui-${id}`;

export function loadHeroUi(loader: Phaser.Loader.LoaderPlugin) {
  for (const id of textures) loader.image(heroUiKey(id), `${import.meta.env.BASE_URL}assets/ui/heroes/${id}.webp`);
}
