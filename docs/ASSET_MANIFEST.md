# Asset manifest · Stage A

| ID | Path relative to public | Type | Size | FPS | Anchor | Status |
| --- | --- | --- | --- | --- | --- | --- |
| battle-courtyard | assets/battle/backgrounds/courtyard.webp | background | 1280×720 | 0 | 0.5,0.5 | generated |
| battle-sample-liu-bei | assets/battle/heroes/liu-bei/idle.png | single pose | 256×256 | 0 | 0.5,1 | generated |
| battle-sample-guan-yu | assets/battle/heroes/guan-yu/idle.png | single pose | 256×256 | 0 | 0.5,1 | generated |
| battle-sample-zhang-fei | assets/battle/heroes/zhang-fei/idle.png | single pose | 256×256 | 0 | 0.5,1 | generated |
| battle-sprites | assets/heroes/battle-sprites.webp | legacy atlas for remaining heroes | 1024×1024, tile 256 | 0 | 0.5,1 | placeholder |
| slash/heal | runtime Phaser geometry | VFX | dynamic | tween | target | placeholder |
| labels/bars | runtime Phaser text/geometry | UI | dynamic | 0 | per element | placeholder |

The effects and ui folders are reserved for later textures. Current geometry layers are built independently at runtime. All six state animation frame sets remain pending. No frame animation is claimed for a single pose.
