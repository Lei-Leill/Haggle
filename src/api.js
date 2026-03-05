// In dev, use same origin so Vite proxy can forward /api to the backend.
const API_BASE = import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? '' : 'http://localhost:3001')
const SERVER_UNREACHABLE = "Can't reach the server. Start the backend: cd server && npm run dev"

function getToken() {
  return localStorage.getItem('haggle_token')
}

function getHeaders(includeAuth = true) {
  const headers = { 'Content-Type': 'application/json' }
  if (includeAuth) {
    const token = getToken()
    if (token) headers.Authorization = `Bearer ${token}`
  }
  return headers
}

function normalizeError(err) {
  if (err instanceof TypeError && err.message === 'Failed to fetch') {
    return new Error(SERVER_UNREACHABLE)
  }
  return err
}

async function parseResponse(res, fallbackError) {
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data.error || fallbackError)
  }
  return data
}

export async function register({ email, password, name }) {
  try {
    const res = await fetch(`${API_BASE}/api/auth/register`, {
      method: 'POST',
      headers: getHeaders(false),
      body: JSON.stringify({ email, password, name }),
    })
    return await parseResponse(res, 'Registration failed')
  } catch (err) {
    throw normalizeError(err)
  }
}

export async function login({ email, password }) {
  try {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: getHeaders(false),
      body: JSON.stringify({ email, password }),
    })
    return await parseResponse(res, 'Login failed')
  } catch (err) {
    throw normalizeError(err)
  }
}

export async function getChats() {
  try {
    const res = await fetch(`${API_BASE}/api/chats`, { headers: getHeaders() })
    const data = await parseResponse(res, 'Failed to load projects')
    return data.chats
  } catch (err) {
    throw normalizeError(err)
  }
}

export async function createChat({ title = 'New project', category = 'project' } = {}) {
  try {
    const res = await fetch(`${API_BASE}/api/chats`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ title, category }),
    })
    return await parseResponse(res, 'Failed to create project')
  } catch (err) {
    throw normalizeError(err)
  }
}

export async function getChat(id, mode = 'chat') {
  try {
    const query = `?mode=${encodeURIComponent(mode)}`
    const res = await fetch(`${API_BASE}/api/chats/${id}${query}`, { headers: getHeaders() })
    return await parseResponse(res, 'Failed to load project')
  } catch (err) {
    throw normalizeError(err)
  }
}

export async function updateChatTitle(id, title) {
  try {
    const res = await fetch(`${API_BASE}/api/chats/${id}`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify({ title }),
    })
    return await parseResponse(res, 'Failed to update project')
  } catch (err) {
    throw normalizeError(err)
  }
}

export async function deleteChat(id) {
  try {
    const res = await fetch(`${API_BASE}/api/chats/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    })
    if (!res.ok) {
      await parseResponse(res, 'Failed to delete project')
    }
  } catch (err) {
    throw normalizeError(err)
  }
}

export async function sendMessage(chatId, content, model, mode = 'chat') {
  try {
    const res = await fetch(`${API_BASE}/api/chats/${chatId}/messages`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ content, model, mode }),
    })
    return await parseResponse(res, 'Failed to send message')
  } catch (err) {
    throw normalizeError(err)
  }
}

export function setToken(token) {
  if (token) localStorage.setItem('haggle_token', token)
  else localStorage.removeItem('haggle_token')
}
