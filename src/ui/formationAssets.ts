export const formationKey = (id: string) => `formation-${id}`;
export const formationSlots = ['front', 'rear'].flatMap(row =>
  [1, 2, 3].map(column => `slots.formation_${row}_0${column}`));

const factions = ['shu', 'wei', 'wu', 'qun'];
const assets = [
  ...formationSlots,
  ...factions.flatMap(id => [`factions.crest_${id}`, `factions.synergy_${id}`]),
  ...['r', 'sr', 'ssr', 'sss'].map(id => `rarity.hero_frame_${id}`),
  'panels.roster_panel_six_cells', 'frames.title_dragon_red', 'frames.section_title_teal',
  'buttons.go_back_gold', 'buttons.small_red_alt', 'buttons.enter_battle_gold',
  'vfx.selection_ring_gold', 'icons.add_diamond',
];

export function loadFormationUi(loader: Phaser.Loader.LoaderPlugin) {
  for (const id of assets) {
    loader.image(formationKey(id), `${import.meta.env.BASE_URL}assets/ui/formation/${id.replace('.', '/')}.png`);
  }
}
