import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'demo-secret-change-in-production'

export function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' })
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET)
  } catch {
    return null
  }
}

export function authMiddleware(req, res, next) {
  const auth = req.headers.authorization
  const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null
  const payload = token ? verifyToken(token) : null
  if (!payload) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  req.userId = payload.userId
  req.userEmail = payload.email
  next()
}
