import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8')

test('production picker exposes only published roles with image-first previews', () => {
  const source = read('../src/features/heritage-studio/HeritageRolePicker.tsx')
  assert.match(source, /publishedOnly = true/)
  assert.match(source, /getPublishedRoleTemplates/)
  assert.match(source, /HeritageRoleArtwork/)
  assert.match(source, /variant === 'gallery'/)
})

test('photo page keeps original-photo fallback and does not show Frame1', () => {
  const source = read('../src/pages/PhotoFramePage.tsx')
  const original = read('../src/features/heritage-studio/OriginalPhotoPanel.tsx')
  assert.match(source, /Ảnh gốc/)
  assert.match(source, /Hóa thân 1968/)
  assert.match(source, /Vai hóa thân của trạm đang được duyệt sử liệu/)
  assert.match(original, /!framesLoading && frames\.length === 0/)
  assert.doesNotMatch(source, /Frame1/)
})

test('heritage portrait is recomposed automatically when inputs change', () => {
  const studio = read('../src/features/heritage-studio/HeritageStudio.tsx')
  const page = read('../src/pages/PhotoFramePage.tsx')
  assert.match(studio, /requestAnimationFrame\(\(\) =>/)
  assert.match(studio, /renderHeritagePortrait\(canvas/)
  assert.match(studio, /Đã ghép tự động/)
  assert.doesNotMatch(studio, /Ghép lại ngay/)
  assert.match(studio, /Tinh chỉnh bằng thanh trượt/)
  assert.match(page, /Ánh sáng/)
  assert.match(page, /Lưu ảnh & tiếp tục/)
})

test('Cedar Falls completion is one-shot and distinguishes 1967 from 1968', () => {
  const viewer = read('../src/features/diorama/BattleDioramaViewer.tsx')
  const page = read('../src/pages/BattleDioramaPage.tsx')
  assert.match(viewer, /completedRef\.current/)
  assert.match(viewer, /onComplete\?\.\(\)/)
  assert.match(page, /Từ chiến dịch Cedar Falls 1967, tiếp tục khám phá đời sống dưới địa đạo năm 1968\./)
  assert.match(page, /Việc mở studio không tạo check-in hoặc cộng điểm\./)
  assert.doesNotMatch(page, /stationCode:\s*['"]ST01['"]/)
})

test('ST06 camera safety remains library-only', () => {
  const source = read('../src/pages/PhotoFramePage.tsx')
  assert.match(read('../src/features/heritage-studio/PortraitPicker.tsx'), /capture="user"/)
  assert.match(source, /Bạn vẫn có thể chọn ảnh từ thư viện/)
})

test('heritage flow has one shared light control and no square selector', () => {
  const source = read('../src/pages/PhotoFramePage.tsx')
  assert.equal(source.match(/type="range"/g)?.length, 1)
  assert.doesNotMatch(read('../src/features/heritage-studio/HeritageStudioPanel.tsx'), /onVariantChange|Vuông 1080/)
  assert.match(source, /returnTo.*profile/)
})

test('portrait picker uses styled touch targets instead of a raw file input', () => {
  const source = read('../src/features/heritage-studio/PortraitPicker.tsx')
  assert.match(source, /min-h-11/)
  assert.match(source, /Chọn ảnh từ thư viện/)
  assert.match(source, /sr-only/)
})
