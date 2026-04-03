import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import rateLimit from 'express-rate-limit'
import bcrypt from 'bcryptjs'
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

const PROJECT_MODES = new Set(['chat', 'negotiation', 'practice'])

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
  if (mode === 'practice') {
    return `You are Haggle AI in role-play practice mode.
Act as the user's counterparty in a realistic negotiation simulation.
Stay in character, push back naturally, and help the user practice.
After each turn, add a brief coaching tip in one sentence.
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
    // Test database connectivity
    await db.prepare('SELECT 1').get()
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
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.trim().toLowerCase())
    if (existing) {
      return res.status(400).json({ error: 'Email already registered' })
    }
    const password_hash = await bcrypt.hash(password, 10)
    const result = db.prepare(
      'INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)'
    ).run(email.trim().toLowerCase(), password_hash, name.trim())
    const user = db.prepare('SELECT id, email, name FROM users WHERE id = ?').get(result.lastInsertRowid)
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
    const user = db.prepare('SELECT id, email, name, password_hash FROM users WHERE email = ?')
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

// ----- Chats (protected) -----
app.get('/api/chats', authMiddleware, (req, res) => {
  const chats = db.prepare(
    'SELECT id, title, category, parent_id, created_at, updated_at FROM chats WHERE user_id = ? AND parent_id IS NULL ORDER BY updated_at DESC'
  ).all(req.userId)
  
  // Fetch children for each project
  const projectsWithChildren = chats.map(project => {
    const children = db.prepare(
      'SELECT id, title, category, parent_id, created_at, updated_at FROM chats WHERE parent_id = ? ORDER BY updated_at DESC'
    ).all(project.id)
    return { ...project, children }
  })
  
  res.json({ chats: projectsWithChildren })
})

app.post('/api/chats', authMiddleware, (req, res) => {
  const { title = 'New project', category = 'project', parent_id = null } = req.body
  const result = db.prepare(
    'INSERT INTO chats (user_id, title, category, parent_id) VALUES (?, ?, ?, ?)'
  ).run(req.userId, title, category, parent_id || null)
  const chat = db.prepare(
    'SELECT id, title, category, parent_id, created_at, updated_at FROM chats WHERE id = ?'
  ).get(result.lastInsertRowid)
  res.status(201).json(chat)
})

app.get('/api/chats/:id/children', authMiddleware, (req, res) => {
  const project = db.prepare('SELECT id, user_id FROM chats WHERE id = ?').get(req.params.id)
  if (!project || project.user_id !== req.userId) {
    return res.status(404).json({ error: 'Project not found' })
  }
  
  const children = db.prepare(
    'SELECT id, title, category, parent_id, created_at, updated_at FROM chats WHERE parent_id = ? ORDER BY updated_at DESC'
  ).all(req.params.id)
  
  res.json({ children })
})

app.get('/api/chats/:id', authMiddleware, (req, res) => {
  const mode = normalizeMode(req.query.mode)
  const includeContext = req.query.includeContext === 'true'
  const chat = db.prepare(
    'SELECT id, title, category, parent_id, created_at, updated_at FROM chats WHERE id = ? AND user_id = ?'
  ).get(req.params.id, req.userId)
  if (!chat) return res.status(404).json({ error: 'Chat not found' })

  const messages = includeContext && mode === 'negotiation'
    ? db.prepare(
      `SELECT id, role, mode, content, created_at
       FROM messages
       WHERE chat_id = ? AND mode IN ('chat', 'negotiation')
       ORDER BY created_at ASC, id ASC`
    ).all(chat.id)
    : db.prepare(
      'SELECT id, role, mode, content, created_at FROM messages WHERE chat_id = ? AND mode = ? ORDER BY created_at ASC, id ASC'
    ).all(chat.id, mode)

  res.json({ ...chat, mode, messages })
})

app.patch('/api/chats/:id', authMiddleware, (req, res) => {
  const { title } = req.body
  const existing = db.prepare('SELECT id FROM chats WHERE id = ? AND user_id = ?').get(req.params.id, req.userId)
  if (!existing) return res.status(404).json({ error: 'Chat not found' })
  if (title !== undefined) {
    db.prepare("UPDATE chats SET title = ?, updated_at = datetime('now') WHERE id = ?").run(title, req.params.id)
  }
  const chat = db.prepare('SELECT id, title, category, parent_id, created_at, updated_at FROM chats WHERE id = ?').get(req.params.id)
  res.json(chat)
})

app.delete('/api/chats/:id', authMiddleware, (req, res) => {
  const result = db.prepare('DELETE FROM chats WHERE id = ? AND user_id = ?').run(req.params.id, req.userId)
  if (result.changes === 0) return res.status(404).json({ error: 'Chat not found' })
  res.status(204).send()
})

// ----- Project Metadata / Survey (protected) -----
app.post('/api/chats/:id/metadata', authMiddleware, (req, res) => {
  const chatId = req.params.id
  const { item_listing, listed_price, target_price, max_price, ideal_extras, urgency, private_notes, seller_type } = req.body
  
  // Verify chat belongs to user
  const chat = db.prepare('SELECT id, user_id FROM chats WHERE id = ?').get(chatId)
  if (!chat || chat.user_id !== req.userId) {
    return res.status(404).json({ error: 'Chat not found' })
  }
  
  try {
    db.prepare(`
      INSERT INTO project_metadata (chat_id, item_listing, listed_price, target_price, max_price, ideal_extras, urgency, private_notes, seller_type)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(chatId, item_listing || null, listed_price || null, target_price || null, max_price || null, ideal_extras || null, urgency || null, private_notes || null, seller_type || null)
    
    const metadata = db.prepare('SELECT * FROM project_metadata WHERE chat_id = ?').get(chatId)
    res.status(201).json(metadata)
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      // Update if exists
      db.prepare(`
        UPDATE project_metadata 
        SET item_listing = ?, listed_price = ?, target_price = ?, max_price = ?, ideal_extras = ?, urgency = ?, private_notes = ?, seller_type = ?, updated_at = datetime('now')
        WHERE chat_id = ?
      `).run(item_listing || null, listed_price || null, target_price || null, max_price || null, ideal_extras || null, urgency || null, private_notes || null, seller_type || null, chatId)
      
      const metadata = db.prepare('SELECT * FROM project_metadata WHERE chat_id = ?').get(chatId)
      res.json(metadata)
    } else {
      throw err
    }
  }
})

app.get('/api/chats/:id/metadata', authMiddleware, (req, res) => {
  const chatId = req.params.id
  
  // Verify chat belongs to user
  const chat = db.prepare('SELECT id, user_id FROM chats WHERE id = ?').get(chatId)
  if (!chat || chat.user_id !== req.userId) {
    return res.status(404).json({ error: 'Chat not found' })
  }
  
  const metadata = db.prepare('SELECT * FROM project_metadata WHERE chat_id = ?').get(chatId)
  res.json(metadata || null)
})

// ----- Send message + LLM (protected) -----
app.post('/api/chats/:id/messages', authMiddleware, async (req, res) => {
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
  const chat = db.prepare('SELECT id, title FROM chats WHERE id = ? AND user_id = ?').get(chatId, req.userId)
  if (!chat) return res.status(404).json({ error: 'Chat not found' })

  const textContent = content?.trim() || ''
  const userInsert = db
    .prepare('INSERT INTO messages (chat_id, role, mode, content) VALUES (?, ?, ?, ?)')
    .run(chatId, 'user', mode, textContent)

  // Fetch history excluding the just-inserted message, then append current turn
  const historyForLlm = db.prepare(
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

  const assistantInsert = db
    .prepare('INSERT INTO messages (chat_id, role, mode, content) VALUES (?, ?, ?, ?)')
    .run(chatId, 'assistant', mode, assistantContent)

  db.prepare("UPDATE chats SET updated_at = datetime('now') WHERE id = ?").run(chatId)
  const titleSource = textContent || (hasImages ? '[Image]' : '')
  if (chat.title === 'New project' && titleSource) {
    const firstLine = titleSource.slice(0, 50).trim() + (titleSource.length > 50 ? '...' : '')
    db.prepare('UPDATE chats SET title = ? WHERE id = ?').run(firstLine, chatId)
  }

  const userMsg = db
    .prepare('SELECT id, role, mode, content, created_at FROM messages WHERE id = ?')
    .get(userInsert.lastInsertRowid)
  const assistantMsg = db
    .prepare('SELECT id, role, mode, content, created_at FROM messages WHERE id = ?')
    .get(assistantInsert.lastInsertRowid)
  res.status(201).json({
    userMessage: { id: userMsg.id, role: 'user', mode: userMsg.mode, content: userMsg.content, created_at: userMsg.created_at },
    assistantMessage: { id: assistantMsg.id, role: 'assistant', mode: assistantMsg.mode, content: assistantMsg.content, created_at: assistantMsg.created_at },
    mode,
    chatTitle: db.prepare('SELECT title FROM chats WHERE id = ?').get(chatId).title,
  })
})

app.listen(PORT, () => {
  console.log(`Haggle API running at http://localhost:${PORT}`)
  if (openai) {
    console.log(`LLM connected${llmBaseUrl ? ` via ${llmBaseUrl}` : ''}${llmModel ? ` with model ${llmModel}` : ''}.`)
  } else {
    console.log('No LLM_API_KEY / TINKER_API_KEY / OPENAI_API_KEY set — using placeholder responses.')
  }
})
