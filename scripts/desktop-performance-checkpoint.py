"""PC-only shadow startup verification; preserve prior checkpoints unchanged."""
from pathlib import Path
import os,sys,json,subprocess
sys.stdout.reconfigure(encoding='utf-8')
root=Path(__file__).resolve().parents[1]
phases=[('--stable','startup-final'),('--linear','linear'),('--transmission','transmission'),('--responsive','responsive'),('--production-diagnostics','runtime'),('--diagnostics-red','runtime')]
phase=next((name for flag,name in phases if flag in sys.argv),'performance')
out=root.parent/'docs'/('desktop-'+phase+'-2026-11-26');out.mkdir(exist_ok=True)
env=os.environ.copy();env.update(NODE_DISABLE_COMPILE_CACHE='1',LW_QA_STATIC_PREVIEW='false',LW_QA_SAME_ORIGIN_API='true',LW_QA_PROFILE_GL='1',PW_TEST_SCREENSHOT_NO_FONTS_READY='1',LW_QA_SERVER_LOG=str(out/'preview.log'))
node='C:/Program Files/nodejs/node.exe';candidate=out/'candidate-v1';checks={}
if '--transmission' in sys.argv or '--linear' in sys.argv or '--stable' in sys.argv:env['LW_QA_TRACE_PROGRAMS']='1'
def run(name,args):
 print('RUN '+name,flush=True)
 with (out/(name+'.log')).open('w',encoding='utf-8') as log:code=subprocess.run([node,*args],cwd=root,env=env,stdout=log,stderr=subprocess.STDOUT).returncode
 checks[name]=code;(out/('trace-commands.json' if '--program-trace' in sys.argv else 'red-commands.json' if '--red' in sys.argv or '--diagnostics-red' in sys.argv else 'commands.json')).write_text(json.dumps(checks,indent=2))
 print(name+': exit '+str(code),flush=True)
 if code:print((out/(name+'.log')).read_text(encoding='utf-8')[-4000:],flush=True);sys.exit(code)
if '--program-trace' in sys.argv:
 env['LW_QA_TRACE_PROGRAMS']='1'
 run('program-trace',['scripts/quest-world.browser.mjs',str(out/'program-trace'),str(root.parent/'docs/desktop-responsive-2026-11-26/candidate-v1')]);sys.exit(0)
if '--diagnostics-red' in sys.argv:
 run('red-diagnostics',['scripts/quest-world.browser.mjs',str(out/'red-diagnostics'),str(root.parent/'docs/desktop-performance-2026-11-26/candidate-v1')]);sys.exit(0)
if '--red' in sys.argv:
 run('red-shadow',['scripts/quest-world.browser.mjs',str(out/'red-shadow'),str(root.parent/'docs/desktop-shader-2026-11-26/candidate-v1')]);sys.exit(0)
run('typecheck',['node_modules/typescript/lib/_tsc.js','-b'])
run('lint',['node_modules/eslint/bin/eslint.js','src/features/living-world/WorldScene.tsx','src/features/living-world/warmWorldShaders.ts'])
run('shader-regression',['--import','tsx','--test','scripts/world-shader-warmup.test.mjs'])
run('build',['node_modules/vite/bin/vite.js','build','--outDir',str(candidate)])
run('desktop',['scripts/quest-world.browser.mjs',str(out/'desktop'),str(candidate)])
run('account',['scripts/quest-world-account.browser.mjs',str(out/'account'),str(candidate),str(root.parent/'docs/m2-scene-depth-2026-11-25/q5-primary.json')])
run('fallback',['scripts/quest-world-shell-probe.browser.mjs',str(out/'fallback'),str(candidate)])
