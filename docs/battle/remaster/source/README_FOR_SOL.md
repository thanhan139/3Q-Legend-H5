# 3Q Legend H5 — Battle Character Static Sprite Kit v1.0

**12 extracted full-body hero PNGs, one file per character, with transparent backgrounds.**

## Folders
- `sprites/normalized/*.png` — **recommended** Phaser textures: 448×448 RGBA, same foot anchor (`originX=0.5`, `originY=0.933036`).
- `sprites/trimmed/*.png` — alpha-trimmed natural size; use with accurate texture origin derived from the normalized art or calculate origins per image.
- `docs/HERO_CONTACT_SHEET.jpg` — hero contact sheet.
- `docs/CHECKERBOARD_QA.jpg` — visual alpha / cutouts preview.
- `source/approved_12_hero_sheet.png` — the original sheet as reference ONLY; do not load in battle runtime.
- `HERO_MAPPING.json` and `ASSET_MANIFEST.csv` — keys, provisional names/factions, sizes and QA status.
- `PROMPT_FOR_SOL.md` — integration instructions.

## Important limitations
1. All 12 PNGs are **still images**. They are NOT frame animations, Spine rigs, body-part layers, motion clips, or battle-ready move sets. Phaser can render these sprites, but realistic full-body RUN, ATTACK, HIT, SKILL, DEATH require separately authored sprite sheets or rig assets.
2. The source is a generated composite, not layered artwork; hairstyles/capes/weapons may need artist review for edge fringes, pose consistency, weapon silhouettes and identification. This version uses connected-component alpha separation instead of naïve 4×3 hard slicing to preserve objects that overhang grid boundaries. The outputs are artist QA pending.
3. Character names/factions are **provisional assignments by position** in the generated 4×3 sheet. Verify against game HeroConfig and concept before replacing any production hero sprite. For some characters the artwork is stylized rather than historically faithful.
4. Never delete original textures until a build, animation fallback and regression testing pass. Prefer **replace references, then remove unused files** after `rg`/import checks. Existing Heroes, hero IDs and skills should remain unchanged.
5. Do not generate gameplay by placing the entire concept sheet as one image. Use individual PNGs and per-character data.

## Phaser 3 example
```ts
this.load.image('battle.hero.trieu_van', 'assets/battle/heroes/trieu_van.png');
// create image from hero ID -> texture mapping
const view = this.add.image(slot.x, slot.y, 'battle.hero.trieu_van')
  .setOrigin(0.5, 418 / 448);
// Fit within allocated slot (not gigantic and not stretched):
const scale = Math.min(slot.maxWidth / 448, slot.maxHeight / 448);
view.setScale(scale);
```

For existing scene assets use the exact loader path convention already in the project. Reference canvas has ~30–100 pixels of transparent headroom; calculate visual scale based on **visible alpha bounding boxes** for consistent hero size, not just transparent canvas size.

## Death and 6v6 formation
- Ally left and enemy right, per side **2 columns × 3 rows**: backline (outside), frontline (toward center).
- HP reaches 0: play supported death effect (e.g. dissolve) then **remove character, HUD, shadow, attached VFX** from arena. Keep slot vacant; do not reflow survivors. Maintain server-authoritative combat logic.
- Keep battle speed and Skip buttons; remove Continue/Pause and Quân Ta/Quân Địch banners in approved UI.
