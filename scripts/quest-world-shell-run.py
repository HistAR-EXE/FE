from pathlib import Path
import subprocess,os,sys
sys.stdout.reconfigure(encoding='utf-8')
root=Path(__file__).resolve().parents[1];out=root.parent/'docs/quest-world-integration-2026-11-26'
env=os.environ.copy();env.update(NODE_DISABLE_COMPILE_CACHE='1',LW_QA_STATIC_PREVIEW='true',LW_QA_PYTHON=sys.executable,PW_TEST_SCREENSHOT_NO_FONTS_READY='1')
with (out/'shell-run.log').open('w',encoding='utf-8') as f:
 code=subprocess.run(['C:/Program Files/nodejs/node.exe','scripts/quest-world-shell-probe.browser.mjs',str(out/(sys.argv[1] if len(sys.argv)>1 else 'shell-probe')),str(out/(sys.argv[2] if len(sys.argv)>2 else 'browser-candidate-v2'))],cwd=root,env=env,stdout=f,stderr=subprocess.STDOUT).returncode
print((out/'shell-run.log').read_text(encoding='utf-8')[-2500:],flush=True);sys.exit(code)
