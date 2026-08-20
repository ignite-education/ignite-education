#!/usr/bin/env node
/**
 * Regenerates every icon asset from the single source of truth, public/favicon.svg,
 * and mirrors them into the sibling apps.
 *
 *   npm run icons
 *
 * Run manually after changing the mark, then COMMIT the output.
 *
 * Deliberately NOT wired into `build`:
 *  - `sharp` reaches this repo only as an *optional transitive* dep of `next`
 *    (package-lock marks node_modules/sharp dev+optional; no package.json declares
 *    it). An `npm ci --omit=optional` build would not have it.
 *  - next-app and admin-app build from their own root directories on Vercel and
 *    would never run a root-level script anyway.
 *  - Vercel deploys what is in git, so the committed binaries are the contract.
 */
import sharp from 'sharp'
import { readFileSync, writeFileSync, copyFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const PUBLIC = join(ROOT, 'public')

/** Must match the background rect in favicon.svg — see the note on flatten() below. */
const BRAND = '#EF0B72'

const svg = readFileSync(join(PUBLIC, 'favicon.svg'))

/**
 * Every icon is flattened opaque onto the brand pink. iOS composites
 * apple-touch-icon onto black, and an alpha channel makes Google's "is the
 * background one uniform colour?" corner test — the thing that decides between a
 * clean circular crop and a square stranded on white — needlessly ambiguous.
 */
const render = (size) =>
  sharp(svg)
    .resize(size, size, { fit: 'cover' })
    .flatten({ background: BRAND })
    .png({ compressionLevel: 9 })
    .toBuffer()

/** ICO frames additionally keep 4 channels so the entry's bitCount of 32 is literally true. */
const renderIcoFrame = (size) =>
  sharp(svg)
    .resize(size, size, { fit: 'cover' })
    .flatten({ background: BRAND })
    .ensureAlpha()
    .png({ compressionLevel: 9 })
    .toBuffer()

/**
 * The W3C maskable safe zone is a circle covering 80% of the canvas — radius
 * 204.8 at 512. The base mark's outer square reaches 243.2 from centre, so a
 * launcher mask would clip it. Shrink the whole design to 80% and re-pad the
 * margin in the same brand pink: the outer square then reaches 194.6 < 204.8,
 * and because the padding colour is the pink that already bleeds to the edge,
 * this stays the same artwork with more bleed rather than a second design.
 */
const renderMaskable = async (size) => {
  const inner = Math.round(size * 0.8)
  const pad = Math.round((size - inner) / 2)
  return sharp(svg)
    .resize(inner, inner, { fit: 'cover' })
    .flatten({ background: BRAND })
    .extend({ top: pad, bottom: pad, left: pad, right: pad, background: BRAND })
    .png({ compressionLevel: 9 })
    .toBuffer()
}

/**
 * Minimal ICO container. Not worth a dependency — the format is 22 bytes of
 * header per image plus the payloads:
 *
 *   ICONDIR                      6 bytes, once, at offset 0
 *     0   u16le  reserved        always 0
 *     2   u16le  type            1 = icon (2 = cursor)
 *     4   u16le  count           number of images
 *
 *   ICONDIRENTRY                16 bytes each, `count` of them, right after ICONDIR
 *     0   u8     width           QUIRK: 0 means 256
 *     1   u8     height          QUIRK: 0 means 256
 *     2   u8     colorCount      0 for anything >= 8bpp
 *     3   u8     reserved        0
 *     4   u16le  planes          1
 *     6   u16le  bitCount        32
 *     8   u32le  bytesInRes      byte length of this image's payload
 *    12   u32le  imageOffset     ABSOLUTE offset from byte 0 of the file
 *
 *   payloads                     concatenated, in entry order
 *
 * Payloads are whole PNG files. PNG-in-ICO has been supported since Windows
 * Vista and is decoded by every current browser and by Google's image fetcher,
 * so no BMP/DIB header or 1-bpp AND mask is needed.
 */
function buildIco(images) {
  const dir = Buffer.alloc(6)
  dir.writeUInt16LE(0, 0)
  dir.writeUInt16LE(1, 2)
  dir.writeUInt16LE(images.length, 4)

  const entries = Buffer.alloc(16 * images.length)
  let offset = 6 + 16 * images.length

  images.forEach(({ size, data }, i) => {
    const e = i * 16
    entries.writeUInt8(size >= 256 ? 0 : size, e + 0)
    entries.writeUInt8(size >= 256 ? 0 : size, e + 1)
    entries.writeUInt8(0, e + 2)
    entries.writeUInt8(0, e + 3)
    entries.writeUInt16LE(1, e + 4)
    entries.writeUInt16LE(32, e + 6)
    entries.writeUInt32LE(data.length, e + 8)
    entries.writeUInt32LE(offset, e + 12)
    offset += data.length
  })

  return Buffer.concat([dir, entries, ...images.map((i) => i.data)])
}

/**
 * next.ignite.education and admin.ignite.education are separate origins, so a
 * root-relative /favicon.ico resolves against THEIR filesystems, not the apex's.
 * Without copies, staging tabs are blank and admin-app's own /(.*) catch-all
 * silently returns its SPA shell at HTTP 200 where an image was declared.
 * admin-app is internal and noindex, so it only needs the two tab icons.
 */
const MIRRORS = {
  'next-app': [
    'favicon.svg',
    'favicon.ico',
    'apple-touch-icon.png',
    'icon-192.png',
    'icon-512.png',
    'icon-maskable-512.png',
    'site.webmanifest',
  ],
  'admin-app': ['favicon.svg', 'favicon.ico'],
}

async function main() {
  // Largest frame first. Browsers pick by size regardless of order, but any
  // decoder that naively takes the first entry then gets the 48x48 that Google
  // documents as its minimum, keeping the sizes="48x48" link attribute honest.
  const frames = []
  for (const size of [48, 32, 16]) {
    frames.push({ size, data: await renderIcoFrame(size) })
  }
  writeFileSync(join(PUBLIC, 'favicon.ico'), buildIco(frames))

  writeFileSync(join(PUBLIC, 'apple-touch-icon.png'), await render(180))
  writeFileSync(join(PUBLIC, 'icon-192.png'), await render(192))
  writeFileSync(join(PUBLIC, 'icon-512.png'), await render(512))
  writeFileSync(join(PUBLIC, 'icon-maskable-512.png'), await renderMaskable(512))

  for (const [app, files] of Object.entries(MIRRORS)) {
    for (const file of files) {
      copyFileSync(join(PUBLIC, file), join(ROOT, app, 'public', file))
    }
  }

  console.log('icons regenerated and mirrored into next-app/ and admin-app/')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
