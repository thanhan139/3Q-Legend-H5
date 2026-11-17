"""Measure original chibi RGBA sources; write metadata only, never edit artwork."""
import hashlib,json,re,subprocess
from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parents[1]
text=(root/'src/ui/heroPresentation.ts').read_text(encoding='utf-8')
order=re.findall(r"'([^']+)'",text.split('export const atlasOrder = [',1)[1].split('];',1)[0])
atlasPath='public/assets/heroes/battle-sprites.webp';atlas=Image.open(root/atlasPath).convert('RGBA')
def bounds(image):return image.getchannel('A').point(lambda a:255 if a>=128 else 0).getbbox()
def digest(data):return hashlib.sha256(data).hexdigest()
def provenance(path):
 data=(root/path).read_bytes();original=subprocess.check_output(['git','show','HEAD:'+path],cwd=root)
 assert data==original,'Original chibi source was changed: '+path
 return dict(path=path,sha256=digest(data),matchesHead=True)
sources=[provenance(atlasPath)];heroes={}
for i,hero in enumerate(order):
 x,y=i%4*256,i//4*256;cell=atlas.crop((x,y,x+256,y+256));b=bounds(cell)
 bottom=cell.getchannel('A').crop((0,b[3]-6,256,b[3])).point(lambda a:255 if a>=128 else 0).getbbox()
 foot=[(bottom[0]+bottom[2])/2,b[3]]
 spec=dict(frame=i,staticBounds=list(b),staticFoot=foot,maxWidth=b[2]-b[0],maxHeight=b[3]-b[1],clipFeet=[],clips=[])
 path=f'public/assets/battle/heroes/{hero}/poses.webp'
 if (root/path).exists():
  sheet=Image.open(root/path).convert('RGBA');frames=[]
  for n in range(24):
   fb=bounds(sheet.crop((n%6*256,n//6*256,n%6*256+256,n//6*256+256)));frames.append(fb)
  spec.update(maxWidth=max(f[2]-f[0] for f in frames),maxHeight=max(f[3]-f[1] for f in frames),
    clipFeet=[[128,f[3]] for f in frames],clipBounds=[list(f) for f in frames],clips=['idle','attack','hit','death'])
  sources.append(provenance(path))
 heroes[hero]=spec
out=root/'src/data/chibiBattleAssets.json'
out.write_text(json.dumps(dict(cellSize=256,heroes=heroes),ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
report=root/'docs/battle/chibi';report.mkdir(parents=True,exist_ok=True)
(report/'ASSET_AUDIT.json').write_text(json.dumps(dict(sources=sources,heroCount=len(heroes),
 animated=[id for id,s in heroes.items() if s['clips']],staticOnly=[id for id,s in heroes.items() if not s['clips']],
 originalAssetsModified=False),ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('CHIBI_SOURCE_AUDIT_PASS:',len(heroes),'identities;',len(sources),'original source files match Git HEAD byte for byte')
