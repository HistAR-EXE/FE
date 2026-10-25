import sharp from 'sharp'
import { fileURLToPath } from 'node:url'

const fixtures = [
  {
    name: 'portrait-single-face.jpg',
    width: 640,
    height: 800,
    faces: [{ cx: 320, cy: 260, rx: 105, ry: 135 }],
  },
  {
    name: 'portrait-two-faces.jpg',
    width: 800,
    height: 640,
    faces: [
      { cx: 245, cy: 235, rx: 95, ry: 120 },
      { cx: 555, cy: 235, rx: 95, ry: 120 },
    ],
  },
]

for (const fixture of fixtures) {
  const faces = fixture.faces.map(({ cx, cy, rx, ry }) => `
    <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="#c98f68"/>
    <circle cx="${cx - rx * 0.35}" cy="${cy - ry * 0.1}" r="10" fill="#24180f"/>
    <circle cx="${cx + rx * 0.35}" cy="${cy - ry * 0.1}" r="10" fill="#24180f"/>
    <path d="M ${cx - rx * 0.35} ${cy + ry * 0.35} Q ${cx} ${cy + ry * 0.55} ${cx + rx * 0.35} ${cy + ry * 0.35}" fill="none" stroke="#6b2e28" stroke-width="8"/>
  `).join('')
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${fixture.width}" height="${fixture.height}">
    <rect width="100%" height="100%" fill="#d8c9ac"/>
    <rect x="24" y="24" width="${fixture.width - 48}" height="${fixture.height - 48}" fill="#8fa38f"/>
    ${faces}
  </svg>`
  await sharp(Buffer.from(svg)).jpeg({ quality: 90, chromaSubsampling: '4:4:4' }).toFile(fileURLToPath(new URL(fixture.name, import.meta.url)))
}
