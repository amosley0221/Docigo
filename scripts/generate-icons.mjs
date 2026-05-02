/**
 * Renders public/icon.svg into a set of PNGs that iOS Safari and the
 * web manifest expect for "Add to Home Screen" / PWA install. Also
 * builds an Apple-style 180×180 with the gradient background filling
 * the entire square (iOS rounds the corners itself; the on-disk asset
 * should be a flat square so the OS doesn't double-mask it).
 *
 * Run via `npm run icons` whenever the source SVG changes.
 */
import { Resvg } from '@resvg/resvg-js';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const sourcePath = resolve(root, 'public', 'icon.svg');
const svg = readFileSync(sourcePath, 'utf8');

const sizes = [
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'icon-192.png', size: 192 },
  { name: 'icon-512.png', size: 512 },
  { name: 'icon-maskable-512.png', size: 512 },
];

for (const { name, size } of sizes) {
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: size },
    background: 'transparent',
  });
  const png = resvg.render().asPng();
  const out = resolve(root, 'public', name);
  writeFileSync(out, png);
  // eslint-disable-next-line no-console
  console.log(`wrote ${out} (${size}×${size}, ${png.length} bytes)`);
}
