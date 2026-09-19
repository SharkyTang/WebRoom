import os,subprocess,json,datetime
from pathlib import Path
root=Path.cwd();run=root/'validation/v07a/20260919-145055-d84262/final'
run.mkdir(parents=True,exist_ok=True)
suites=[('interactions','tests/interaction-browser.mjs',{}),('navigation','tests/visual-fix-browser.mjs',{}),('piano','tests/piano-discoverability-browser.mjs',{'ROOM_PIANO_CYCLES':'20'}),('gestures','tests/visual-fix-gestures.mjs',{})]
for name,script,extra in suites:
 env={**os.environ,'ROOM_TEST_URL':'http://127.0.0.1:3000','ROOM_TEST_OUTPUT':str(run/name),**extra}
 p=subprocess.run(['python3','/private/tmp/v07a-run-check.py',str(run/(name+'.log')),'node',script],env=env)
 if p.returncode:print('Failed suite, retained:',name,flush=True)
