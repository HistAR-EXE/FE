import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import ts from 'typescript'
import vm from 'node:vm'

let atmosphere
try { atmosphere = await import('../src/features/living-world/worldAtmosphere.ts') } catch (error) {
  if (error.code !== 'ERR_MODULE_NOT_FOUND') throw error
}

test('atmosphere exposes a pure initial state and exact staged boundaries', () => {
  assert.ok(atmosphere, 'worldAtmosphere module must exist')
  const { initialAtmosphere, advanceAtmosphere } = atmosphere
  let state = initialAtmosphere()
  assert.deepEqual(state, { phase: 'CALM', elapsed: 0 })
  for (const [phase, duration, next] of [['CALM', 24, 'NOTICE'], ['NOTICE', 6, 'ALERT'], ['ALERT', 8, 'RECOVERY'], ['RECOVERY', 8, 'SETTLED']]) {
    assert.equal(state.phase, phase)
    for (let i = 0; i < duration - 1; i++) state = advanceAtmosphere(state, 1)
    assert.deepEqual(state, { phase, elapsed: duration - 1 })
    state = advanceAtmosphere(state, .75)
    assert.deepEqual(state, { phase, elapsed: duration - .25 })
    state = advanceAtmosphere(state, .25)
    assert.deepEqual(state, { phase: next, elapsed: 0 })
  }
  assert.deepEqual(initialAtmosphere(), { phase: 'CALM', elapsed: 0 })
})

test('invalid time and paused updates preserve state while long deltas cap at one second', () => {
  assert.ok(atmosphere, 'worldAtmosphere module must exist')
  const { initialAtmosphere, advanceAtmosphere } = atmosphere
  const state = initialAtmosphere()
  for (const dt of [0, -1, NaN, Infinity, -Infinity]) assert.equal(advanceAtmosphere(state, dt), state)
  assert.equal(advanceAtmosphere(state, 1, true), state)
  assert.deepEqual(advanceAtmosphere(state, 99), { phase: 'CALM', elapsed: 1 })
  assert.deepEqual(advanceAtmosphere({ phase: 'CALM', elapsed: 23.5 }, 1), { phase: 'NOTICE', elapsed: .5 })
  assert.deepEqual(state, { phase: 'CALM', elapsed: 0 })
})

test('skip and natural completion remain settled through repeated updates', () => {
  assert.ok(atmosphere, 'worldAtmosphere module must exist')
  const { initialAtmosphere, advanceAtmosphere, skipAtmosphere } = atmosphere
  for (const phase of ['CALM', 'NOTICE', 'ALERT', 'RECOVERY', 'SETTLED']) {
    const settled = skipAtmosphere({ phase, elapsed: 2 })
    assert.deepEqual(settled, { phase: 'SETTLED', elapsed: 0 })
    for (let i = 0; i < 100; i++) assert.equal(advanceAtmosphere(settled, 1), settled)
  }
  assert.deepEqual(initialAtmosphere(), { phase: 'CALM', elapsed: 0 })
})

test('only S1 and L1-C are eligible for atmosphere', () => {
  assert.ok(atmosphere, 'worldAtmosphere module must exist')
  for (const zone of ['S1', 'L1-C']) assert.equal(atmosphere.atmosphereEligible(zone), true)
  for (const zone of ['', 'S0', 'S2', 'L1-A', 'L1-B', 'L1-D', 'L2-C', 's1', ' S1']) assert.equal(atmosphere.atmosphereEligible(zone), false)
})

// A deterministic hook host: execute real hook effects and interval callbacks without a browser/GPU.
function hookHost({ reduced = false, blocked = false } = {}) {
  const path = new URL('../src/features/living-world/useWorldAtmosphere.ts', import.meta.url)
  assert.ok(existsSync(path), 'useWorldAtmosphere module must exist')
  const slots = [], effects = [], timers = new Map(), local = new Map(), session = new Map(), listeners = new Map()
  let cursor = 0, now = 0, serial = 0, dirty = false, renders = 0, result, props
  const storage = map => ({ getItem: key => { if (blocked) throw Error('blocked'); return map.get(key) ?? null }, setItem: (key, value) => { if (blocked) throw Error('blocked'); map.set(key, value) } })
  const hooks = {
    useRef: value => { const at = cursor++; return slots[at] ??= { current: value } },
    useState: initial => {
      const at = cursor++
      slots[at] ??= { value: typeof initial === 'function' ? initial() : initial }
      return [slots[at].value, next => { const value = typeof next === 'function' ? next(slots[at].value) : next; if (!Object.is(value, slots[at].value)) { slots[at].value = value; dirty = true } }]
    },
    useCallback: fn => { cursor++; return fn },
    useEffect: (fn, deps) => {
      const at = cursor++, old = slots[at]
      if (!old || deps.some((dep, i) => !Object.is(dep, old.deps[i]))) effects.push(() => { old?.cleanup?.(); slots[at] = { deps, cleanup: fn() } })
    },
  }
  hooks.useLayoutEffect = hooks.useEffect
  const document = { hidden: false, addEventListener: (key, cb) => listeners.set(key, cb), removeEventListener: key => listeners.delete(key) }
  const context = {
    module: { exports: {} }, exports: {}, performance: { now: () => now }, document,
    localStorage: storage(local), sessionStorage: storage(session),
    setInterval: fn => { const id = ++serial; timers.set(id, fn); return id }, clearInterval: id => timers.delete(id),
    matchMedia: () => ({ matches: reduced }),
    require: name => name === 'react' ? hooks : atmosphere,
  }
  context.window = context
  context.exports = context.module.exports
  vm.runInNewContext(ts.transpileModule(readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, context)
  function render(next = props) {
    props = next
    let turns = 0
    do {
      assert.ok(++turns < 20, 'hook render must stabilize')
      dirty = false; cursor = 0; renders++
      result = context.module.exports.useWorldAtmosphere(props)
      for (const effect of effects.splice(0)) effect()
    } while (dirty)
    return result
  }
  return {
    render, get result() { return result }, get renders() { return renders }, session, local,
    tick(seconds = .25) { now += seconds * 1000; for (const cb of [...timers.values()]) cb(); if (dirty) render() },
    elapse(seconds) { now += seconds * 1000 },
    advance(seconds) { for (let i = 0; i < seconds * 4; i++) this.tick() },
    visibility(hidden) { document.hidden = hidden; listeners.get('visibilitychange')?.() },
    callbacks() { return [...timers.values()] },
  }
}

const visit = { owner: 'owner-a', zone: 'S1', paused: false }

test('hook ticks only publish phase changes, pauses active time and discards hidden time', () => {
  const host = hookHost()
  assert.equal(host.render(visit).phase, 'CALM')
  const renders = host.renders
  host.advance(23)
  assert.equal(host.renders, renders)
  host.advance(1)
  assert.equal(host.result.phase, 'NOTICE')
  host.advance(2)
  host.render({ ...visit, paused: true })
  assert.equal(host.result.phase, 'CALM')
  host.advance(50)
  host.render(visit)
  host.advance(3)
  assert.equal(host.result.phase, 'NOTICE')
  host.visibility(true); host.tick(100); host.visibility(false)
  host.advance(1)
  assert.equal(host.result.phase, 'ALERT')
})

test('hook disable settles a visit, enable requires replay, and replay warns for six full seconds', () => {
  const host = hookHost()
  host.render(visit)
  host.result.setEnabled(false); host.render()
  assert.equal(host.result.enabled, false)
  host.result.setEnabled(true); host.render()
  assert.equal(host.result.phase, 'SETTLED')
  host.advance(50)
  assert.equal(host.result.phase, 'SETTLED')
  host.result.replay(); host.render()
  assert.equal(host.result.phase, 'NOTICE')
  host.advance(5.75)
  assert.equal(host.result.phase, 'NOTICE')
  host.advance(.25)
  assert.equal(host.result.phase, 'ALERT')
  host.result.skip(); host.render()
  host.advance(50)
  assert.equal(host.result.phase, 'SETTLED')
})

test('visit markers isolate owner and zone, calm may restart, and stale callbacks cannot advance another visit', () => {
  const host = hookHost()
  host.render(visit); host.advance(24)
  const stale = host.callbacks()
  host.render({ ...visit, owner: 'owner-b' })
  for (const callback of stale) callback()
  host.advance(23)
  assert.equal(host.result.phase, 'CALM')
  host.render(visit)
  assert.equal(host.result.phase, 'SETTLED')
  host.render({ ...visit, zone: 'L1-C' })
  assert.equal(host.result.phase, 'CALM')
  host.advance(10)
  host.render({ ...visit, zone: 'S0' })
  assert.equal(host.result.phase, 'CALM')
  host.result.replay(); host.render()
  assert.equal(host.result.phase, 'CALM')
  host.render({ ...visit, zone: 'L1-C' }); host.advance(23)
  assert.equal(host.result.phase, 'CALM')
  host.advance(1)
  assert.equal(host.result.phase, 'NOTICE')
})

test('reduced motion defaults off and storage denial preserves same-session visit markers', () => {
  const reduced = hookHost({ reduced: true })
  assert.equal(reduced.render(visit).enabled, false)
  assert.equal(reduced.result.phase, 'CALM')
  const host = hookHost({ blocked: true })
  host.render(visit); host.advance(24)
  host.render({ ...visit, zone: 'S0' }); host.render(visit)
  assert.equal(host.result.phase, 'SETTLED')
})

test('replay between timer ticks starts its warning clock at the user action', () => {
  const host = hookHost()
  host.render(visit)
  host.elapse(.125)
  host.result.replay(); host.render()
  host.advance(5.75)
  host.tick(.125)
  assert.equal(host.result.phase, 'NOTICE')
  host.tick(.125)
  assert.equal(host.result.phase, 'ALERT')
})

test('caption panel exposes a polite staged-fiction status and a working skip button', () => {
  const path = new URL('../src/features/living-world/AtmospherePanel.tsx', import.meta.url)
  assert.ok(existsSync(path), 'AtmospherePanel module must exist')
  const context = { module: { exports: {} }, exports: {}, require: name => name === 'react/jsx-runtime' ? { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) } : atmosphere }
  context.exports = context.module.exports
  vm.runInNewContext(ts.transpileModule(readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText, context)
  const { AtmospherePanel } = context.module.exports
  for (const phase of ['CALM', 'SETTLED']) assert.equal(AtmospherePanel({ phase, zone: 'S1', onSkip() {} }), null)
  for (const [phase, zone] of ['NOTICE', 'ALERT', 'RECOVERY'].flatMap(phase => ['S1', 'L1-C'].map(zone => [phase, zone]))) {
    let skipped = false
    const tree = AtmospherePanel({ phase, zone, onSkip: () => { skipped = true } })
    assert.equal(tree.props.role, 'region')
    assert.equal(tree.props['aria-label'], 'Nhịp không gian')
    assert.equal(tree.props['data-phase'], phase)
    const nodes = []
    function walk(node) { if (Array.isArray(node)) node.forEach(walk); else if (node && typeof node === 'object') { nodes.push(node); walk(node.props?.children) } }
    walk(tree)
    const status = nodes.find(node => node.props?.role === 'status')
    assert.ok(status, 'polite status region exists')
    assert.equal(status.props['aria-live'], 'polite')
    const text = JSON.stringify(tree)
    assert.match(text, /hư cấu/)
    assert.match(text, /giáo dục/)
    assert.match(text, /Âm thanh tổng hợp/)
    assert.match(text, /không phải bản ghi lịch sử/)
    assert.ok(nodes.some(node => node.type === 'h2'), 'phase title is a heading')
    assert.doesNotMatch(text, /Ánh sáng/)
    if (phase === 'NOTICE') assert.match(text, /Một tín hiệu xa sắp xuất hiện trong cảnh dựng\. Âm thanh tăng nhẹ; bạn có thể bỏ qua\./)
    if (phase === 'ALERT') {
      assert.match(text, /tiếng ù trầm từ xa/i)
      if (zone === 'L1-C') assert.match(text, /người nấu và người phụ việc tạm dừng để lắng nghe/i)
      else assert.match(text, /tự do khám phá/)
    }
    if (phase === 'RECOVERY') {
      assert.match(text, /tiếng ù xa dần/i)
      assert.match(text, /công việc tiếp tục/)
    }
    assert.ok(!nodes.some(node => node.props?.role === 'alert' || node.props?.['aria-live'] === 'assertive'))
    const button = nodes.find(node => node.type === 'button')
    assert.equal(button.props.children, 'Bỏ qua nhịp cảnh')
    button.props.onClick()
    assert.equal(skipped, true)
  }
})
