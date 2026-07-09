import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SVG = resolve(__dirname, '../public/icon.svg')

async function main() {
  let sharp
  try {
    sharp = (await import('sharp')).default
  } catch {
    console.error('⚠️ 请先安装 sharp: npm i -D sharp')
    process.exit(1)
  }
  const svgBuffer = readFileSync(SVG)
  const targets = [
    [192, 'pwa-192.png'],
    [512, 'pwa-512.png'],
    [180, 'apple-touch-icon.png'],
    [32, 'favicon-32.png']
  ]
  for (const [size, name] of targets) {
    const out = resolve(__dirname, `../public/${name}`)
    await sharp(svgBuffer).resize(size, size).png().toFile(out)
    console.log(`✅ ${name} (${size}×${size})`)
  }
}
main()
