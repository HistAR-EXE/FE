"""Serial, scoped verification; child environment avoids the Windows Node compile-cache stall."""
from pathlib import Path
import subprocess,os,sys,json
root=Path(__file__).resolve().parents[1]
out=root.parent/'docs/quest-world-integration-2026-11-26'
env=os.environ.copy();env['NODE_DISABLE_COMPILE_CACHE']='1'
node=Path('C:/Program Files/nodejs/node.exe')
focus='--focus' in sys.argv
polish='--polish' in sys.argv or focus
checks=json.loads((out/'command-results.json').read_text(encoding='utf-8')) if '--resume' in sys.argv or '--queue-only' in sys.argv or polish else {}
def run(name,args):
 print('RUN '+name,flush=True)
 with (out/(name+'.log')).open('w',encoding='utf-8') as f:
  code=subprocess.run([str(node),*args],cwd=root,env=env,stdout=f,stderr=subprocess.STDOUT).returncode
 checks[name]=code;(out/'command-results.json').write_text(json.dumps(checks,indent=2),encoding='utf-8')
 print(name+': exit '+str(code),flush=True)
 if code:
  print((out/(name+'.log')).read_text(encoding='utf-8')[-4000:],flush=True);sys.exit(code)
if '--queue-only' in sys.argv:
 run('queue-regression',['--import','tsx','--test','scripts/living-world-queue.test.mjs'])
 sys.exit(0)
if '--resume' not in sys.argv:
 run('typecheck-focus' if focus else 'typecheck-polish' if polish else 'typecheck',['node_modules/typescript/lib/_tsc.js','-b'])
 run('lint-focus' if focus else 'lint-polish' if polish else 'lint',['node_modules/eslint/bin/eslint.js','src/pages/QuestWorldPage.tsx','src/routes/AppRoutes.tsx','src/components/layout/SideNav.tsx','src/components/layout/TimeLensMark.tsx','src/components/ui/MaterialIcon.tsx','src/features/living-world/WorldStoryPanel.tsx','src/features/living-world/WorldStoryArt.tsx','src/features/living-world/worldNarrative.ts','src/features/living-world/KhaConversation.tsx','src/features/living-world/LivingWorldPage.tsx'])
tests=['world-narrative','m2-guidance','m2-world-expansion','m2-persistence','m2-epilogue-queue','m2-scene-presentation','m2-workbench','rig-motion','npc-conversation','core-proofs','world-continuity','memorial-experience','living-world-queue']
assert all((root/'scripts'/(name+'.test.mjs')).is_file() for name in tests),'A selected regression script is missing'
tests=[str(Path('scripts')/(name+'.test.mjs')) for name in tests]
if not polish:
 run('regression',['--import','tsx','--test','--test-concurrency=1',*tests])
 for name in ['sync-ar-catalog','verify-public-media','verify-film-assets','stage-public-r2']:
  run(name,['scripts/'+name+'.mjs'])
run('build-focus' if focus else 'build-polish' if polish else 'build',['node_modules/vite/bin/vite.js','build','--outDir',str(out/('candidate-v3' if focus else 'candidate-v2' if polish else 'candidate-v1'))])
