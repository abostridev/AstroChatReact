import { v2 as cloudinary } from 'cloudinary'
import multer from 'multer'

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
})

// On stocke les fichiers en memoire temporairement
// puis on les envoie directement a Cloudinary
const storage = multer.memoryStorage()

export const uploadAvatar = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true)
    } else {
      cb(new Error('Seules les images sont acceptees pour les avatars'))
    }
  }
})

export const uploadMessage = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50 MB
})

// Fonction pour uploader un buffer vers Cloudinary
export const uploadToCloudinary = (buffer, options) => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error) reject(error)
      else resolve(result)
    }).end(buffer)
  })
}

export default cloudinary