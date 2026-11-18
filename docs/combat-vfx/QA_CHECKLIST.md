# QA checklist

- [ ] All clips decode (PIL verify, no truncated PNG)
- [ ] Atlas width = columns × 256, height = rows × 256
- [ ] Frame ordering row-major, last cells unused transparent
- [ ] Runtime VFX draws without unintended pale/white rectangular background
- [ ] Hero VFX (xanh/lôi/hỏa/phù văn/hoa) distinctive
- [ ] Attack windup → hit frame → defender reacts; no floating damage before hit
- [ ] HP/Nộ/death changes only from Battle Core authoritative events
- [ ] Defender death removes sprite, UI, shadows and persistent FX; slot empty
- [ ] Ranged projectile flies from caster to target (not just hits on start)
- [ ] x1/x2/x3/x4 and skip cleanup do not duplicate events/rewards
- [ ] 2 columns × 3 rows each side, all figures show feet, no overlap
- [ ] Pilot Guan Yu attack has manually reviewed limbs, blade, alpha edge before enabling
- [ ] Character-specific idle/run/hit/death/skill still require verified rigs/sprite sheets
- [ ] Desktop 1280x720 & 1920x1080; mobile landscape 844x390
