import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import morgan from 'morgan'

import authRoutes from './routes/auth.routes.js'
import userRoutes from './routes/user.routes.js'
import roleRoutes from './routes/role.routes.js'
import supplierRoutes from './routes/supplier.routes.js'
import moduleRoutes from './routes/module.routes.js'
import roleModuleRoutes from './routes/roleModule.routes.js'
import supplyRoutes from './routes/supply.routes.js'

import { notFound } from './middlewares/notFound.js'
import { errorHandler } from './middlewares/errorHandler.js'

const app = express()
const PORT = process.env.PORT || 3000

// ─── Middlewares globales ─────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:4200',
  credentials: true,
}))
app.use(morgan('dev'))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// ─── Rutas ────────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes)
app.use('/api/users', userRoutes)
app.use('/api/roles', roleRoutes)
app.use('/api/suppliers', supplierRoutes)
app.use('/api/modules', moduleRoutes)
app.use('/api/roleModule', roleModuleRoutes)
app.use('/api/supply', supplyRoutes)

app.get('/api/health', (_, res) => res.json({ status: 'ok', env: process.env.NODE_ENV }))

// ─── Manejo de errores ────────────────────────────────────────────────────────
app.use(notFound)
app.use(errorHandler)

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})

export default app
