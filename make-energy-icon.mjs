import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import pngToIco from 'png-to-ico';

const svg = fileURLToPath(new URL('./assets/zier-energy.svg', import.meta.url));
const png = fileURLToPath(new URL('./assets/icon.png', import.meta.url));
const ico = fileURLToPath(new URL('./assets/icon.ico', import.meta.url));
await sharp(svg).resize(512, 512).png().toFile(png);
const sizes = [16, 24, 32, 48, 64, 128, 256];
const buffers = await Promise.all(sizes.map(size => sharp(svg).resize(size, size).png().toBuffer()));
await fs.writeFile(ico, await pngToIco(buffers));
console.log('Zier工作能量条图标已生成');
