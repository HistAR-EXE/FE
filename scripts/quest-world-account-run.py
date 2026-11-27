from pathlib import Path
import os,subprocess,sys
sys.stdout.reconfigure(encoding='utf-8')
root=Path(__file__).resolve().parents[1];out=root.parent/'docs/quest-world-integration-2026-11-26'
env=os.environ.copy();env.update(NODE_DISABLE_COMPILE_CACHE='1',LW_QA_STATIC_PREVIEW='false',LW_QA_SAME_ORIGIN_API='true',LW_QA_PYTHON=sys.executable,LW_QA_SERVER_LOG=str(out/'account-vite-preview.log'),PW_TEST_SCREENSHOT_NO_FONTS_READY='1')
with (out/'account-run.log').open('w',encoding='utf-8') as f:
 code=subprocess.run(['C:/Program Files/nodejs/node.exe','scripts/quest-world-account.browser.mjs',str(out/'account-v2'),str(out/'browser-candidate-v4'),str(root.parent/'docs/m2-scene-depth-2026-11-25/q5-primary.json')],cwd=root,env=env,stdout=f,stderr=subprocess.STDOUT).returncode
print((out/'account-run.log').read_text(encoding='utf-8')[-4000:],flush=True);sys.exit(code)
