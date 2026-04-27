/**
 * Download missing images with alternative URLs
 */

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import https from 'https'

const SUPABASE_URL = 'https://syoolvgoaqnckgmngvse.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_SERVICE_KEY) {
  throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable')
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})

const missingImages = [
  {
    name: 'family-home-1.jpg',
    url: 'https://images.unsplash.com/photo-1606744888344-493238951221?w=1200&q=80',
    category: 'people'
  },
  {
    name: 'messaging-chat.jpg',
    url: 'https://images.unsplash.com/photo-1577563908411-5077b6dc7624?w=1200&q=80',
    category: 'features'
  }
]

function downloadImage(url, filepath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filepath)
    https.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    }, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        downloadImage(response.headers.location, filepath).then(resolve).catch(reject)
        return
      }
      if (response.statusCode !== 200) {
        reject(new Error(`Failed: ${response.statusCode}`))
        return
      }
      response.pipe(file)
      file.on('finish', () => { file.close(); resolve(filepath) })
    }).on('error', reject)
  })
}

async function uploadToSupabase(bucket, filePath, fileName) {
  const fileBuffer = fs.readFileSync(filePath)
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(fileName, fileBuffer, { contentType: 'image/jpeg', upsert: true })
  if (error) throw error
  return data
}

async function main() {
  console.log('📥 Downloading missing images...\n')
  
  for (const img of missingImages) {
    const localPath = `./public/images/${img.category}/${img.name}`
    const remotePath = `${img.category}/${img.name}`
    
    try {
      process.stdout.write(`   ⏳ ${img.name}...`)
      await downloadImage(img.url, localPath)
      await uploadToSupabase('landing-images', localPath, remotePath)
      console.log(' ✅')
    } catch (err) {
      console.log(` ❌ ${err.message}`)
    }
  }
  
  console.log('\n✅ Missing images downloaded!')
}

main().catch(console.error)
