import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import vm from 'node:vm'
import ts from 'typescript'

let media
try { media = await import('../src/features/living-world/worldModelMedia.ts') } catch (error) {
  if (error.code !== 'ERR_MODULE_NOT_FOUND') throw error
}

test('viewer state is pure and camera commands are distinct from representation changes', () => {
  assert.ok(media, 'worldModelMedia must exist')
  const original = Object.freeze(media.initialModelView())
  assert.deepEqual(original, { layer: 'ALL', diagram: false, yaw: 0, zoom: 1, command: 0 })
  const layer = media.updateModelView(original, { type: 'LAYER', layer: 'L2' })
  assert.equal(layer.layer, 'L2')
  assert.equal(layer.command, 0)
  const diagram = media.updateModelView(layer, { type: 'DIAGRAM' })
  assert.equal(diagram.diagram, true)
  assert.equal(diagram.command, 0)
  const rotated = media.updateModelView(diagram, { type: 'ROTATE', direction: 1 })
  assert.ok(Math.abs(rotated.yaw - Math.PI / 12) < 1e-10)
  assert.equal(rotated.command, 1)
  assert.deepEqual(media.updateModelView(rotated, { type: 'RESET' }), { ...original, command: 2 })
  assert.deepEqual(original, media.initialModelView())
})

test('yaw wraps, zoom clamps, invalid actions and numbers cannot corrupt the view', () => {
  assert.ok(media, 'worldModelMedia must exist')
  let view = media.initialModelView()
  for (let i = 0; i < 100; i++) {
    view = media.updateModelView(view, { type: 'ROTATE', direction: -1 })
    assert.ok(view.yaw >= -Math.PI && view.yaw <= Math.PI)
  }
  for (let i = 0; i < 100; i++) view = media.updateModelView(view, { type: 'ZOOM', direction: 1 })
  assert.equal(view.zoom, 1.5)
  for (let i = 0; i < 100; i++) view = media.updateModelView(view, { type: 'ZOOM', direction: -1 })
  assert.equal(view.zoom, .75)
  for (const action of [null, {}, { type: 'OTHER' }, { type: 'LAYER', layer: 'L4' }, ...[NaN, Infinity, 0, 2].flatMap(direction => [{ type: 'ZOOM', direction }, { type: 'ROTATE', direction }])]) {
    assert.equal(media.updateModelView(view, action), view)
  }
})

test('catalog only offers authored model and schematic with explicit teaching limits', () => {
  assert.ok(media, 'worldModelMedia must exist')
  assert.equal(media.modelMedia.length, 1)
  const item = media.modelMedia[0]
  assert.equal(item.id, 'L2D_STRUCTURE')
  assert.equal(item.title, 'Sa bàn các lớp địa đạo')
  assert.equal(item.representations.model3D.available, true)
  assert.equal(item.representations.schematic2D.available, true)
  assert.equal(Object.keys(item.representations).length, 2)
  assert.match(item.limitations, /khảo cổ/)
  assert.match(item.limitations, /độ sâu/)
  assert.doesNotMatch(JSON.stringify(item), /https?:|timestamp|license|verified|video|360/i)
  for (const layer of ['ALL', 'SURFACE', 'L1', 'L2', 'L3']) assert.ok(media.layerCaptions[layer].description)
})

function panelHost(props) {
  const file = new URL('../src/features/living-world/ModelViewerPanel.tsx', import.meta.url)
  assert.ok(existsSync(file), 'ModelViewerPanel must exist')
  const refs = [], effects = []
  const hooks = { useRef: () => { const ref = { current: null }; refs.push(ref); return ref }, useEffect: fn => effects.push(fn) }
  const nativeRequire = createRequire(import.meta.url)
  const module = { exports: {} }
  const context = {
    module, exports: module.exports,
    document: { activeElement: null },
    require: name => name === 'react' ? hooks : name === './worldModelMedia' ? media : nativeRequire(name),
  }
  const output = ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText
  vm.runInNewContext(output, context)
  const tree = module.exports.ModelViewerPanel(props)
  const nodes = []
  function walk(node) {
    if (!node || typeof node !== 'object') return
    nodes.push(node)
    for (const child of [node.props?.children].flat(Infinity)) walk(child)
  }
  walk(tree)
  return { tree, nodes, refs, effects, document: context.document }
}

test('panel exposes dialog, equivalent diagram captions and controls with bounds', () => {
  assert.ok(media, 'worldModelMedia must exist')
  const updates = [], close = [], exploded = []
  const props = { view: { ...media.initialModelView(), diagram: true, zoom: 1.5 }, exploded: false, onView: v => updates.push(v), onClose: () => close.push(true), onExploded: v => exploded.push(v) }
  const { tree, nodes } = panelHost(props)
  assert.equal(tree.props.role, 'dialog')
  assert.equal(tree.props['aria-modal'], true)
  assert.equal(tree.props['aria-label'], 'Quan sát sa bàn')
  const buttons = nodes.filter(n => n.type === 'button')
  const button = label => buttons.find(n => n.props.children === label)
  for (const label of ['Toàn bộ', 'Mặt đất', 'Lớp 1', 'Lớp 2', 'Lớp 3', 'Xoay trái', 'Xoay phải', 'Góc nhìn ban đầu', 'Trở lại vị trí đang đứng']) assert.ok(button(label), label)
  assert.equal(button('Phóng to').props.disabled, true)
  assert.equal(button('Thu nhỏ').props.disabled, false)
  button('Lớp 2').props.onClick()
  assert.equal(updates.at(-1).layer, 'L2')
  button('Tách các lớp').props.onClick()
  assert.deepEqual(exploded, [true])
  button('Xem mô hình 3D').props.onClick()
  assert.equal(updates.at(-1).diagram, false)
  button('Trở lại vị trí đang đứng').props.onClick()
  assert.equal(close.length, 1)
  assert.ok(nodes.find(n => n.type === 'figure' && n.props['aria-label'] === 'Sơ đồ các lớp'))
  assert.ok(nodes.find(n => n.type === 'summary' && n.props.children === 'Nguồn và giới hạn'))
  for (const layer of ['ALL', 'SURFACE', 'L1', 'L2', 'L3']) {
    const host = panelHost({ ...props, view: { ...props.view, layer } })
    assert.ok(host.nodes.some(n => n.props?.children === media.layerCaptions[layer].description))
  }
})

test('panel focuses exit on mount, traps Tab and closes with Escape without bubbling', () => {
  assert.ok(media, 'worldModelMedia must exist')
  let closed = 0, stopped = 0, prevented = 0, focused = ''
  const host = panelHost({ view: media.initialModelView(), exploded: false, onView() {}, onExploded() {}, onClose: () => closed++ })
  const first = { focus: () => { focused = 'first' } }, last = { focus: () => { focused = 'last' } }
  const dialog = { contains: node => node === first || node === last, querySelectorAll: () => [first, last] }
  for (const node of host.nodes) {
    if (node.props?.ref) node.props.ref.current = node.props.role === 'dialog' ? dialog : last
  }
  host.effects.forEach(fn => fn())
  assert.equal(focused, 'last')
  const event = { key: 'Tab', shiftKey: false, preventDefault: () => prevented++, stopPropagation: () => stopped++ }
  host.document.activeElement = last
  host.tree.props.onKeyDown(event)
  assert.equal(focused, 'first')
  host.document.activeElement = first
  host.tree.props.onKeyDown({ ...event, shiftKey: true })
  assert.equal(focused, 'last')
  host.tree.props.onKeyDown({ ...event, key: 'Escape' })
  assert.equal(closed, 1)
  assert.ok(stopped >= 1)
  assert.ok(prevented >= 2)
})
