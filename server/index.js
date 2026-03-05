import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import bcrypt from 'bcryptjs'
import db from './db.js'
import { signToken, authMiddleware } from './auth.js'
import OpenAI from 'openai'

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors({ origin: true, credentials: true }))
app.use(express.json())

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
Keep it tactical, concise, and realistic.`
  }
  if (mode === 'practice') {
    return `You are Haggle AI in role-play practice mode.
Act as the user's counterparty in a realistic negotiation simulation.
Stay in character, push back naturally, and help the user practice.
After each turn, add a brief coaching tip in one sentence.`
  }
  return `You are Haggle AI in project setup mode.
Help the user structure a negotiation project by clarifying:
their role (buyer or seller), the target counterpart, what they are negotiating,
constraints, timeline, and desired outcome.
Ask focused follow-up questions and provide clear next steps.`
}

// ----- Auth -----
app.post('/api/auth/register', async (req, res) => {
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

app.post('/api/auth/login', async (req, res) => {
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
    'SELECT id, title, category, created_at, updated_at FROM chats WHERE user_id = ? ORDER BY updated_at DESC'
  ).all(req.userId)
  res.json({ chats })
})

app.post('/api/chats', authMiddleware, (req, res) => {
  const { title = 'New project', category = 'project' } = req.body
  const result = db.prepare(
    'INSERT INTO chats (user_id, title, category) VALUES (?, ?, ?)'
  ).run(req.userId, title, category)
  const chat = db.prepare(
    'SELECT id, title, category, created_at, updated_at FROM chats WHERE id = ?'
  ).get(result.lastInsertRowid)
  res.status(201).json(chat)
})

app.get('/api/chats/:id', authMiddleware, (req, res) => {
  const mode = normalizeMode(req.query.mode)
  const chat = db.prepare(
    'SELECT id, title, category, created_at, updated_at FROM chats WHERE id = ? AND user_id = ?'
  ).get(req.params.id, req.userId)
  if (!chat) return res.status(404).json({ error: 'Chat not found' })
  const messages = db.prepare(
    'SELECT id, role, mode, content, created_at FROM messages WHERE chat_id = ? AND mode = ? ORDER BY created_at ASC'
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
  const chat = db.prepare('SELECT id, title, category, created_at, updated_at FROM chats WHERE id = ?').get(req.params.id)
  res.json(chat)
})

app.delete('/api/chats/:id', authMiddleware, (req, res) => {
  const result = db.prepare('DELETE FROM chats WHERE id = ? AND user_id = ?').run(req.params.id, req.userId)
  if (result.changes === 0) return res.status(404).json({ error: 'Chat not found' })
  res.status(204).send()
})

// ----- Send message + LLM (protected) -----
app.post('/api/chats/:id/messages', authMiddleware, async (req, res) => {
  const chatId = req.params.id
  const { content, model: modelId, mode: requestedMode } = req.body
  const mode = normalizeMode(requestedMode)
  if (!content?.trim()) {
    return res.status(400).json({ error: 'Message content is required' })
  }
  const chat = db.prepare('SELECT id, title FROM chats WHERE id = ? AND user_id = ?').get(chatId, req.userId)
  if (!chat) return res.status(404).json({ error: 'Chat not found' })

  db.prepare('INSERT INTO messages (chat_id, role, mode, content) VALUES (?, ?, ?, ?)').run(chatId, 'user', mode, content.trim())

  const messagesForLlm = db.prepare(
    'SELECT role, content FROM messages WHERE chat_id = ? AND mode = ? ORDER BY created_at ASC'
  ).all(chatId, mode)

  const isTinker = llmBaseUrl && llmBaseUrl.includes('tinker')

  let assistantContent
  if (openai) {
    try {
      const model = llmModel || modelId || 'gpt-4o-mini'
      if (isTinker) {
        // Tinker docs use completions API with prompt; chat template may not match our checkpoint
        const sys = systemPromptForMode(mode)
        const prompt = messagesForLlm.reduce((acc, m) => {
          if (m.role === 'system') return acc + `System: ${m.content}\n\n`
          if (m.role === 'user') return acc + `User: ${m.content}\n\n`
          return acc + `Assistant: ${m.content}\n\n`
        }, `System: ${sys}\n\n`)
        const completion = await openai.completions.create({
          model,
          prompt: prompt + 'Assistant:',
          max_tokens: 512,
          temperature: 0.7,
          top_p: 0.9,
        })
        assistantContent = completion.choices[0]?.text?.trim() || 'No response generated.'
      } else {
        const completion = await openai.chat.completions.create({
          model,
          messages: [
            { role: 'system', content: systemPromptForMode(mode) },
            ...messagesForLlm.map((m) => ({ role: m.role, content: m.content })),
          ],
        })
        assistantContent = completion.choices[0]?.message?.content?.trim() || 'No response generated.'
      }
    } catch (err) {
      console.error('LLM provider error:', err)
      assistantContent = 'Sorry, the AI service is temporarily unavailable. Please check your API key and try again.'
    }
  } else {
    assistantContent = 'Haggle AI demo: configure your LLM provider in server/.env (for Tinker, set TINKER_API_KEY and optionally TINKER_BASE_URL / TINKER_MODEL).'
  }

  db.prepare(
    'INSERT INTO messages (chat_id, role, mode, content) VALUES (?, ?, ?, ?)'
  ).run(chatId, 'assistant', mode, assistantContent)

  db.prepare("UPDATE chats SET updated_at = datetime('now') WHERE id = ?").run(chatId)
  if (chat.title === 'New project') {
    const firstLine = content.slice(0, 50).trim() + (content.length > 50 ? '...' : '')
    db.prepare('UPDATE chats SET title = ? WHERE id = ?').run(firstLine, chatId)
  }

  const recent = db.prepare(
    'SELECT id, role, mode, content, created_at FROM messages WHERE chat_id = ? AND mode = ? ORDER BY created_at DESC LIMIT 2'
  ).all(chatId, mode)
  const [assistantMsg, userMsg] = recent.reverse()
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
