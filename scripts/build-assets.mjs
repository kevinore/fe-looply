// Generates optimized web assets from assets-src/brand/ and assets-src/products/.
// Run after replacing any source image: `npm run assets`
// Outputs are committed so builds don't depend on sharp.
import { mkdir, readdir } from 'node:fs/promises';
import sharp from 'sharp';

const SRC = 'assets-src/brand';
const BRAND = 'public/brand';
const ICONS = 'public/icons';
const PRODUCTS_SRC = 'assets-src/products';
const PRODUCTS = 'public/products';

// Soft brand background used behind icons (the logo is transparent).
const ICON_BG = '#FBEDF3';

const MASCOTS = ['mascot-drink', 'mascot-matcha', 'mascot-counter'];
const MASCOT_WIDTHS = [320, 640, 960];

await mkdir(BRAND, { recursive: true });
await mkdir(ICONS, { recursive: true });
await mkdir(PRODUCTS, { recursive: true });

for (const name of MASCOTS) {
  for (const w of MASCOT_WIDTHS) {
    const img = sharp(`${SRC}/${name}.png`).resize(w, w, { fit: 'inside' });
    await img.clone().avif({ quality: 55, effort: 6 }).toFile(`${BRAND}/${name}-${w}.avif`);
    await img.clone().webp({ quality: 78, effort: 6 }).toFile(`${BRAND}/${name}-${w}.webp`);
  }
}

for (const w of [128, 256, 512]) {
  const img = sharp(`${SRC}/logo.png`).resize(w, w, { fit: 'contain', background: '#0000' });
  await img.clone().webp({ quality: 85 }).toFile(`${BRAND}/logo-${w}.webp`);
  await img.clone().png({ compressionLevel: 9 }).toFile(`${BRAND}/logo-${w}.png`);
}

/** Logo centered on a solid square; `scale` is the logo size relative to the canvas. */
async function icon(size, scale, bg, out) {
  const inner = Math.round(size * scale);
  const logo = await sharp(`${SRC}/logo.png`)
    .resize(inner, inner, { fit: 'contain', background: '#0000' })
    .toBuffer();
  await sharp({ create: { width: size, height: size, channels: 4, background: bg } })
    .composite([{ input: logo, gravity: 'center' }])
    .png({ compressionLevel: 9 })
    .toFile(out);
}

await icon(192, 0.92, ICON_BG, `${ICONS}/icon-192.png`);
await icon(512, 0.92, ICON_BG, `${ICONS}/icon-512.png`);
// Maskable: platforms may crop to a circle covering the central 80%.
await icon(512, 0.76, ICON_BG, `${ICONS}/icon-maskable-512.png`);
// iOS ignores transparency and adds its own rounded corners.
await icon(180, 0.9, '#FFFFFF', `${ICONS}/apple-touch-icon-180.png`);
await icon(48, 1, '#0000', `${ICONS}/favicon-48.png`);
await icon(32, 1, '#0000', `${ICONS}/favicon-32.png`);

// Product photos: transparent cut-outs, shown whole (object-contain) on the sale tiles.
// <name>.png -> /products/<name>.webp, the value for product.photo_url in seed_data.json.
// Tiles show them ~110 px tall; 400 px covers 3x screens.
for (const file of (await readdir(PRODUCTS_SRC)).filter((f) => f.endsWith('.png'))) {
  const name = file.slice(0, -4);
  await sharp(`${PRODUCTS_SRC}/${file}`)
    .resize({ height: 400 })
    .webp({ quality: 80, alphaQuality: 90, effort: 6 })
    .toFile(`${PRODUCTS}/${name}.webp`);
}

console.log('Assets generated.');
