import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import ts from 'typescript'
import { decode } from '@msgpack/msgpack'
import sharp from 'sharp'
import { createHash } from 'node:crypto'

const source = fs.readFileSync(new URL('../src/features/ar/arExperience.ts', import.meta.url), 'utf8')
const catalog = JSON.parse(fs.readFileSync(new URL('../src/features/ar/ar-catalog.json', import.meta.url), 'utf8'))
const testSource = source.replace(/import catalog from ["']\.\/ar-catalog\.json["'];/, `const catalog = ${JSON.stringify(catalog)};`)
const { outputText } = ts.transpileModule(testSource, { compilerOptions: { module: ts.ModuleKind.ESNext } })
const { readArtifact, phoneExperiencePath, isArFrameMessage } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`)

test('official collection contains exactly ten unique real assets', () => {
  const catalog = JSON.parse(fs.readFileSync(new URL('../public/ar-catalog.json', import.meta.url), 'utf8'))
  assert.equal(catalog.filter(item => item.status === 'published').length, 10)
  assert.equal(catalog.length, 10)
  assert.ok(catalog.every(item => item.status === 'published'))
  assert.ok(catalog.every(item => !['backpack', 'radio', 'cookset'].includes(item.id)))
  assert.equal(new Set(catalog.map(item => item.id)).size, catalog.length)
  assert.equal(new Set(catalog.map(item => item.model)).size, catalog.length)
  for (const item of catalog) {
    assert.match(item.source, /^https:\/\/sketchfab.com\/3d-models\//)
    assert.ok(item.author && item.license && item.note)
    assert.ok(Number.isInteger(item.targetIndex) && item.targetIndex >= 0 && item.targetIndex < 10)
    const bytes = fs.readFileSync(new URL(`../public${item.model}`, import.meta.url))
    assert.equal(bytes.toString('ascii', 0, 4), 'glTF', item.id)
    assert.equal(bytes.readUInt32LE(4), 2)
    assert.equal(bytes.readUInt32LE(8), bytes.length)
    const json = JSON.parse(bytes.toString('utf8', 20, 20 + bytes.readUInt32LE(12)))
    assert.ok(json.meshes.length > 0, item.id)
    assert.ok(!json.extensionsRequired?.includes('KHR_draco_mesh_compression'), item.id)
    for (const buffer of json.buffers) assert.ok(!buffer.uri, `${item.id}: self-contained buffer`)
    for (const image of json.images ?? []) assert.ok(Number.isInteger(image.bufferView), `${item.id}: embedded texture`)
    for (const view of json.bufferViews ?? []) assert.ok((view.byteOffset ?? 0) + view.byteLength <= json.buffers[view.buffer].byteLength)
  }
})

test('unknown artifact falls back to hat; phone handoff shares only selected artifact', () => {
  assert.equal(readArtifact('unknown').id, 'hat')
  for (const id of ['backpack', 'radio', 'cookset']) {
    assert.equal(readArtifact(id).id, 'hat')
    assert.equal(readArtifact(id, true).id, 'hat')
    assert.equal(phoneExperiencePath(id), '/ar-experience?artifact=hat&view=camera')
  }
  assert.equal(readArtifact('lamp').id, 'lamp')
  assert.equal(phoneExperiencePath('lamp'), '/ar-experience?artifact=lamp&view=camera')
})

test('AR messages require the exact origin, current frame and selected artifact', () => {
  const source = {}, other = {}, origin = 'https://timelens.asia'
  const event = { origin, source, data: { type: 'AR_TARGET_FOUND', artifact: 'hat' } }
  assert.equal(isArFrameMessage(event, source, origin, 'hat'), true)
  assert.equal(isArFrameMessage({ ...event, origin: 'https://other.test' }, source, origin, 'hat'), false)
  assert.equal(isArFrameMessage({ ...event, source: other }, source, origin, 'hat'), false)
  assert.equal(isArFrameMessage(event, source, origin, 'lamp'), false)
  assert.equal(isArFrameMessage({ ...event, data: null }, source, origin, 'hat'), false)
  assert.equal(isArFrameMessage({ ...event, data: { type: 'CHECKIN_SUCCESS', artifact: 'hat' } }, source, origin, 'hat'), false)
})

test('flashlight and first aid are official and hand off without a review flag', () => {
  for (const id of ['flashlight', 'firstaid']) {
    assert.equal(readArtifact(id).id, id)
    assert.equal(readArtifact(id).status, 'published')
    assert.equal(phoneExperiencePath(id), '/ar-experience?artifact=' + id + '&view=camera')
  }
})

test('standalone public catalog exactly matches the canonical source catalog', () => {
  assert.equal(
    fs.readFileSync(new URL('../public/ar-catalog.json', import.meta.url), 'utf8'),
    fs.readFileSync(new URL('../src/features/ar/ar-catalog.json', import.meta.url), 'utf8'),
  )
})


test('ten original color field photos map one-to-one to compiled targets', async () => {
  assert.equal(new Set(catalog.map(item => item.target)).size, 10)
  assert.equal(new Set(catalog.map(item => item.targetIndex)).size, 10)
  const bundle = decode(fs.readFileSync(new URL('../public/assets/cu-chi-targets.mind', import.meta.url)))
  assert.equal(bundle.dataList.length, 10)
  for (const item of catalog) {
    const image = fs.readFileSync(new URL('../public' + item.target, import.meta.url))
    const metadata = await sharp(image).metadata()
    assert.equal(metadata.channels, 3)
    const { data } = await sharp(image).resize(64, 64).raw().toBuffer({ resolveWithObject: true })
    let colorful = 0
    for (let i = 0; i < data.length; i += 3) if (Math.max(data[i], data[i+1], data[i+2]) - Math.min(data[i], data[i+1], data[i+2]) > 15) colorful++
    assert.ok(colorful > 100, item.id + ': keeps color')
    const original = fs.readFileSync(new URL('../public' + item.targetOriginal, import.meta.url))
    assert.equal(createHash('sha256').update(original).digest('hex'), item.targetOriginalSha256)
    const compiled = bundle.dataList[item.targetIndex]
    assert.ok(compiled.matchingData.length > 0 && compiled.trackingData.length > 0)
    assert.ok(Math.abs(compiled.targetImage.width / compiled.targetImage.height - metadata.width / metadata.height) < 0.01)
  }
})

test('AR email login returns to the selected public experience and rejects external redirects', async () => {
  const authSource=fs.readFileSync(new URL('../src/shared/auth/types.ts',import.meta.url),'utf8')
  const {outputText}=ts.transpileModule(authSource,{compilerOptions:{module:ts.ModuleKind.ESNext}})
  const {isSafeRedirect}=await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`)
  assert.equal(isSafeRedirect('/ar-experience?artifact=lamp&view=home'),true)
  for(const value of ['https://outside.test/ar-experience','//outside.test/ar-experience','/ar-experience-evil?next=1'])assert.equal(isSafeRedirect(value),false)
})
