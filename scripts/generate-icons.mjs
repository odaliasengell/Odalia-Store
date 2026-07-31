import sharp from 'sharp'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const src = path.join(__dirname, 'icon-source.svg')
const outDir = path.join(__dirname, '..', 'public', 'icons')

const targets = [
  { file: 'icon-192.png', size: 192 },
  { file: 'icon-512.png', size: 512 },
  { file: 'icon-maskable-512.png', size: 512 },
  { file: 'apple-touch-icon.png', size: 180 },
]

for (const { file, size } of targets) {
  await sharp(src, { density: 384 })
    .resize(size, size)
    .png()
    .toFile(path.join(outDir, file))
  console.log(`Generated ${file}`)
}

// Favicon (square, browsers scale it down fine)
await sharp(src, { density: 384 })
  .resize(64, 64)
  .png()
  .toFile(path.join(__dirname, '..', 'public', 'favicon.png'))
console.log('Generated favicon.png')
