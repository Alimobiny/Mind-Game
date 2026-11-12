// تولید آیکون PNG برای electron-builder از نشان SVG پروژه
// خروجی: build/icon.png (۵۱۲×۵۱۲) — electron-builder خودش ico ویندوز می‌سازد.
// اجرا: npm run icons  (داخل npm run desktop:build هم صدا زده می‌شود)
import { mkdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const root = path.resolve(process.cwd())
const svgPath = path.join(root, 'public', 'icons', 'icon.svg')
const outDir = path.join(root, 'build')
const outPath = path.join(outDir, 'icon.png')

await mkdir(outDir, { recursive: true })
const svg = await readFile(svgPath)
await sharp(svg, { density: 96 })
  .resize(512, 512)
  .png()
  .toFile(outPath)
console.log(`icon written: ${path.relative(root, outPath)}`)
