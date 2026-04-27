/**
 * Download African/Black people images for Kenyan market
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

// African/Black people images - replacing previous ones
const africanPeopleImages = [
  // Tenants & Happy moments
  {
    name: 'tenant-happy-keys-1.jpg',
    url: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=1200&q=80',
    description: 'African woman smiling'
  },
  {
    name: 'tenant-happy-keys-2.jpg',
    url: 'https://images.unsplash.com/photo-1589156280159-27698a70f29e?w=1200&q=80',
    description: 'African couple happy'
  },
  {
    name: 'couple-moving-in.jpg',
    url: 'https://images.unsplash.com/photo-1543269865-cbf427effbad?w=1200&q=80',
    description: 'African friends/couple'
  },
  // Young professionals
  {
    name: 'young-professional-1.jpg',
    url: 'https://images.unsplash.com/photo-1506277886164-e25aa3f4ef7f?w=800&q=80',
    description: 'Young African professional man'
  },
  {
    name: 'young-professional-2.jpg',
    url: 'https://images.unsplash.com/photo-1589156191108-c762ff4b96ab?w=800&q=80',
    description: 'Young African professional woman'
  },
  {
    name: 'young-professional-3.jpg',
    url: 'https://images.unsplash.com/photo-1507152927003-93c336633124?w=800&q=80',
    description: 'African man in casual professional'
  },
  // Business people
  {
    name: 'business-woman-1.jpg',
    url: 'https://images.unsplash.com/photo-1580894732444-8ecded7900cd?w=800&q=80',
    description: 'African business woman'
  },
  {
    name: 'business-woman-2.jpg',
    url: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=800&q=80',
    description: 'African woman professional'
  },
  {
    name: 'business-man-1.jpg',
    url: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=800&q=80',
    description: 'African business man'
  },
  {
    name: 'business-man-2.jpg',
    url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=800&q=80',
    description: 'Professional man portrait'
  },
  // Family
  {
    name: 'family-home-1.jpg',
    url: 'https://images.unsplash.com/photo-1591115765373-5207764f72e7?w=1200&q=80',
    description: 'African family'
  },
  {
    name: 'family-home-2.jpg',
    url: 'https://images.unsplash.com/photo-1609220136736-443140cffec6?w=1200&q=80',
    description: 'African family together'
  },
  // Handshake/agreement
  {
    name: 'landlord-handshake.jpg',
    url: 'https://images.unsplash.com/photo-1573164713714-d95e436ab8d6?w=1200&q=80',
    description: 'Business handshake'
  },
  {
    name: 'tenant-signing.jpg',
    url: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=1200&q=80',
    description: 'Signing documents'
  },
  // Service providers
  {
    name: 'service-provider-plumber.jpg',
    url: 'https://images.unsplash.com/photo-1504309092620-4d0ec726efa4?w=1200&q=80',
    description: 'Worker/technician'
  },
  {
    name: 'service-provider-electrician.jpg',
    url: 'https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=1200&q=80',
    description: 'Electrician at work'
  },
  {
    name: 'service-provider-general.jpg',
    url: 'https://images.unsplash.com/photo-1587691592099-24045f5ace18?w=1200&q=80',
    description: 'African worker'
  },
  // Testimonial headshots
  {
    name: 'testimonial-woman-1.jpg',
    url: 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=600&q=80',
    description: 'African woman headshot'
  },
  {
    name: 'testimonial-woman-2.jpg',
    url: 'https://images.unsplash.com/photo-1589156280159-27698a70f29e?w=600&q=80',
    description: 'African woman smiling'
  },
  {
    name: 'testimonial-woman-3.jpg',
    url: 'https://images.unsplash.com/photo-1611432579699-484f7990b127?w=600&q=80',
    description: 'Professional African woman'
  },
  {
    name: 'testimonial-man-1.jpg',
    url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&q=80',
    description: 'African man headshot'
  },
  {
    name: 'testimonial-man-2.jpg',
    url: 'https://images.unsplash.com/photo-1506277886164-e25aa3f4ef7f?w=600&q=80',
    description: 'Young African man'
  },
  {
    name: 'testimonial-man-3.jpg',
    url: 'https://images.unsplash.com/photo-1522529599102-193c0d76b5b6?w=600&q=80',
    description: 'African man professional'
  },
  // Additional lifestyle
  {
    name: 'woman-on-phone.jpg',
    url: 'https://images.unsplash.com/photo-1523824921871-d6f1a15151f1?w=1200&q=80',
    description: 'African woman using phone'
  },
  {
    name: 'man-on-laptop.jpg',
    url: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1200&q=80',
    description: 'Working on laptop'
  },
  {
    name: 'happy-tenant-home.jpg',
    url: 'https://images.unsplash.com/photo-1517256673644-36ad11246d21?w=1200&q=80',
    description: 'Happy person at home'
  }
]

function downloadImage(url, filepath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filepath)
    https.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    }, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        file.close()
        fs.unlinkSync(filepath)
        downloadImage(response.headers.location, filepath).then(resolve).catch(reject)
        return
      }
      if (response.statusCode !== 200) {
        file.close()
        fs.unlinkSync(filepath)
        reject(new Error(`HTTP ${response.statusCode}`))
        return
      }
      response.pipe(file)
      file.on('finish', () => { file.close(); resolve(filepath) })
    }).on('error', (err) => {
      file.close()
      fs.unlink(filepath, () => {})
      reject(err)
    })
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
  console.log('╔══════════════════════════════════════════════════════╗')
  console.log('║   DOWNLOADING AFRICAN/BLACK PEOPLE IMAGES            ║')
  console.log('╚══════════════════════════════════════════════════════╝\n')
  
  const dir = './public/images/people'
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  
  let success = 0, failed = 0
  
  for (const img of africanPeopleImages) {
    const localPath = `${dir}/${img.name}`
    const remotePath = `people/${img.name}`
    
    try {
      process.stdout.write(`   ⏳ ${img.name}...`)
      await downloadImage(img.url, localPath)
      await uploadToSupabase('landing-images', localPath, remotePath)
      success++
      console.log(' ✅')
    } catch (err) {
      failed++
      console.log(` ❌ ${err.message}`)
    }
  }
  
  console.log('\n' + '═'.repeat(56))
  console.log(`\n📊 Results: ${success} success, ${failed} failed`)
  console.log('\n✅ African/Black people images ready for Kenyan market!')
  
  // Show sample URLs
  console.log('\n📎 Sample public URLs:')
  const samples = ['testimonial-woman-1.jpg', 'testimonial-man-1.jpg', 'business-woman-1.jpg']
  for (const s of samples) {
    console.log(`   https://syoolvgoaqnckgmngvse.supabase.co/storage/v1/object/public/landing-images/people/${s}`)
  }
}

main().catch(console.error)
