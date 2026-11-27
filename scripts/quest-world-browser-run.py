from pathlib import Path
import subprocess,os,sys,shutil
root=Path(__file__).resolve().parents[1]
sys.stdout.reconfigure(encoding='utf-8')
out=root.parent/'docs/quest-world-integration-2026-11-26'
env=os.environ.copy();env.update(NODE_DISABLE_COMPILE_CACHE='1',LW_QA_STATIC_PREVIEW='false',LW_QA_PYTHON=sys.executable,LW_QA_SERVER_LOG=str(out/'vite-preview.log'),PW_TEST_SCREENSHOT_NO_FONTS_READY='1')
source=out/'candidate-v3';candidate=out/'browser-candidate-v4'
if '--profile' in sys.argv:env['LW_QA_PROFILE_GL']='1'
if not candidate.exists():shutil.copytree(source,candidate)
with (out/'browser-run.log').open('w',encoding='utf-8') as f:
 code=subprocess.run(['C:/Program Files/nodejs/node.exe','scripts/quest-world.browser.mjs',str(out/(sys.argv[1] if len(sys.argv)>1 else 'browser-v2')),str(candidate)],cwd=root,env=env,stdout=f,stderr=subprocess.STDOUT).returncode
print((out/'browser-run.log').read_text(encoding='utf-8')[-5000:],flush=True);sys.exit(code)
