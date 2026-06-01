import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import { createServer } from 'http'
import { connectDB } from './config/db.js'
import { initSocket } from './socket/index.js'
import authRoutes from './routes/auth.js'
import userRoutes from './routes/users.js'
import conversationRoutes from './routes/conversations.js'
import groupRoutes from './routes/groups.js'
import uploadRoutes from './routes/upload.js'

const app = express()
const httpServer = createServer(app)

// Initialise Socket.io
const io = initSocket(httpServer)

// Middlewares
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/users', userRoutes)
app.use('/api/conversations', conversationRoutes)
app.use('/api/groups', groupRoutes)
app.use('/api/upload', uploadRoutes)

// Route de sante
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'AstroChat server is running' })
})

// Demarrage
connectDB().then(() => {
  const PORT = process.env.PORT || 5000
  httpServer.listen(PORT, () => {
    console.log(`Serveur lance sur le port ${PORT}`)
  })

  httpServer.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`Port ${PORT} deja utilise`)
      process.exit(1)
    }
  })
})

export { io }