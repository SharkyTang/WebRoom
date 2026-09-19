import os,subprocess
from pathlib import Path
root=Path.cwd();run=root/'validation/v07a/20260919-145055-d84262';final=run/'final'
suites=[('production-navigation','tests/visual-fix-browser.mjs',{'ROOM_TEST_PRODUCTION':'1','ROOM_FIX_DEV_EVIDENCE':str(final/'navigation/results.json')}),('production-room','tests/v07a-production-browser.mjs',{'ROOM_V07A_PIANO_EVIDENCE':str(final/'piano/piano-browser.json'),'ROOM_V07A_NAV_EVIDENCE':str(final/'navigation/results.json')})]
for name,script,extra in suites:
 env={**os.environ,'ROOM_TEST_URL':'http://127.0.0.1:3108','ROOM_TEST_OUTPUT':str(run/name),**extra}
 p=subprocess.run(['python3',str(run/'tools/run-check.py'),str(run/(name+'.log')),'node',script],env=env)
 if p.returncode:print('Failed suite, retained:',name,flush=True)
