import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import rateLimit from 'express-rate-limit'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import db from './db.js'
import { signToken, authMiddleware } from './auth.js'
import OpenAI from 'openai'

const app = express()
const PORT = process.env.PORT || 3001

// ===== Startup Validation =====
const requiredEnvVars = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'JWT_SECRET']
const missingEnvVars = requiredEnvVars.filter(v => !process.env[v])
if (missingEnvVars.length > 0) {
  throw new Error(`Missing required environment variables: ${missingEnvVars.join(', ')}`)
}

// ===== CORS Configuration =====
app.use(cors({ 
  origin: (origin, callback) => {
    const allowedOrigins = [
      'http://localhost:5173',
      'http://localhost:3001',
      'https://haggle-ai.org',
      process.env.FRONTEND_URL,
    ].filter(Boolean)
    
    if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
      callback(null, true)
    } else {
      callback(new Error('CORS not allowed for: ' + origin))
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
}))
app.use(express.json({ limit: '20mb' }))

// ===== Response Caching Headers =====
app.use((req, res, next) => {
  // Don't cache user-specific data endpoints
  const noCachePaths = ['/api/user/tokens', '/api/auth/', '/api/chats']
  const shouldNotCache = noCachePaths.some(path => req.path.startsWith(path))
  
  if (req.method === 'GET' && !shouldNotCache) {
    res.set('Cache-Control', 'private, max-age=60') // Cache for 1 minute
  } else {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0')
  }
  next()
})

// ===== Rate Limiting =====
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 10 requests per windowMs for auth
  message: 'Too many authentication attempts, please try again later',
  standardHeaders: true, // Return rate limit info in RateLimit-* headers
  legacyHeaders: false, // Disable X-RateLimit-* headers
})

const llmApiKey =
  process.env.LLM_API_KEY ||
  process.env.TINKER_API_KEY ||
  process.env.OPENAI_API_KEY
const llmBaseUrl =
  process.env.LLM_BASE_URL ||
  process.env.TINKER_BASE_URL ||
  process.env.OPENAI_BASE_URL
const llmModel =
  process.env.LLM_MODEL ||
  process.env.TINKER_MODEL ||
  process.env.OPENAI_MODEL

const openai = llmApiKey
  ? new OpenAI({
      apiKey: llmApiKey,
      ...(llmBaseUrl ? { baseURL: llmBaseUrl } : {}),
    })
  : null

const PROJECT_MODES = new Set(['chat', 'negotiation'])

function normalizeMode(inputMode) {
  return PROJECT_MODES.has(inputMode) ? inputMode : 'chat'
}

function systemPromptForMode(mode) {
  if (mode === 'negotiation') {
    return `You are Haggle AI in live negotiation copilot mode.
The user gives what the counterparty said. Reply with:
1) a recommended short reply the user can send/say now,
2) why this works in one sentence,
3) one fallback alternative.
Keep it tactical, concise, and realistic.
Do not output chain-of-thought, hidden reasoning, or <think> tags.`
  }
  return `You are Haggle AI in project setup mode.
Help the user structure a negotiation project by clarifying:
their role (buyer or seller), the target counterpart, what they are negotiating,
constraints, timeline, and desired outcome.
Ask focused follow-up questions and provide clear next steps.
Do not output chain-of-thought, hidden reasoning, or <think> tags.`
}

function sanitizeAssistantOutput(raw) {
  if (typeof raw !== 'string') return ''

  let text = raw.trim()

  // Remove explicit think blocks if a provider leaks them anyway.
  text = text
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/&lt;think&gt;[\s\S]*?&lt;\/think&gt;/gi, '')
    .trim()

  // Cut off common leaked reasoning sections appended after the visible answer.
  const leakageMarkers = [
    /^\s*thinking\s*process\s*:\s*$/im,
    /^\s*analysis\s*:\s*$/im,
    /^\s*analyze\s+the\s+request\s*:\s*$/im,
    /^\s*self-?correction\b/im,
    /^\s*revised\s+plan\s*:\s*$/im,
    /^\s*constructing\s+the\s+output\s*:\s*$/im,
    /^\s*final\s+polish\s*\(adhering\s+to\s+constraints\)\s*:\s*$/im,
  ]

  for (const marker of leakageMarkers) {
    const match = marker.exec(text)
    if (match && typeof match.index === 'number') {
      text = text.slice(0, match.index).trim()
      break
    }
  }

  return text || 'No response generated.'
}

function extractProviderErrorMessage(err) {
  const candidates = [
    err?.error?.message,
    err?.response?.data?.error?.message,
    err?.cause?.error?.message,
    err?.cause?.message,
    err?.message,
  ]
  return candidates.find((v) => typeof v === 'string' && v.trim()) || 'Unknown provider error'
}

// ----- Health (no auth) -----
app.get('/api/health', async (req, res) => {
  try {
    // Test database connectivity by querying the users table
    await db.prepare('SELECT id FROM users LIMIT 1').get()
    res.json({ ok: true, database: 'connected' })
  } catch (err) {
    console.error('Health check - Database unavailable:', err.message)
    res.status(503).json({ 
      ok: false, 
      database: 'disconnected',
      error: 'Database connection failed'
    })
  }
})

// ----- Auth -----
app.post('/api/auth/register', authLimiter, async (req, res) => {
  try {
    const { email, password, name } = req.body
    if (!email?.trim() || !password || !name?.trim()) {
      return res.status(400).json({ error: 'Email, password, and name are required' })
    }
    const existing = await db.prepare('SELECT id FROM users WHERE email = ?').get(email.trim().toLowerCase())
    if (existing) {
      return res.status(400).json({ error: 'Email already registered' })
    }
    const password_hash = await bcrypt.hash(password, 10)
    const result = await db.prepare(
      'INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)'
    ).run(email.trim().toLowerCase(), password_hash, name.trim())
    const user = await db.prepare('SELECT id, email, name FROM users WHERE id = ?').get(result.lastInsertRowid)
    
    // Create free trial token record (1000 tokens for new users)
    await db.prepare(
      'INSERT INTO user_tokens (user_id, total_tokens, tokens_used, tokens_remaining, is_vip) VALUES (?, ?, ?, ?, ?)'
    ).run(user.id, 1000, 0, 1000, 0)
    
    const token = signToken({ userId: user.id, email: user.email })
    res.json({ user: { id: user.id, email: user.email, name: user.name }, token })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Registration failed' })
  }
})

app.post('/api/auth/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body
    if (!email?.trim() || !password) {
      return res.status(400).json({ error: 'Email and password are required' })
    }
    const user = await db.prepare('SELECT id, email, name, password_hash FROM users WHERE email = ?')
      .get(email.trim().toLowerCase())
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }
    const token = signToken({ userId: user.id, email: user.email })
    res.json({
      user: { id: user.id, email: user.email, name: user.name },
      token,
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Login failed' })
  }
})

// ----- Password Reset -----
app.post('/api/auth/forgot-password', authLimiter, async (req, res) => {
  try {
    const { email } = req.body
    if (!email?.trim()) {
      return res.status(400).json({ error: 'Email is required' })
    }

    const user = await db.prepare('SELECT id, email FROM users WHERE email = ?')
      .get(email.trim().toLowerCase())
    
    if (!user) {
      // For security, don't reveal if email exists or not
      return res.json({ message: 'If an account exists, a reset link has been sent' })
    }

    // Generate reset token (30 chars alphanumeric)
    const resetToken = crypto.randomBytes(15).toString('hex').toUpperCase()
    const tokenHash = crypto.createHash('sha256').update(resetToken).digest('hex')
    const expiresAt = new Date(Date.now() + 1 * 60 * 60 * 1000) // 1 hour expiry

    // Delete any existing reset token for this user
    await db.prepare('DELETE FROM password_reset_tokens WHERE user_id = ?').run(user.id)

    // Store reset token
    await db.prepare(
      'INSERT INTO password_reset_tokens (user_id, email, reset_token, token_hash, expires_at) VALUES (?, ?, ?, ?, ?)'
    ).run(user.id, user.email, resetToken, tokenHash, expiresAt.toISOString())

    // In production, send email here with: 
    // const resetUrl = `https://haggle-ai.org/reset-password?token=${resetToken}`
    // await sendEmail(user.email, 'Reset Password', `Click here to reset: ${resetUrl}`)
    
    console.log(`Reset token for ${user.email}: ${resetToken}`)

    res.json({ message: 'If an account exists, a reset link has been sent' })
  } catch (err) {
    console.error('Forgot password error:', err)
    res.status(500).json({ error: 'Failed to process request' })
  }
})

app.post('/api/auth/validate-reset-token', async (req, res) => {
  try {
    const { token } = req.body
    if (!token?.trim()) {
      return res.status(400).json({ error: 'Reset token is required' })
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
    const resetToken = await db.prepare(
      'SELECT id, user_id, expires_at, used_at FROM password_reset_tokens WHERE token_hash = ?'
    ).get(tokenHash)

    if (!resetToken) {
      return res.status(400).json({ error: 'Invalid reset link' })
    }

    if (resetToken.used_at) {
      return res.status(400).json({ error: 'This reset link has already been used' })
    }

    const expiresAt = new Date(resetToken.expires_at)
    if (expiresAt < new Date()) {
      return res.status(400).json({ error: 'This reset link has expired. Please request a new one.' })
    }

    res.json({ valid: true })
  } catch (err) {
    console.error('Validate token error:', err)
    res.status(500).json({ error: 'Failed to validate token' })
  }
})

app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body
    if (!token?.trim() || !password?.trim()) {
      return res.status(400).json({ error: 'Token and password are required' })
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' })
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
    const resetToken = await db.prepare(
      'SELECT id, user_id, expires_at, used_at FROM password_reset_tokens WHERE token_hash = ?'
    ).get(tokenHash)

    if (!resetToken) {
      return res.status(400).json({ error: 'Invalid reset link' })
    }

    if (resetToken.used_at) {
      return res.status(400).json({ error: 'This reset link has already been used' })
    }

    const expiresAt = new Date(resetToken.expires_at)
    if (expiresAt < new Date()) {
      return res.status(400).json({ error: 'This reset link has expired. Please request a new one.' })
    }

    // Hash the new password
    const password_hash = await bcrypt.hash(password, 10)

    // Update user password
    await db.prepare('UPDATE users SET password_hash = ? WHERE id = ?')
      .run(password_hash, resetToken.user_id)

    // Mark token as used
    await db.prepare('UPDATE password_reset_tokens SET used_at = datetime("now") WHERE id = ?')
      .run(resetToken.id)

    res.json({ message: 'Password reset successfully' })
  } catch (err) {
    console.error('Reset password error:', err)
    res.status(500).json({ error: 'Failed to reset password' })
  }
})

// ----- Chats (protected) -----
app.get('/api/chats', authMiddleware, async (req, res) => {
  try {
    // Fetch only necessary columns for projects list
    const chats = await db.prepare(
      'SELECT id, title, category, parent_id, created_at, updated_at FROM chats WHERE user_id = ? AND parent_id IS NULL ORDER BY updated_at DESC'
    ).all(req.userId)
    
    // Fetch children for each project (lightweight query - only metadata)
    const projectsWithChildren = await Promise.all(chats.map(async project => {
      const children = await db.prepare(
        'SELECT id, title, category, parent_id, created_at, updated_at FROM chats WHERE parent_id = ? ORDER BY updated_at DESC'
      ).all(project.id)
      return { ...project, children }
    }))
    
    res.set('Cache-Control', 'private, max-age=60')
    res.json({ chats: projectsWithChildren })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to load projects' })
  }
})

app.post('/api/chats', authMiddleware, async (req, res) => {
  try {
    const { title = 'New project', category = 'project', parent_id = null } = req.body
    const result = await db.prepare(
      'INSERT INTO chats (user_id, title, category, parent_id) VALUES (?, ?, ?, ?)'
    ).run(req.userId, title, category, parent_id || null)
    const chat = await db.prepare(
      'SELECT id, title, category, parent_id, created_at, updated_at FROM chats WHERE id = ?'
    ).get(result.lastInsertRowid)
    res.status(201).json(chat)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to create project' })
  }
})

app.get('/api/chats/:id/children', authMiddleware, async (req, res) => {
  try {
    const project = await db.prepare('SELECT id, user_id FROM chats WHERE id = ?').get(req.params.id)
    if (!project || project.user_id !== req.userId) {
      return res.status(404).json({ error: 'Project not found' })
    }
    
    const children = await db.prepare(
      'SELECT id, title, category, parent_id, created_at, updated_at FROM chats WHERE parent_id = ? ORDER BY updated_at DESC'
    ).all(req.params.id)
    
    res.json({ children })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to load children' })
  }
})

app.get('/api/chats/:id', authMiddleware, async (req, res) => {
  try {
    const mode = normalizeMode(req.query.mode)
    const includeContext = req.query.includeContext === 'true'
    const limit = Math.min(parseInt(req.query.limit) || 50, 200) // Max 200 messages per request
    const offset = Math.max(parseInt(req.query.offset) || 0, 0)
    
    const chat = await db.prepare(
      'SELECT id, title, category, parent_id, created_at, updated_at FROM chats WHERE id = ? AND user_id = ?'
    ).get(req.params.id, req.userId)
    if (!chat) return res.status(404).json({ error: 'Chat not found' })

    let messages = []
    let totalMessageCount = 0

    if (includeContext && mode === 'negotiation') {
      // For negotiation mode, fetch both chat and negotiation messages
      const countResult = await db.prepare(
        `SELECT COUNT(*) as count FROM messages WHERE chat_id = ? AND mode IN ('chat', 'negotiation')`
      ).get(chat.id)
      totalMessageCount = countResult?.count || 0

      messages = await db.prepare(
        `SELECT id, role, mode, content, created_at
         FROM messages
         WHERE chat_id = ? AND mode IN ('chat', 'negotiation')
         ORDER BY created_at DESC
         LIMIT ? OFFSET ?`
      ).all(chat.id, limit, offset)
      
      // Reverse to show oldest first
      messages = messages.reverse()
    } else {
      // For regular mode, fetch only messages in that mode (paginated)
      const countResult = await db.prepare(
        `SELECT COUNT(*) as count FROM messages WHERE chat_id = ? AND mode = ?`
      ).get(chat.id, mode)
      totalMessageCount = countResult?.count || 0

      messages = await db.prepare(
        'SELECT id, role, mode, content, created_at FROM messages WHERE chat_id = ? AND mode = ? ORDER BY created_at DESC LIMIT ? OFFSET ?'
      ).all(chat.id, mode, limit, offset)
      
      // Reverse to show oldest first
      messages = messages.reverse()
    }

    res.set('Cache-Control', 'private, max-age=30')
    res.json({ 
      ...chat, 
      mode, 
      messages,
      pagination: {
        limit,
        offset,
        total: totalMessageCount,
        hasMore: offset + limit < totalMessageCount
      }
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to load chat' })
  }
})

app.patch('/api/chats/:id', authMiddleware, async (req, res) => {
  try {
    const { title } = req.body
    const existing = await db.prepare('SELECT id FROM chats WHERE id = ? AND user_id = ?').get(req.params.id, req.userId)
    if (!existing) return res.status(404).json({ error: 'Chat not found' })
    if (title !== undefined) {
      await db.prepare("UPDATE chats SET title = ?, updated_at = datetime('now') WHERE id = ?").run(title, req.params.id)
    }
    const chat = await db.prepare('SELECT id, title, category, parent_id, created_at, updated_at FROM chats WHERE id = ?').get(req.params.id)
    res.json(chat)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to update chat' })
  }
})

app.delete('/api/chats/:id', authMiddleware, async (req, res) => {
  try {
    const result = await db.prepare('DELETE FROM chats WHERE id = ? AND user_id = ?').run(req.params.id, req.userId)
    if (result.changes === 0) return res.status(404).json({ error: 'Chat not found' })
    res.status(204).send()
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to delete chat' })
  }
})

// ----- Project Metadata / Survey (protected) -----
app.post('/api/chats/:id/metadata', authMiddleware, async (req, res) => {
  try {
    const chatId = req.params.id
    const { item_listing, listed_price, target_price, max_price, ideal_extras, urgency, private_notes, seller_type } = req.body
    
    // Verify chat belongs to user
    const chat = await db.prepare('SELECT id, user_id FROM chats WHERE id = ?').get(chatId)
    if (!chat || chat.user_id !== req.userId) {
      return res.status(404).json({ error: 'Chat not found' })
    }
    
    // Check if metadata already exists for this chat
    const existingMetadata = await db.prepare('SELECT id FROM project_metadata WHERE chat_id = ?').get(chatId)
    
    if (existingMetadata) {
      // Update existing record
      await db.prepare(`
        UPDATE project_metadata 
        SET item_listing = ?, listed_price = ?, target_price = ?, max_price = ?, ideal_extras = ?, urgency = ?, private_notes = ?, seller_type = ?, updated_at = datetime('now')
        WHERE chat_id = ?
      `).run(item_listing || null, listed_price || null, target_price || null, max_price || null, ideal_extras || null, urgency || null, private_notes || null, seller_type || null, chatId)
      
      // Auto-update chat title from item_listing if provided
      if (item_listing?.trim()) {
        const titleFromItem = item_listing.slice(0, 60).trim() + (item_listing.length > 60 ? '...' : '')
        await db.prepare('UPDATE chats SET title = ?, updated_at = datetime("now") WHERE id = ?').run(titleFromItem, chatId)
      }
      
      const metadata = await db.prepare('SELECT * FROM project_metadata WHERE chat_id = ?').get(chatId)
      res.json(metadata)
    } else {
      // Insert new record
      await db.prepare(`
        INSERT INTO project_metadata (chat_id, item_listing, listed_price, target_price, max_price, ideal_extras, urgency, private_notes, seller_type)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(chatId, item_listing || null, listed_price || null, target_price || null, max_price || null, ideal_extras || null, urgency || null, private_notes || null, seller_type || null)
      
      // Auto-update chat title from item_listing if provided
      if (item_listing?.trim()) {
        const titleFromItem = item_listing.slice(0, 60).trim() + (item_listing.length > 60 ? '...' : '')
        await db.prepare('UPDATE chats SET title = ?, updated_at = datetime("now") WHERE id = ?').run(titleFromItem, chatId)
      }
      
      const metadata = await db.prepare('SELECT * FROM project_metadata WHERE chat_id = ?').get(chatId)
      res.status(201).json(metadata)
    }
  } catch (err) {
    console.error('Metadata save error:', err.message, err.stack)
    res.status(500).json({ error: 'Failed to save metadata', details: err.message })
  }
})

app.get('/api/chats/:id/metadata', authMiddleware, async (req, res) => {
  try {
    const chatId = req.params.id
    
    // Verify chat belongs to user
    const chat = await db.prepare('SELECT id, user_id FROM chats WHERE id = ?').get(chatId)
    if (!chat || chat.user_id !== req.userId) {
      return res.status(404).json({ error: 'Chat not found' })
    }
    
    const metadata = await db.prepare('SELECT * FROM project_metadata WHERE chat_id = ?').get(chatId)
    res.json(metadata || null)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to load metadata' })
  }
})

// ----- Send message + LLM (protected) -----
app.post('/api/chats/:id/messages', authMiddleware, async (req, res) => {
  try {
    const chatId = req.params.id
    const { content, model: modelId, mode: requestedMode, images } = req.body
    const mode = normalizeMode(requestedMode)

    // Validate and sanitize images
    const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp'])
    const sanitizedImages = []
    if (Array.isArray(images)) {
      for (const img of images) {
        if (typeof img !== 'string') continue
        const match = img.match(/^data:(image\/[a-z+]+);base64,/)
        if (!match || !ALLOWED_TYPES.has(match[1])) continue
        if (img.length > 5_000_000) continue // ~3.75MB binary limit
        sanitizedImages.push(img)
        if (sanitizedImages.length >= 4) break
      }
    }
    const hasImages = sanitizedImages.length > 0

    if (!content?.trim() && !hasImages) {
      return res.status(400).json({ error: 'Message content or image is required' })
    }
    const chat = await db.prepare('SELECT id, title FROM chats WHERE id = ? AND user_id = ?').get(chatId, req.userId)
    if (!chat) return res.status(404).json({ error: 'Chat not found' })

    const textContent = content?.trim() || ''
    const userInsert = await db
      .prepare('INSERT INTO messages (chat_id, role, mode, content) VALUES (?, ?, ?, ?)')
      .run(chatId, 'user', mode, textContent)

    // Fetch history excluding the just-inserted message, then append current turn
    const historyForLlm = await db.prepare(
      'SELECT role, content FROM messages WHERE chat_id = ? AND mode = ? AND id != ? ORDER BY created_at ASC'
    ).all(chatId, mode, userInsert.lastInsertRowid)

    const currentUserContent = hasImages
      ? [
          { type: 'text', text: textContent || 'Please analyze the attached image.' },
          ...sanitizedImages.map((url) => ({ type: 'image_url', image_url: { url } })),
        ]
      : textContent

    const messagesForLlm = [
      ...historyForLlm.map((m) => ({ role: m.role, content: m.content })),
      { role: 'user', content: currentUserContent },
    ]

    const isTinker = llmBaseUrl && llmBaseUrl.includes('tinker')

    let assistantContent
    let imageFallbackUsed = false
    if (openai) {
      try {
        const model = llmModel || modelId || 'gpt-4o-mini'
        if (isTinker) {
          // Debug: log request structure for vision requests
          if (hasImages) {
            console.log('Sending vision request to Tinker with structure:', {
              model,
              messageCount: messagesForLlm.length,
              firstMessageContentType: typeof messagesForLlm[0]?.content,
              hasImageUrls: Array.isArray(messagesForLlm[0]?.content) ? 'yes' : 'no',
            })
          }
          
          const completion = await openai.chat.completions.create({
            model,
            messages: [
              { role: 'system', content: systemPromptForMode(mode) },
              ...messagesForLlm.map((m) => ({ role: m.role, content: m.content })),
            ],
            max_tokens: 1400,
            temperature: 0.7,
          })
          assistantContent = completion.choices[0]?.message?.content?.trim() || 'No response generated.'
        } else {
          const completion = await openai.chat.completions.create({
            model,
            messages: [
              { role: 'system', content: systemPromptForMode(mode) },
              ...messagesForLlm.map((m) => ({ role: m.role, content: m.content })),
            ],
            max_tokens: 1400,
          })
          assistantContent = completion.choices[0]?.message?.content?.trim() || 'No response generated.'
        }
      } catch (err) {
        const msg = extractProviderErrorMessage(err)
        const status = err?.status || err?.statusCode
        console.error('LLM provider error:', err)

        // If 422 with images, retry without images (Tinker may not support data: URLs)
        if (status === 422 && hasImages && !imageFallbackUsed) {
          console.log('⚠️  Retrying without images - Tinker may not support base64 data URLs')
          imageFallbackUsed = true
          try {
            const model = llmModel || modelId || 'gpt-4o-mini'
            const messagesWithoutImages = [
              ...historyForLlm.map((m) => ({ role: m.role, content: m.content })),
              { 
                role: 'user', 
                content: textContent || '[Image received but model does not support vision]' 
            },
          ]
          
          const completion = await openai.chat.completions.create({
            model,
            messages: [
              { role: 'system', content: systemPromptForMode(mode) },
              ...messagesWithoutImages,
            ],
            max_tokens: 1400,
            temperature: 0.7,
          })
          assistantContent = completion.choices[0]?.message?.content?.trim() || 'No response generated.'
        } catch (retryErr) {
          const retryMsg = extractProviderErrorMessage(retryErr)
          const activeModel = llmModel || modelId || 'unknown-model'
          assistantContent = `⚠️ Vision not supported: Your image couldn't be processed. The model (${activeModel}) may not support base64 images via this provider. Error: ${retryMsg}`
        }
      } else {
        const activeModel = llmModel || modelId || 'unknown-model'
        if (status === 422 && hasImages) {
          assistantContent = `⚠️ Vision error: The model (${activeModel}) rejected image input. Possible causes:\n• Model doesn't support data: URLs (embedded base64 images)\n• Tinker API requires publicly accessible image URLs\n• Image format or encoding issue\n\nTry sending text only or check model documentation.`
        } else {
          assistantContent = `Tinker API error${status ? ` (${status})` : ''}: ${msg}. Check server console for details.`
        }
      }

      console.error('LLM request summary:', {
        status,
        model: llmModel || modelId || 'unknown-model',
        hasImages,
        imageCount: sanitizedImages.length,
        textLength: textContent.length,
      })
    }
  } else {
    assistantContent = 'Haggle AI demo: configure your LLM provider in server/.env (for Tinker, set TINKER_API_KEY and optionally TINKER_BASE_URL / TINKER_MODEL).'
  }

    assistantContent = sanitizeAssistantOutput(assistantContent)

    const assistantInsert = await db
      .prepare('INSERT INTO messages (chat_id, role, mode, content) VALUES (?, ?, ?, ?)')
      .run(chatId, 'assistant', mode, assistantContent)

    await db.prepare("UPDATE chats SET updated_at = datetime('now') WHERE id = ?").run(chatId)
    
    // Auto-rename ONLY if this is a project (not nested chat) with default title "New project"
    // This only happens for the main project on first use, not for nested chats
    const isProject = chat.parent_id === null
    const titleSource = textContent || (hasImages ? '[Image]' : '')
    if (isProject && chat.title === 'New project' && titleSource) {
      const firstLine = titleSource.slice(0, 50).trim() + (titleSource.length > 50 ? '...' : '')
      await db.prepare('UPDATE chats SET title = ? WHERE id = ?').run(firstLine, chatId)
    }

    const userMsg = await db
      .prepare('SELECT id, role, mode, content, created_at FROM messages WHERE id = ?')
      .get(userInsert.lastInsertRowid)
    const assistantMsg = await db
      .prepare('SELECT id, role, mode, content, created_at FROM messages WHERE id = ?')
      .get(assistantInsert.lastInsertRowid)
    const updatedChat = await db.prepare('SELECT title FROM chats WHERE id = ?').get(chatId)
    
    res.status(201).json({
      userMessage: { id: userMsg.id, role: 'user', mode: userMsg.mode, content: userMsg.content, created_at: userMsg.created_at },
      assistantMessage: { id: assistantMsg.id, role: 'assistant', mode: assistantMsg.mode, content: assistantMsg.content, created_at: assistantMsg.created_at },
      mode,
      chatTitle: updatedChat.title,
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to send message' })
  }
})

// ----- Token & VIP System (protected) -----

// Redeem VIP code and allocate tokens
app.post('/api/auth/redeem-vip-code', authMiddleware, async (req, res) => {
  try {
    const { code } = req.body
    if (!code?.trim()) {
      return res.status(400).json({ error: 'VIP code is required' })
    }

    const vipCode = await db.prepare(
      'SELECT id, token_allowance, is_used, used_by_user_id FROM vip_codes WHERE code = ?'
    ).get(code.trim().toUpperCase())

    if (!vipCode) {
      return res.status(404).json({ error: 'VIP code not found' })
    }

    if (vipCode.is_used) {
      return res.status(400).json({ error: 'This VIP code has already been used' })
    }

    // Check if user already has VIP status
    const existingTokens = await db.prepare(
      'SELECT id, is_vip, tokens_remaining FROM user_tokens WHERE user_id = ?'
    ).get(req.userId)

    if (existingTokens && existingTokens.is_vip) {
      return res.status(400).json({ error: 'Your account already has VIP access' })
    }

    // Mark code as used
    await db.prepare(
      'UPDATE vip_codes SET is_used = 1, used_by_user_id = ?, used_at = datetime("now") WHERE id = ?'
    ).run(req.userId, vipCode.id)

    // Create or update token record
    if (existingTokens) {
      // Update existing (add VIP tokens to balance)
      await db.prepare(
        'UPDATE user_tokens SET is_vip = 1, vip_code_id = ?, tokens_remaining = tokens_remaining + ?, updated_at = datetime("now") WHERE user_id = ?'
      ).run(vipCode.id, vipCode.token_allowance, req.userId)
    } else {
      // Create new VIP token record
      await db.prepare(
        'INSERT INTO user_tokens (user_id, total_tokens, tokens_used, tokens_remaining, vip_code_id, is_vip) VALUES (?, ?, ?, ?, ?, ?)'
      ).run(req.userId, vipCode.token_allowance, 0, vipCode.token_allowance, vipCode.id, 1)
    }

    const updatedTokens = await db.prepare(
      'SELECT * FROM user_tokens WHERE user_id = ?'
    ).get(req.userId)

    res.json({
      message: 'VIP code redeemed successfully!',
      tokens: updatedTokens
    })
  } catch (err) {
    console.error('VIP redemption error:', err)
    res.status(500).json({ error: 'Failed to redeem VIP code' })
  }
})

// Get user's token balance
app.get('/api/user/tokens', authMiddleware, async (req, res) => {
  try {
    let userTokens = await db.prepare(
      'SELECT * FROM user_tokens WHERE user_id = ?'
    ).get(req.userId)

    // If no token record exists, create a free trial record
    if (!userTokens) {
      await db.prepare(
        'INSERT INTO user_tokens (user_id, total_tokens, tokens_used, tokens_remaining, is_vip) VALUES (?, ?, ?, ?, ?)'
      ).run(req.userId, 1000, 0, 1000, 0)
      userTokens = await db.prepare(
        'SELECT * FROM user_tokens WHERE user_id = ?'
      ).get(req.userId)
    }

    res.json(userTokens)
  } catch (err) {
    console.error('Get tokens error:', err)
    res.status(500).json({ error: 'Failed to fetch token balance' })
  }
})

// Submit user feedback
app.post('/api/feedback', authMiddleware, async (req, res) => {
  try {
    const { category = 'general', rating, message, contact_email } = req.body

    if (!message?.trim()) {
      return res.status(400).json({ error: 'Feedback message is required' })
    }

    const validCategories = ['bug', 'feature_request', 'general', 'ui/ux']
    const feedbackCategory = validCategories.includes(category) ? category : 'general'

    const result = await db.prepare(
      'INSERT INTO feedback (user_id, category, rating, message, contact_email) VALUES (?, ?, ?, ?, ?)'
    ).run(req.userId, feedbackCategory, rating || null, message.trim(), contact_email?.trim() || null)

    const feedback = await db.prepare(
      'SELECT id, user_id, category, rating, message, contact_email, created_at FROM feedback WHERE id = ?'
    ).get(result.lastInsertRowid)

    res.status(201).json({
      message: 'Thank you for your feedback!',
      feedback
    })
  } catch (err) {
    console.error('Feedback submission error:', err)
    res.status(500).json({ error: 'Failed to submit feedback' })
  }
})

app.listen(PORT, () => {
  console.log(`Haggle API running at http://localhost:${PORT}`)
  if (openai) {
    console.log(`LLM connected${llmBaseUrl ? ` via ${llmBaseUrl}` : ''}${llmModel ? ` with model ${llmModel}` : ''}.`)
  } else {
    console.log('No LLM_API_KEY / TINKER_API_KEY / OPENAI_API_KEY set — using placeholder responses.')
  }
})
