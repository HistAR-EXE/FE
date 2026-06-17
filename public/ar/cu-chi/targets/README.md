# AR image targets (`.mind`)

Compile from preview images when building for production (Linux/Docker has canvas support):

```bash
cd FE
node scripts/compile-ar-targets.mjs
```

Until `.mind` files exist, webcam/live modes use camera overlay fallback (3D anchored demo).

Target images: `/media/cu-chi/scenes/*-2026.jpg`

Printable posters: `posters/*-print.html` (open in browser → Print → A4).
