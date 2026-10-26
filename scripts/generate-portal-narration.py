import asyncio,json,hashlib,sys
from pathlib import Path
import edge_tts
ROOT=Path(__file__).resolve().parents[1]
async def main():
 entries=json.loads((ROOT/'test-results/portal-narration-text.json').read_text(encoding='utf-8-sig'))
 target=ROOT/'public/audio/time-portal/narration-v1';target.mkdir(parents=True,exist_ok=True)
 semaphore=asyncio.Semaphore(2)
 async def generate(entry):
  digest=hashlib.sha256(entry['text'].encode()).hexdigest()[:12]
  name=f"{entry['key']}-{digest}.mp3"
  file=target/name
  async with semaphore:
   if not file.exists() or file.stat().st_size<1000:
    for attempt in range(3):
     try:
      await edge_tts.Communicate(entry['text'],'vi-VN-HoaiMyNeural',rate='+0%').save(str(file));break
     except Exception:
      if attempt==2:raise
      await asyncio.sleep(2)
   if file.stat().st_size<1000:raise RuntimeError('Empty speech: '+name)
   print(entry['key'],file.stat().st_size,flush=True)
  return entry['key'],{'text':entry['text'],'src':'/audio/time-portal/narration-v1/'+name}
 result=dict(await asyncio.gather(*(generate(e) for e in entries)))
 output='// Generated from storyData.ts; regenerate with scripts/generate-portal-narration.py.\nexport const PORTAL_NARRATIONS: Record<string, { text: string; src: string }> = '+json.dumps(result,ensure_ascii=False,indent=2)+'\n'
 (ROOT/'src/features/time-portal/timeline/portalNarrationManifest.ts').write_text(output,encoding='utf-8')
 print('Generated manifest:',len(result),flush=True)
asyncio.run(main())
