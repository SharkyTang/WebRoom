from pathlib import Path
import os, json, hashlib, tarfile, subprocess, datetime, uuid, stat, shutil
root=Path('/Users/shaoqitang/Documents/ChatGPT/网页小屋')
run=datetime.datetime.now().strftime('%Y%m%d-%H%M%S')+'-'+uuid.uuid4().hex[:6]
dest=root/'local-backups'/('v07a-start-'+run)
os.umask(0o077);dest.mkdir(mode=0o700)
excluded_dirs={'.git','local-backups','sharkys-room/node_modules','sharkys-room/.next'}
excluded=[]; entries=[]
def sha(p):
 h=hashlib.sha256()
 with p.open('rb') as f:
  for b in iter(lambda:f.read(1024*1024),b''):h.update(b)
 return h.hexdigest()
def visit(p):
 rel=p.relative_to(root).as_posix();s=p.lstat()
 if rel in excluded_dirs or p.name=='__pycache__' or (p.is_file() and (p.suffix=='.pyc' or p.name=='tsconfig.tsbuildinfo')):
  excluded.append({'path':rel,'reason':'Git internal metadata (saved index/status/patches separately)' if rel=='.git' else 'existing backup tree, reinstallable dependencies, or rebuildable cache'})
  return
 e={'path':rel,'mode':stat.S_IMODE(s.st_mode),'type':'symlink' if p.is_symlink() else 'directory' if p.is_dir() else 'file'}
 if e['type']=='symlink':e['target']=os.readlink(p)
 elif e['type']=='file':e.update(size=s.st_size,sha256=sha(p))
 elif e['type']!='directory':raise RuntimeError('Unsupported '+rel)
 entries.append(e)
 if e['type']=='directory':
  for c in sorted(p.iterdir()):visit(c)
for p in sorted(root.iterdir()):visit(p)
for name,args in {'head':['rev-parse','HEAD'],'branch':['branch','--show-current'],'status':['status','--porcelain=v2','--branch','--untracked-files=all'],'index':['ls-files','--stage','-z'],'unstaged.patch':['diff','--binary','--full-index'],'staged.patch':['diff','--cached','--binary','--full-index'],'ignored':['ls-files','--others','--ignored','--exclude-standard','-z']}.items():
 (dest/name).write_bytes(subprocess.check_output(['git',*args],cwd=root))
if (root/'.git/index').exists():(dest/'git-index.binary').write_bytes((root/'.git/index').read_bytes())
manifest={'root':str(root),'runId':run,'gitHistoryBackedUp':False,'exclusions':excluded,'entries':entries}
(dest/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2))
archive=dest/'workspace.tar.gz'
with tarfile.open(archive,'w:gz',compresslevel=3) as t:
 for e in entries:t.add(root/e['path'],arcname=e['path'],recursive=False)
with tarfile.open(archive,'r:gz') as t:
 members=t.getmembers();assert [m.name for m in members]==[e['path'] for e in entries]
 for m,e in zip(members,entries):
  if e['type']=='file':assert hashlib.sha256(t.extractfile(m).read()).hexdigest()==e['sha256'],e['path']
  elif e['type']=='symlink':assert m.issym() and m.linkname==e['target']
 restore=dest/'restore-verified';restore.mkdir()
 for m,e in zip(members,entries):
  p=restore/e['path']
  assert not Path(e['path']).is_absolute() and '..' not in Path(e['path']).parts
  if e['type']=='directory':p.mkdir(parents=True,exist_ok=True)
  elif e['type']=='file':
   p.parent.mkdir(parents=True,exist_ok=True)
   with t.extractfile(m) as src,p.open('xb') as dst:shutil.copyfileobj(src,dst)
   p.chmod(e['mode'])
 # Links are created last and never dereferenced.
 for e in entries:
  if e['type']=='symlink':os.symlink(e['target'],restore/e['path'])
for e in entries:
 p=restore/e['path']
 if e['type']=='file':assert p.stat().st_size==e['size'] and sha(p)==e['sha256'],e['path']
 elif e['type']=='symlink':assert p.is_symlink() and os.readlink(p)==e['target']
for e in entries:
 if e['type']=='file':assert sha(root/e['path'])==e['sha256'],'Source changed during snapshot: '+e['path']
summary={'passed':True,'runId':run,'path':str(dest),'archiveBytes':archive.stat().st_size,'archiveSha256':sha(archive),'manifestSha256':sha(dest/'manifest.json'),'files':sum(e['type']=='file' for e in entries),'entries':len(entries),'fileBytes':sum(e.get('size',0) for e in entries),'archiveReadVerified':True,'freshExtractionVerified':True,'sourceUnchanged':True,'gitHistoryBackedUp':False}
(dest/'verification.json').write_text(json.dumps(summary,indent=2))
(dest/'RESTORE.md').write_text('''# v0.7A 本地完整工作区快照\n\n仅本机保存，目录权限 0700。workspace.tar.gz 保留所有纳入项目文件、点文件、未跟踪及不可重建的忽略文件；manifest.json 记录精确排除项、路径、类型、大小、权限和 SHA256。没有备份 .git 全部历史；HEAD、分支、状态、原索引、暂存/未暂存 binary diff 已另外保存。\n\n## 恢复\n\n1. 先保存当前工作另一个完整快照，禁止 reset/clean。\n2. 用 verification.json 检查归档和 manifest 的 SHA256。\n3. 在新的空目录解压（不覆盖当前工作区），按 manifest.json 检查每个文件大小/SHA256、目录及符号链接目标。restore-verified/ 已实际完成这一验证，可只读参考。\n4. 与当前目录对照，仅按 V07A_FILE_CHANGES.md 移出 A 新增文件；需要恢复时从解包目录按组复制。不要用旧提交覆盖已有用户修改。\n5. 重跑所需校验。安装目录/构建缓存可重建；历史备份保留在原 local-backups 下。\n\n归档内敏感配置不得上传、发布或复制到 public/validation。验证副本也受父目录 0700 保护。\n''')
Path('/private/tmp/v07a-run.json').write_text(json.dumps(summary))
print(json.dumps(summary,ensure_ascii=False,indent=2))
