// Render real local GLBs with the production viewer, then create small catalog previews.
// Start Vite first. Run: node scripts/render-ar-thumbnails.mjs http://127.0.0.1:5175
import fs from 'node:fs/promises';
import { chromium } from '@playwright/test';
import sharp from 'sharp';
const catalog = JSON.parse(await fs.readFile(new URL('../src/features/ar/ar-catalog.json', import.meta.url), 'utf8'));
const browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--enable-unsafe-swiftshader'] });
const previews = [];
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 }, reducedMotion: 'reduce' });
  await page.addInitScript(() => localStorage.setItem('histar_consent_v1', JSON.stringify({ analytics: false, camera: false, gps: false })));
  await page.route(url => url.pathname.startsWith('/api/'), route => route.fulfill({ json: { success: true, data: [] } }));
  for (const artifact of catalog) {
    console.log(`Opening ${artifact.id}`);
    await page.goto(`${process.argv[2] || 'http://127.0.0.1:5175'}/ar-experience?artifact=${artifact.id}&review=1`);
    console.log(`Page ready ${artifact.id}`);
    if (await page.getByTestId('consent-modal').isVisible()) await page.getByRole('button', { name: 'Từ chối tất cả' }).click();
    await page.getByRole('button', { name: 'Tải mô hình 3D' }).click({ timeout: 90000 });
    console.log(`Loading GLB ${artifact.id}`);
    await page.locator('.ar-model-canvas canvas').waitFor({ state: 'visible' });
    await page.locator('.ar-model-status').waitFor({ state: 'hidden', timeout: 30000 });
    console.log(`GLB ready ${artifact.id}`);
    // Wait for the first rendered image after the loader publishes readiness.
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const preview = await page.locator('.ar-model-canvas').screenshot();
    previews.push({ artifact, preview });
    console.log(`Rendered ${artifact.id}`);
  }
} finally { await browser.close(); }
// Public asset writes trigger Vite reloads, so write only after every capture is done.
for (const { artifact, preview } of previews) {
  const destination = new URL(`../public${artifact.thumbnail}`, import.meta.url);
  await fs.writeFile(destination, await sharp(preview).resize({ width: 240, height: 180, fit: 'contain', background: '#edf4fe' }).webp({ quality: 85 }).toBuffer());
}
