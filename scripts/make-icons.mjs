// Render the SVG mark to the PNG sizes used by browsers and home-screen installs.
import sharp from 'sharp';
import fs from 'node:fs';
const svg = fs.readFileSync('public/favicon.svg');
for (const [name, size] of [['icon-192.png', 192], ['icon-512.png', 512], ['apple-touch-icon.png', 180]]) {
  await sharp(svg, { density: 512 }).resize(size, size).png().toFile('public/' + name);
}
// Maskable variant: mark inside the safe zone on the graphite background.
const pad = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="#1D2329"/><image href="data:image/svg+xml;base64,${svg.toString('base64')}" x="96" y="96" width="320" height="320"/></svg>`);
await sharp(pad, { density: 300 }).resize(512, 512).png().toFile('public/icon-maskable-512.png');
console.log('icons written');
