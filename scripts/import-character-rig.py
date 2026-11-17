"""Import original layered PNG bytes; analyze alpha/cell bounds only, never repaint/crop artwork.
Usage: python scripts/import-character-rig.py HERO SOURCE.png
Requires Pillow. Fixed 4x4 cutout specification is documented in CHARACTER_REMASTER.md.
"""
import sys, json, hashlib, shutil
from pathlib import Path
from collections import deque
from PIL import Image

PARTS=['head','torso','upperNear','foreNear','upperFar','foreFar','thighNear','shinNear',
       'thighFar','shinFar','weapon','cape','hair','skirt','accessory','headHit']
ROOT=Path(__file__).resolve().parents[1]
def import_rig(hero,source,version='v1'):
    if hero not in ['zhao-yun','guan-yu','liu-bei','zhang-fei','dian-wei']:raise ValueError('Register a reviewed hero identity first')
    source=Path(source);im=Image.open(source).convert('RGBA');w,h=im.size
    if min(w,h)<1024 or abs(w/h-1)>.03:raise ValueError('Expected high-resolution square 4x4 parts atlas')
    if im.getchannel('A').getextrema()[0]!=0:raise ValueError('A genuinely transparent PNG is required')
    frames={}
    for i,name in enumerate(PARTS):
        left,top=int((i%4)*w/4),int((i//4)*h/4)
        right,bottom=int((i%4+1)*w/4),int((i//4+1)*h/4)
        # Remove baked rear hair from head cells; the separate hair part is animated instead.
        if name in ['head','headHit']:left+=int((right-left)*.29)
        alpha=im.getchannel('A').crop((left,top,right,bottom));a=alpha.load();cw,ch=alpha.size
        seen=set();best=[]
        for y in range(ch):
            for x in range(cw):
                if a[x,y]<128 or (x,y) in seen:continue
                q=deque([(x,y)]);seen.add((x,y));component=[]
                while q:
                    px,py=q.popleft();component.append((px,py))
                    for nx,ny in [(px-1,py),(px+1,py),(px,py-1),(px,py+1)]:
                        if 0<=nx<cw and 0<=ny<ch and (nx,ny) not in seen and a[nx,ny]>=128:
                            seen.add((nx,ny));q.append((nx,ny))
                if len(component)>len(best):best=component
        if len(best)<100:raise ValueError('Missing cutout '+name)
        xs,ys=zip(*best);x=max(0,min(xs)-2);y=max(0,min(ys)-2)
        r=min(cw,max(xs)+3);b=min(ch,max(ys)+3)
        frames[name]=[left+x,top+y,r-x,b-y]
    target=ROOT/'public/assets/battle/remaster'/hero;target.mkdir(parents=True,exist_ok=True)
    if version not in ['v1','v2']:raise ValueError('Unknown asset revision')
    shutil.copyfile(source,target/f'parts-{version}.png')
    data=dict(heroId=hero,texture=f'assets/battle/remaster/{hero}/parts-{version}.png',size=[w,h],
              sha256=hashlib.sha256(source.read_bytes()).hexdigest(),frames=frames,
              pipeline='layered-rig',rasterModified=False)
    if version=='v2':
        key={'zhao-yun':'trieu_van','guan-yu':'quan_vu','liu-bei':'luu_bi','zhang-fei':'truong_phi','dian-wei':'dien_vi'}[hero]
        reference=ROOT/'docs/battle/remaster/source/normalized'/(key+'.png')
        data['provenance']=dict(sourceKit='Hero_Remaster_Static_Sprites_v1.0',sourceHeroKey=key,
            referenceSha256=hashlib.sha256(reference.read_bytes()).hexdigest(),
            authoring='Repainted isolated body parts, built-in imagegen; native Phaser articulated cutout rig',
            artApproval='prototype; final artist review pending')
    (target/'rig.json').write_text(json.dumps(data,indent=2)+'\n',encoding='utf-8')
    config=ROOT/'src/data/characterRigs';config.mkdir(parents=True,exist_ok=True)
    (config/(hero+'.json')).write_text(json.dumps(data,indent=2)+'\n',encoding='utf-8')
    print(hero,': 16 cutout frames, original PNG bytes preserved')
if __name__=='__main__':import_rig(sys.argv[1],sys.argv[2],sys.argv[3] if len(sys.argv)>3 else 'v1')
