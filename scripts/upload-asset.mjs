#!/usr/bin/env node
// Upload a local file to the public Supabase `assets` bucket and print its URL.
//
//   node --env-file=.env scripts/upload-asset.mjs <local-file> <bucket-path> [content-type]
//
// e.g. node --env-file=.env scripts/upload-asset.mjs ./clip.mp4 welcome-education-bg.mp4
//
// Uploads are upserted with a one-year cache-control, matching the convention in
// server/jobs/lib/logos.js. Reusing a path keeps the CDN serving the old bytes
// for up to a year, so bump the filename (or add a `?v=` query) when replacing.

import { readFile } from 'node:fs/promises'
import { basename, extname } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const [localPath, bucketPathArg, contentTypeArg] = process.argv.slice(2)
if (!localPath) {
  console.error('usage: node --env-file=.env scripts/upload-asset.mjs <local-file> [bucket-path] [content-type]')
  process.exit(1)
}

const url = process.env.VITE_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set (run with --env-file=.env)')
  process.exit(1)
}

const TYPES = {
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.gif': 'image/gif',
}

const bucketPath = bucketPathArg || basename(localPath)
const contentType = contentTypeArg || TYPES[extname(localPath).toLowerCase()] || 'application/octet-stream'
const buffer = await readFile(localPath)

const supabase = createClient(url, key, { auth: { persistSession: false } })
const { error } = await supabase.storage
  .from('assets')
  .upload(bucketPath, buffer, { contentType, upsert: true, cacheControl: '31536000' })
if (error) {
  console.error(`upload failed: ${error.message}`)
  process.exit(1)
}

const { data } = supabase.storage.from('assets').getPublicUrl(bucketPath)
console.log(`${(buffer.length / 1024).toFixed(0)} KB ${contentType} -> ${data.publicUrl}`)
