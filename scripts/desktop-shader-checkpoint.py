"""Serial verification of shader readiness and the PC-only product flow."""
from pathlib import Path
import subprocess, os, sys, json
sys.stdout.reconfigure(encoding='utf-8')
root=Path(__file__).resolve().parents[1]
out=root.parent/'docs/desktop-shader-2026-11-26';out.mkdir(exist_ok=True)
node='C:/Program Files/nodejs/node.exe'
env=os.environ.copy();env.update(NODE_DISABLE_COMPILE_CACHE='1',LW_QA_STATIC_PREVIEW='false',LW_QA_SAME_ORIGIN_API='true',LW_QA_PROFILE_GL='1',PW_TEST_SCREENSHOT_NO_FONTS_READY='1',LW_QA_SERVER_LOG=str(out/'preview.log'))
candidate=out/'candidate-v1'
checks={}
def run(name,args):
 print('RUN '+name,flush=True)
 with (out/(name+'.log')).open('w',encoding='utf-8') as log:
  code=subprocess.run([node,*args],cwd=root,env=env,stdout=log,stderr=subprocess.STDOUT).returncode
 checks[name]=code;(out/'commands.json').write_text(json.dumps(checks,indent=2))
 print(name+': exit '+str(code),flush=True)
 if code:
  print((out/(name+'.log')).read_text(encoding='utf-8')[-5000:],flush=True);sys.exit(code)
if '--fallback-only' in sys.argv:
 checks=json.loads((out/'commands.json').read_text())
 run('fallback-desktop',['scripts/quest-world-shell-probe.browser.mjs',str(out/'fallback-v3'),str(candidate)])
 sys.exit(0)
run('typecheck',['node_modules/typescript/lib/_tsc.js','-b'])
run('lint',['node_modules/eslint/bin/eslint.js','src/features/living-world/warmWorldShaders.ts'])
run('shader-regression',['--import','tsx','--test','scripts/world-shader-warmup.test.mjs'])
run('build',['node_modules/vite/bin/vite.js','build','--outDir',str(candidate)])
run('desktop',['scripts/quest-world.browser.mjs',str(out/'desktop'),str(candidate)])
run('account',['scripts/quest-world-account.browser.mjs',str(out/'account'),str(candidate),str(root.parent/'docs/m2-scene-depth-2026-11-25/q5-primary.json')])
run('fallback',['scripts/quest-world-shell-probe.browser.mjs',str(out/'fallback'),str(candidate)])
