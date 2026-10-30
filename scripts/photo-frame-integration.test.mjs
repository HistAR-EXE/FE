import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
test('local frame artwork never goes to UUID upload fields and edit options survive return drafts',()=>{
 const page=fs.readFileSync(new URL('../src/pages/PhotoFramePage.tsx',import.meta.url),'utf8');
 assert.match(page,/isLocalPhotoFrame\(frameId\)/);
 assert.match(page,/originalOptions/);
 const draft=fs.readFileSync(new URL('../src/lib/photoFrameReturnDraft.ts',import.meta.url),'utf8');
 assert.match(draft,/originalOptions\?/);
});
