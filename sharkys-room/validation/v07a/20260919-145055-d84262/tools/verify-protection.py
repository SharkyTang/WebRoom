from pathlib import Path
import json,hashlib,datetime
run=json.loads(Path('/private/tmp/v07a-run.json').read_text());root=Path('/Users/shaoqitang/Documents/ChatGPT/网页小屋');project=root/'sharkys-room'
snapshot=Path(run['path']);manifest=json.loads((snapshot/'manifest.json').read_text())
files=[e for e in manifest['entries'] if e['type']=='file'];changes=[];protected=[]
for e in files:
 p=root/e['path']
 actual=hashlib.sha256(p.read_bytes()).hexdigest() if p.exists() else None
 if actual!=e['sha256']:changes.append({'path':e['path'],'before':e['sha256'],'after':actual})
 # Publish only project/code/model/test/report path hashes, never secret configuration content or hidden paths.
 if not any(part.startswith('.') for part in Path(e['path']).parts):protected.append({'path':e['path'],'sha256':actual})
symlinks=[e for e in manifest['entries'] if e['type']=='symlink']
for e in symlinks:
 p=root/e['path']
 if not p.is_symlink() or str(p.readlink())!=e['target']:changes.append({'path':e['path'],'kind':'symlink-mismatch'})
assets=list((project/'public/models/production').rglob('*.glb'))
result={'generatedAt':datetime.datetime.now().astimezone().isoformat(),'snapshot':str(snapshot),'allOriginalFileCount':len(files),'originalSymlinkCount':len(symlinks),'changedOriginalFiles':changes,'passed':not changes,'publishedHashCount':len(protected),'protected':protected,'formalGlbCount':len(assets),'formalGlbBytes':sum(p.stat().st_size for p in assets)}
(project/'validation/v07a/20260919-145055-d84262/protected-files.json').write_text(json.dumps(result,ensure_ascii=False,indent=2))
print(json.dumps({k:v for k,v in result.items() if k!='protected'},ensure_ascii=False,indent=2))
