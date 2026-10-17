// Check UI/server reward and option-count drift without exposing the answer key.
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const source = ts.createSourceFile('ExplorePage.tsx', fs.readFileSync(path.join(root, 'src/pages/ExplorePage.tsx'), 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const backend = fs.readFileSync(path.join(root, '../BE/src/main/java/com/histar/be/discovery/explore/ExploreChallengeCatalog.java'), 'utf8');
const server = new Map([...backend.matchAll(/Map\.entry\("([^"]+)", new Challenge\(\d+, (\d+), (\d+)\)\)/g)].map(m => [m[1], { options: Number(m[2]), xp: Number(m[3]) }]));
const seen = new Set();
const property = (node, key) => node.properties.find(p => p.name?.getText(source) === key)?.initializer;
function visit(node) {
  if (ts.isVariableDeclaration(node) && ['DEPTH_LAYERS', 'SECRET_CIPHERS', 'STORY_DOSSIERS'].includes(node.name.getText(source))) {
    for (const item of node.initializer.elements) {
      const key = (property(item, 'quizKey') || property(item, 'discoveryKey')).text;
      const quiz = property(item, 'quickQuiz') || property(item, 'quiz') || item;
      assert.ok(server.has(key), `Missing server challenge: ${key}`);
      assert.equal(property(quiz, 'options').elements.length, server.get(key).options, `Option count mismatch: ${key}`);
      assert.equal(Number((property(item, 'xp') || property(item, 'xpReward')).text), server.get(key).xp, `XP mismatch: ${key}`);
      assert.ok(!property(quiz, 'correctOption') && !property(quiz, 'correctAnswer'), `Client answer key: ${key}`);
      assert.ok(!seen.has(key), `Duplicate UI challenge: ${key}`);
      seen.add(key);
    }
  }
  ts.forEachChild(node, visit);
}
visit(source);
assert.equal(seen.size, server.size, 'Server/UI challenge count mismatch');
console.log(`PASS: ${seen.size} UI/server challenges match in keys, XP and option counts; no client answer key.`);
