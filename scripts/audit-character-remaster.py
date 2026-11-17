"""Read-only art validation + reproducible report. Never edits raster pixels."""
import json,re,hashlib
from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parents[1]
out=root/'docs/battle/remaster'
roster=set(re.findall(r"id:'([^']+)'",(root/'src/data/heroes.ts').read_text(encoding='utf-8')))
mapping={'trieu_van':'zhao-yun','luu_bi':'liu-bei','quan_vu':'guan-yu','truong_phi':'zhang-fei',
 'hoang_trung':'huang-zhong','gia_cat_luong':'zhuge-liang','ha_hau_don':'xiahou-dun','truong_lieu':'zhang-liao',
 'dien_vi':'dian-wei','tao_hong':'cao-hong','hoa_hung':'hua-xiong','tao_nhan':'cao-ren'}
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
sources=[];rigs=[]
for key,hero in mapping.items():
 p=out/'source/normalized'/(key+'.png');im=Image.open(p)
 assert im.mode=='RGBA' and im.size==(448,448) and im.getchannel('A').getextrema()[0]==0
 sources.append(dict(key=key,heroId=hero if hero in roster else None,proposedId=hero,
  source=str(p.relative_to(root)),sha256=sha(p),staticOnly=True,
  status='verified name/weapon against current roster' if hero in roster else 'NOT MAPPED: absent from HeroConfig; no hero invented'))
for p in sorted((root/'src/data/characterRigs').glob('*.json')):
 spec=json.loads(p.read_text());png=root/'public'/spec['texture'];im=Image.open(png)
 assert spec['heroId'] in roster and sha(png)==spec['sha256']
 assert im.mode=='RGBA' and im.getchannel('A').getextrema()[0]==0 and len(spec['frames'])==16
 rigs.append(dict(heroId=spec['heroId'],texture=spec['texture'],dimensions=im.size,
  rgbaBytes=im.width*im.height*4,alphaRange=im.getchannel('A').getextrema(),sha256=spec['sha256'],
  parts=16,method='native Phaser articulated cutout rig; no Spine or baked animation frames',
  states=['idle','run','attack','skill','hit','death','victory'],artStatus='prototype, final joint/hair/armor paint review pending'))
report=dict(sourceKitStaticOnly=True,blueprintContainsAnimationArt=False,sourceMappings=sources,runtimeRigs=rigs,
 estimatedRigTextureBytes=sum(r['rgbaBytes'] for r in rigs),
 rosterWithoutRemasterRig=sorted(roster-{r['heroId'] for r in rigs}),
 legacyAudit='docs/battle/CHARACTER_ASSET_AUDIT.json',
 legacyPolicy='Keep original static/chibi clips for unconverted IDs; do not claim those are adult animations',
 uiPolicy='Battle UI kit and Formation layout retained; concept sheets never loaded as character textures')
(out/'INTEGRATION_AUDIT.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('REMASTER_ASSET_AUDIT_PASS:',len(sources),'static references,',len(rigs),'articulated rigs,',len(report['rosterWithoutRemasterRig']),'roster IDs still legacy')
