import process from 'node:process';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';
import { water } from 'ionicons/icons';
const browser = await chromium.launch({
  headless: true,
  ...(process.env.LAVA_ICON_BROWSER ? { executablePath: process.env.LAVA_ICON_BROWSER } : {}),
});
const waterSvg = decodeURIComponent(water.slice(water.indexOf(',') + 1));
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="#0B5FFF"/><g transform="translate(128 128) scale(.5)" fill="white">${waterSvg.replace(/<svg[^>]*>/, '').replace('</svg>', '')}</g></svg>`;
await mkdir('public/icons', { recursive: true });
await writeFile('public/brand.svg', svg);
for (const [filename, size] of [
  ['icons/pwa-192.png', 192],
  ['icons/pwa-512.png', 512],
  ['icons/pwa-maskable-512.png', 512],
  ['apple-touch-icon.png', 180],
  ['favicon.png', 32],
]) {
  const page = await browser.newPage({
    viewport: { width: size, height: size },
    deviceScaleFactor: 1,
  });
  await page.setContent(
    `<html><body style="margin:0;width:100vw;height:100vh">${svg.replace('viewBox=', `width="${size}" height="${size}" viewBox=`)}</body></html>`,
  );
  await page.screenshot({ path: `public/${filename}` });
  await page.close();
}
await browser.close();
