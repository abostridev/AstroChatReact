import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { createServer } from 'http'
import { Server } from 'socket.io'
import { connectDB } from './config/db.js'

const app = express()
const httpServer = createServer(app)

const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true
  }
})

// Middlewares
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Route de santé
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'AstroChat server is running ' })
})

// Démarrage
connectDB().then(() => {
  const PORT = process.env.PORT || 5000
  httpServer.listen(PORT, () => {
    console.log(`Serveur lancé sur le port ${PORT}`)
  })
})

export { io }