/**
 * Upload Logo Files to Supabase Storage
 * 
 * Run: node scripts/upload-logos.mjs
 */

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Supabase config
const supabaseUrl = 'https://syoolvgoaqnckgmngvse.supabase.co'
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseKey) {
  console.error('Error: SUPABASE_SERVICE_ROLE_KEY environment variable is required')
  console.log('Set it with: $env:SUPABASE_SERVICE_ROLE_KEY="your-key-here"')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

const logoFiles = [
  'app-icon-192.svg',
  'app-icon-512.svg',
  'favicon.svg',
  'mitasafi-icon-teal-bg.svg',
  'mitasafi-icon-teal.svg',
  'mitasafi-icon-white.svg',
  'mitasafi-icon.svg',
  'mitasafi-logo-teal.svg',
  'mitasafi-logo-white.svg',
  'og-image.svg',
  'profile-picture.svg',
]

async function uploadLogos() {
  console.log('Uploading logo files to Supabase storage...\n')
  
  const logoDir = path.join(__dirname, '..', 'public', 'logo')
  
  for (const filename of logoFiles) {
    const filePath = path.join(logoDir, filename)
    
    if (!fs.existsSync(filePath)) {
      console.log(`⚠ Skipping ${filename} - file not found`)
      continue
    }
    
    const fileContent = fs.readFileSync(filePath)
    const storagePath = `logo/${filename}`
    
    const { data, error } = await supabase.storage
      .from('landing-images')
      .upload(storagePath, fileContent, {
        contentType: 'image/svg+xml',
        upsert: true
      })
    
    if (error) {
      console.log(`✗ Failed to upload ${filename}: ${error.message}`)
    } else {
      console.log(`✓ Uploaded ${filename}`)
    }
  }
  
  console.log('\nDone! Logo files are now available at:')
  console.log('https://syoolvgoaqnckgmngvse.supabase.co/storage/v1/object/public/landing-images/logo/')
}

uploadLogos().catch(console.error)
