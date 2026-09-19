import subprocess,sys,json,datetime
from pathlib import Path
log=Path(sys.argv[1]);log.parent.mkdir(parents=True,exist_ok=True)
started=datetime.datetime.now().astimezone().isoformat()
with log.open('x') as out:
 p=subprocess.run(sys.argv[2:],stdout=out,stderr=subprocess.STDOUT)
result={'command':sys.argv[2:],'cwd':str(Path.cwd()),'start':started,'end':datetime.datetime.now().astimezone().isoformat(),'exitCode':p.returncode,'log':str(log)}
log.with_suffix(log.suffix+'.json').write_text(json.dumps(result,indent=2))
print(json.dumps(result));sys.exit(p.returncode)
