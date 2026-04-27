/**
 * Mitasafi Image Downloader & Uploader
 * Downloads high-quality images and uploads to Supabase Storage
 */

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import https from 'https'
import http from 'http'

const SUPABASE_URL = 'https://syoolvgoaqnckgmngvse.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_SERVICE_KEY) {
  throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable')
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})

// Image categories and URLs from Unsplash (free to use)
const imageCollection = {
  hero: [
    {
      name: 'nairobi-skyline-1.jpg',
      url: 'https://images.unsplash.com/photo-1611348524140-53c9a25263d6?w=1920&q=80',
      description: 'Nairobi skyline at sunset'
    },
    {
      name: 'nairobi-skyline-2.jpg',
      url: 'https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?w=1920&q=80',
      description: 'Nairobi city aerial view'
    },
    {
      name: 'modern-apartment-building.jpg',
      url: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1920&q=80',
      description: 'Modern apartment building exterior'
    },
    {
      name: 'apartment-complex.jpg',
      url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1920&q=80',
      description: 'Tall apartment complex'
    }
  ],
  properties: [
    {
      name: 'living-room-modern-1.jpg',
      url: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=1200&q=80',
      description: 'Modern living room with natural light'
    },
    {
      name: 'living-room-modern-2.jpg',
      url: 'https://images.unsplash.com/photo-1567767292278-a4f21aa2d36e?w=1200&q=80',
      description: 'Bright living room interior'
    },
    {
      name: 'living-room-cozy.jpg',
      url: 'https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?w=1200&q=80',
      description: 'Cozy living room setup'
    },
    {
      name: 'bedroom-master-1.jpg',
      url: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=1200&q=80',
      description: 'Master bedroom with white bedding'
    },
    {
      name: 'bedroom-modern-1.jpg',
      url: 'https://images.unsplash.com/photo-1540518614846-7eded433c457?w=1200&q=80',
      description: 'Modern bedroom design'
    },
    {
      name: 'bedroom-minimalist.jpg',
      url: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=1200&q=80',
      description: 'Minimalist bedroom'
    },
    {
      name: 'kitchen-modern-1.jpg',
      url: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=1200&q=80',
      description: 'Modern white kitchen'
    },
    {
      name: 'kitchen-modern-2.jpg',
      url: 'https://images.unsplash.com/photo-1556909114-44e3e70034e2?w=1200&q=80',
      description: 'Kitchen with island'
    },
    {
      name: 'kitchen-apartment.jpg',
      url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&q=80',
      description: 'Apartment kitchen'
    },
    {
      name: 'bathroom-modern-1.jpg',
      url: 'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=1200&q=80',
      description: 'Modern bathroom'
    },
    {
      name: 'bathroom-clean.jpg',
      url: 'https://images.unsplash.com/photo-1507652313519-d4e9174996dd?w=1200&q=80',
      description: 'Clean bathroom design'
    },
    {
      name: 'apartment-exterior-1.jpg',
      url: 'https://images.unsplash.com/photo-1574362848149-11496d93a7c7?w=1200&q=80',
      description: 'Apartment building exterior'
    },
    {
      name: 'apartment-exterior-2.jpg',
      url: 'https://images.unsplash.com/photo-1460317442991-0ec209397118?w=1200&q=80',
      description: 'Residential apartments'
    },
    {
      name: 'apartment-balcony.jpg',
      url: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200&q=80',
      description: 'Apartment with balcony view'
    }
  ],
  people: [
    {
      name: 'tenant-happy-keys-1.jpg',
      url: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=1200&q=80',
      description: 'Person holding house keys'
    },
    {
      name: 'tenant-happy-keys-2.jpg',
      url: 'https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?w=1200&q=80',
      description: 'Happy couple with new home'
    },
    {
      name: 'couple-moving-in.jpg',
      url: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=1200&q=80',
      description: 'Couple moving into new apartment'
    },
    {
      name: 'young-professional-1.jpg',
      url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80',
      description: 'Young African professional man'
    },
    {
      name: 'young-professional-2.jpg',
      url: 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=800&q=80',
      description: 'Young African professional woman'
    },
    {
      name: 'business-woman-1.jpg',
      url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=800&q=80',
      description: 'Business woman smiling'
    },
    {
      name: 'business-man-1.jpg',
      url: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=800&q=80',
      description: 'Business man portrait'
    },
    {
      name: 'family-home-1.jpg',
      url: 'https://images.unsplash.com/photo-1581579438747-104c53d7fbc4?w=1200&q=80',
      description: 'Family in living room'
    },
    {
      name: 'landlord-handshake.jpg',
      url: 'https://images.unsplash.com/photo-1521791136064-7986c2920216?w=1200&q=80',
      description: 'Business handshake'
    },
    {
      name: 'service-provider-plumber.jpg',
      url: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=1200&q=80',
      description: 'Plumber at work'
    },
    {
      name: 'service-provider-electrician.jpg',
      url: 'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=1200&q=80',
      description: 'Electrician working'
    },
    {
      name: 'cleaner-professional.jpg',
      url: 'https://images.unsplash.com/photo-1581578949510-fa7315c4c350?w=1200&q=80',
      description: 'Professional cleaner'
    }
  ],
  features: [
    {
      name: 'phone-app-mockup.jpg',
      url: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=1200&q=80',
      description: 'Smartphone with app'
    },
    {
      name: 'mobile-payment.jpg',
      url: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1200&q=80',
      description: 'Mobile payment concept'
    },
    {
      name: 'secure-lock.jpg',
      url: 'https://images.unsplash.com/photo-1558002038-1055907df827?w=1200&q=80',
      description: 'Security lock'
    },
    {
      name: 'messaging-chat.jpg',
      url: 'https://images.unsplash.com/photo-1611746872915-64382b5c2a47?w=1200&q=80',
      description: 'Chat messaging'
    },
    {
      name: 'search-map.jpg',
      url: 'https://images.unsplash.com/photo-1524661135-423995f22d0b?w=1200&q=80',
      description: 'Map location search'
    },
    {
      name: 'verified-checkmark.jpg',
      url: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=1200&q=80',
      description: 'Verification concept'
    },
    {
      name: 'dashboard-analytics.jpg',
      url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&q=80',
      description: 'Analytics dashboard'
    },
    {
      name: 'maintenance-tools.jpg',
      url: 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=1200&q=80',
      description: 'Maintenance tools'
    }
  ],
  neighborhoods: [
    {
      name: 'nairobi-westlands.jpg',
      url: 'https://images.unsplash.com/photo-1523805009345-7448845a9e53?w=1200&q=80',
      description: 'Urban neighborhood'
    },
    {
      name: 'residential-area-1.jpg',
      url: 'https://images.unsplash.com/photo-1449844908441-8829872d2607?w=1200&q=80',
      description: 'Residential neighborhood'
    },
    {
      name: 'residential-area-2.jpg',
      url: 'https://images.unsplash.com/photo-1592595896616-c37162298647?w=1200&q=80',
      description: 'Modern residential area'
    },
    {
      name: 'street-view-1.jpg',
      url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200&q=80',
      description: 'City street view'
    }
  ],
  icons: [
    {
      name: 'house-icon.jpg',
      url: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&q=80',
      description: 'Modern house'
    },
    {
      name: 'keys-icon.jpg',
      url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80',
      description: 'House keys'
    }
  ]
}

// Local download directory
const DOWNLOAD_DIR = './public/images'

// Create directory if not exists
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

// Download image from URL
function downloadImage(url, filepath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filepath)
    const protocol = url.startsWith('https') ? https : http
    
    protocol.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    }, (response) => {
      // Handle redirects
      if (response.statusCode === 301 || response.statusCode === 302) {
        downloadImage(response.headers.location, filepath)
          .then(resolve)
          .catch(reject)
        return
      }
      
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download: ${response.statusCode}`))
        return
      }
      
      response.pipe(file)
      file.on('finish', () => {
        file.close()
        resolve(filepath)
      })
    }).on('error', (err) => {
      fs.unlink(filepath, () => {})
      reject(err)
    })
  })
}

// Upload to Supabase Storage
async function uploadToSupabase(bucket, filePath, fileName) {
  const fileBuffer = fs.readFileSync(filePath)
  
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(fileName, fileBuffer, {
      contentType: 'image/jpeg',
      upsert: true
    })
  
  if (error) throw error
  return data
}

// Create storage bucket
async function createBucket(name, isPublic = true) {
  const { data, error } = await supabase.storage.createBucket(name, {
    public: isPublic,
    fileSizeLimit: 5242880, // 5MB
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  })
  
  if (error && !error.message.includes('already exists')) {
    throw error
  }
  
  return data
}

// Main function
async function main() {
  console.log('╔══════════════════════════════════════════════════════╗')
  console.log('║     MITASAFI IMAGE DOWNLOADER & UPLOADER             ║')
  console.log('╚══════════════════════════════════════════════════════╝\n')

  // Step 1: Create storage buckets
  console.log('1️⃣  Creating storage buckets...\n')
  
  const buckets = ['landing-images', 'property-images', 'avatars', 'documents']
  
  for (const bucket of buckets) {
    try {
      await createBucket(bucket)
      console.log(`   ✅ Bucket created: ${bucket}`)
    } catch (err) {
      console.log(`   ⚠️  ${bucket}: ${err.message}`)
    }
  }

  // Step 2: Download and upload images
  console.log('\n2️⃣  Downloading and uploading images...\n')
  
  let totalImages = 0
  let successCount = 0
  let failCount = 0

  for (const [category, images] of Object.entries(imageCollection)) {
    console.log(`\n   📁 Category: ${category}`)
    ensureDir(`${DOWNLOAD_DIR}/${category}`)
    
    for (const image of images) {
      totalImages++
      const localPath = `${DOWNLOAD_DIR}/${category}/${image.name}`
      const remotePath = `${category}/${image.name}`
      
      try {
        // Download locally first
        process.stdout.write(`      ⏳ ${image.name}...`)
        await downloadImage(image.url, localPath)
        
        // Upload to Supabase
        await uploadToSupabase('landing-images', localPath, remotePath)
        
        successCount++
        console.log(` ✅`)
      } catch (err) {
        failCount++
        console.log(` ❌ ${err.message}`)
      }
    }
  }

  // Step 3: Summary
  console.log('\n' + '═'.repeat(56))
  console.log('\n📊 SUMMARY\n')
  console.log(`   Total images: ${totalImages}`)
  console.log(`   ✅ Success: ${successCount}`)
  console.log(`   ❌ Failed: ${failCount}`)
  
  // Get public URLs
  console.log('\n3️⃣  Public URLs for uploaded images:\n')
  
  const { data: files } = await supabase.storage
    .from('landing-images')
    .list('hero', { limit: 5 })
  
  if (files && files.length > 0) {
    console.log('   Sample URLs:')
    for (const file of files.slice(0, 3)) {
      const { data } = supabase.storage
        .from('landing-images')
        .getPublicUrl(`hero/${file.name}`)
      console.log(`   • ${data.publicUrl}`)
    }
  }

  console.log('\n✅ Image setup complete!')
  console.log('   Images are stored in: Supabase Storage → landing-images bucket')
  console.log('   Local copies in: ./public/images/')
}

main().catch(console.error)
