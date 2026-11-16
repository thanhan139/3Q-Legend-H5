# Smooth lobby kit integration

## Source and runtime selection

Read the supplied README, complete manifest, Phaser texture mapping and coverage audit. Original documentation is retained here. `RUNTIME_SELECTION.json` identifies the 18 selected PNGs; their SHA256 values were checked against the original kit after copying. The shipped PNG bytes are unchanged (about 1.20 MB total). Only these individual runtime candidates were copied under `public/assets/ui/lobby_smooth/`.

The palace, real deployed hero sprites and existing portrait atlas remain. No concept, contact sheet, original sheet or sample user/currency/campaign composite is loaded by the game.

## Asset review decisions

- Bottom navigation: four default/selected texture pairs. Stable Vietnamese labels are already in these PNGs, so no duplicate label is drawn. Images preserve their aspect ratio and fit the same bounded hit area in either state.
- Top shortcuts: six labelled runtime PNGs. Their source cutouts contain disconnected strips from neighboring cells along the top edge. Phaser's `clean` frame omits the top 10 pixels; the actual icon/label remains. These are renderer frames, not altered PNGs.
- Campaign CTA: default/selected runtime textures, omitting the disconnected top 8-pixel scrap with a clean frame. Stage, chapter, suggested power and cleared-stage progress remain separate live text/graphics.
- Blank red/gold buttons: clean frames exclude disconnected neighboring fragments (red: 32,24,307,89; gold: 35,5,299,102). Red is used for the player/wallet/VIP/campaign panels and left navigation. Nine-slice rendering preserves corners in WebGL; Canvas has a texture fallback.
- All six default/selected side-navigation variants contain baked notification dots. They are not imported or rendered. Clean blank red frames, existing source icons and dynamic labels are used instead. No locked art is used for the available Arena route.
- The kit's notification-dot cutout also has a neighboring fragment and a cropped glow. It is not imported. Existing dynamic Phaser dots remain driven only by the real welfare eligibility conditions.
- All 36 `needs_visual_review` cutouts remain excluded: beige matte/fringes, clipped neighboring artwork or incomplete frames require retouch before runtime use. No review avatar frame was silently promoted.
- All 18 reference composites remain excluded, including sample portrait, name, level 120, VIP 8, wallet amounts and sample chapter/power.

## Data and interaction

Name and current representative portrait use the existing snapshot/formation. Level retains the existing `clearedStages.length + 1` presentation. Power uses `formationPower`; Dong/Gold use `walletBalance`. Campaign uses the actual next stage and counts configured cleared stages for its progress bar. No character EXP bar, VIP level or balance is invented.

SaveV2 has no VIP progression field. The header displays `VIP —`; its popup still explains that VIP benefits/payment/rewards are unconfigured. Profile/account/logout, VIP, Campaign, Welfare, Arena, all other routes and tutorial target IDs retain their handlers. Locked Guild/World and Summon conditions retain existing behavior.

The dock uses the original four horizontal anchors, with complete image/hit regions inside the 1280×720 safe area. Buttons fit within 168×112 regions centered at y=650, leaving a bottom margin for both normal and selected art. No asset is stretched independently in X/Y for these buttons.

No GameStore, Battle Core, SaveV2, rewards, Supabase schema or gameplay rules were changed by this integration. Pre-existing staging CORS/bootstrap working-tree changes were retained. No deployment was performed for this kit integration.

## Validation

- Local typecheck passed before visual refinements; the local in-process runner passed 147/147 tests.
- Linux Node 22.23.5: standard typecheck, 147/147 regression tests (17 files), and Vite production build passed. Final header/wallet spacing was also checked by a subsequent standard build. The existing bundle-size warning remains.
- Added asset-policy/frame-bounds and dock-safe-area regression checks. SHA256 integrity was separately verified for all 18 copied files.
- Chromium at 1280×720 and 844×390 passed: actual GameStore text, Profile/VIP dialogs, Guild/World placeholders, correct navigation callbacks, normal/selected dock bounds, unchanged Save snapshot, and no browser errors. Screenshots were visually inspected at both sizes.
- Additional browser checks passed for a long name, changed wallet/level/campaign values, large balances fitting the capsule, Settings open/close and scene cleanup.
- Visual checks used an isolated temporary render harness with the actual Lobby, asset loader and GameStore. Navigation destinations were recorded rather than starting battles. Extra data cases used in-memory snapshots, without Supabase credentials/writes. These checks do not claim real-account Auth or Cloud Save E2E coverage. The harness is not shipped with the game.
