import express from 'express'
import authMiddleware from '../middleware/auth.js'
import { uploadMessage, uploadToCloudinary } from '../config/cloudinary.js'

const router = express.Router()

router.use(authMiddleware)

// ─── UPLOAD FICHIER MESSAGE ─────────────────────────────────────
// POST /api/upload/message
router.post('/message', uploadMessage.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Aucun fichier envoye' })
    }

    const { mimetype, originalname, buffer } = req.file

    // Determine le type de fichier
    let type = 'FILE'
    let folder = 'astrochat/files'
    let resourceType = 'raw'

    if (mimetype.startsWith('image/')) {
      type = 'IMAGE'
      folder = 'astrochat/images'
      resourceType = 'image'
    } else if (mimetype.startsWith('video/')) {
      type = 'VIDEO'
      folder = 'astrochat/videos'
      resourceType = 'video'
    } else if (mimetype.startsWith('audio/')) {
      type = 'AUDIO'
      folder = 'astrochat/audio'
      resourceType = 'video' // Cloudinary utilise 'video' pour l'audio aussi
    }

    const result = await uploadToCloudinary(buffer, {
      folder,
      resource_type: resourceType,
      public_id: `${Date.now()}_${originalname.replace(/\s/g, '_')}`
    })

    res.json({
      fileUrl: result.secure_url,
      fileName: originalname,
      type,
      duration: result.duration || null // pour les audio/video
    })

  } catch (error) {
    console.error('Erreur upload fichier:', error)
    res.status(500).json({ message: 'Erreur upload' })
  }
})

// ─── UPLOAD NOTE VOCALE ─────────────────────────────────────────
// POST /api/upload/audio
router.post('/audio', uploadMessage.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Aucun fichier audio envoye' })
    }

    const result = await uploadToCloudinary(req.file.buffer, {
      folder: 'astrochat/audio',
      resource_type: 'video', // Cloudinary traite audio comme video
      public_id: `voice_${Date.now()}`
    })

    res.json({
      fileUrl: result.secure_url,
      fileName: 'Note vocale',
      type: 'AUDIO',
      duration: result.duration || null
    })

  } catch (error) {
    console.error('Erreur upload audio:', error)
    res.status(500).json({ message: 'Erreur upload audio' })
  }
})

export default router