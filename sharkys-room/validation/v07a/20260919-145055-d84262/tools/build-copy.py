from pathlib import Path
import shutil,hashlib,json,tempfile
root=Path('/Users/shaoqitang/Documents/ChatGPT/网页小屋/sharkys-room')
dest=Path(tempfile.mkdtemp(prefix='sharkys-v07a-build-',dir='/private/tmp'))
include=['app','components','lib','types','public','content','tests','scripts','docs','package.json','package-lock.json','tsconfig.json','next-env.d.ts','next.config.ts','AGENTS.md']
entries=[]
for name in include:
 src=root/name
 if src.is_dir():shutil.copytree(src,dest/name)
 else:shutil.copy2(src,dest/name)
 for p in ([src] if src.is_file() else sorted(src.rglob('*'))):
  if p.is_file():entries.append({'path':str(p.relative_to(root)),'size':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()})
shutil.copytree(root/'node_modules',dest/'node_modules',symlinks=True)
result={'source':str(root),'buildDirectory':str(dest),'inputs':entries,'dependencies':'Full local node_modules copy; no install/lockfile change','excluded':'Historical validation, model editing sources, old reports, caches; all runtime public assets included'}
(root/'validation/v07a/20260919-145055-d84262/build-inputs.json').write_text(json.dumps(result,ensure_ascii=False,indent=2))
Path('/private/tmp/v07a-build-dir').write_text(str(dest))
print(str(dest))
