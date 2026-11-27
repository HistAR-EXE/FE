from pathlib import Path
import os, subprocess, sys
root=Path(__file__).resolve().parents[1]
out=root.parent/'docs/desktop-shader-2026-11-26'
out.mkdir(exist_ok=True)
env=os.environ.copy();env['NODE_DISABLE_COMPILE_CACHE']='1'
with (out/('warmup-'+sys.argv[1]+'.log')).open('w',encoding='utf-8') as log:
 code=subprocess.run(['C:/Program Files/nodejs/node.exe','--import','tsx','--test','scripts/world-shader-warmup.test.mjs'],cwd=root,env=env,stdout=log,stderr=subprocess.STDOUT).returncode
print((out/('warmup-'+sys.argv[1]+'.log')).read_text(encoding='utf-8'),flush=True)
sys.exit(code)
