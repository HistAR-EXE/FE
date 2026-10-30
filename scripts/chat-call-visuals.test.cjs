const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const cache = new Map();
function load(file) {
  file = path.resolve(file);
  if (cache.has(file)) return cache.get(file).exports;
  const module = {exports:{}}; cache.set(file,module);
  const code = ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  vm.runInNewContext(code,{module,exports:module.exports,require:ref=>load(path.resolve(path.dirname(file),ref+'.ts'))},{filename:file});
  return module.exports;
}
const {imagesForReply,callIllustrationForSrc} = load('src/features/chat/callVisuals.ts');
const site = '11111111-1111-1111-1111-111111111111';
const cases = [
 ['Địa đạo Củ Chi nằm ở đâu?','Địa đạo Củ Chi có ba tầng, bếp Hoàng Cầm và phòng họp.'],
 ['TimeLens có bao nhiêu mục bảo tàng?','Bảo tàng có 58 mục và bếp Hoàng Cầm.'],
 ['Bếp Hoàng Cầm hoạt động thế nào?','Chưa có thông tin xác minh về bếp Hoàng Cầm.'],
 ['Bếp Hoàng Cầm và phòng họp khác nhau thế nào?','Bếp Hoàng Cầm nấu ăn; phòng họp dùng hội họp.'],
 ['Bếp Hoàng Cầm năm 1968 thế nào?','Bếp Hoàng Cầm giấu khói.'],
 ['Không cần ảnh bếp Hoàng Cầm','Bếp Hoàng Cầm giấu khói.'],
 ['Miệng hầm ở đâu?','Tôi chưa biết vị trí cụ thể.'],
];
for(const [question,reply] of cases) assert.equal(imagesForReply(reply,{question,locationId:site}).length,0,question);
const question='Bếp Hoàng Cầm hoạt động thế nào?', reply='Bếp Hoàng Cầm giúp phân tán khói.';
assert.equal(imagesForReply(reply).length,0);
assert.equal(imagesForReply(reply,{question,locationId:'other-site'}).length,0);
const images=imagesForReply(reply,{question,locationId:site});
assert.equal(images.length,1);
assert.equal(images[0],'/images/xua-nay/bep-hoang-cam-nay.webp');
assert.ok(callIllustrationForSrc(images[0]).credit.includes('TimeLens'));
assert.equal(callIllustrationForSrc('/artifacts/cu-chi/cc-18.png'),undefined);
assert.equal(callIllustrationForSrc('https://example.com/unverified.jpg'),undefined);
console.log('Passed illustration selection and source checks.');
