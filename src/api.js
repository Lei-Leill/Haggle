// In dev with Vite, use empty string so proxy forwards to backend
// In production, use VITE_API_URL environment variable
const API_BASE = (() => {
  const apiUrl = import.meta.env.VITE_API_URL
  const isDev = import.meta.env.DEV
  
  // Log for debugging
  console.log('API Config:', {
    VITE_API_URL: apiUrl,
    isDev: isDev,
    finalAPI_BASE: apiUrl || (isDev ? '' : undefined)
  })
  
  // In dev, use empty string to leverage Vite proxy
  if (isDev) return ''
  
  // In production, MUST use the env var
  if (!apiUrl) {
    console.error('VITE_API_URL environment variable is not set in production!')
  }
  
  return apiUrl || ''
})()

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
  if (res.status === 401) {
    setToken(null)
    localStorage.removeItem('haggle_user')
    window.dispatchEvent(new CustomEvent('auth:unauthorized'))
    throw new Error(data.error || 'Session expired. Please sign in again.')
  }
  if (!res.ok) {
    const error = new Error(data.error || fallbackError)
    error.code = data.code
    error.status = res.status
    error.details = data
    throw error
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

export async function createChat({ title = 'New project', category = 'project', parent_id = null } = {}) {
  try {
    const res = await fetch(`${API_BASE}/api/chats`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ title, category, parent_id: parent_id || null }),
    })
    return await parseResponse(res, 'Failed to create project')
  } catch (err) {
    throw normalizeError(err)
  }
}

export async function getChatChildren(id) {
  try {
    const res = await fetch(`${API_BASE}/api/chats/${id}/children`, { headers: getHeaders() })
    const data = await parseResponse(res, 'Failed to load chats')
    return data.children || []
  } catch (err) {
    throw normalizeError(err)
  }
}

export async function getChat(id, mode = 'chat', includeContext = false, limit = 50, offset = 0) {
  try {
    const query = `?mode=${encodeURIComponent(mode)}&includeContext=${includeContext ? 'true' : 'false'}&limit=${limit}&offset=${offset}`
    const res = await fetch(`${API_BASE}/api/chats/${id}${query}`, { headers: getHeaders() })
    return await parseResponse(res, 'Failed to load project')
  } catch (err) {
    throw normalizeError(err)
  }
}

export async function loadEarlierMessages(id, mode = 'chat', offset) {
  try {
    const query = `?mode=${encodeURIComponent(mode)}&includeContext=false&limit=50&offset=${offset}`
    const res = await fetch(`${API_BASE}/api/chats/${id}${query}`, { headers: getHeaders() })
    const data = await parseResponse(res, 'Failed to load earlier messages')
    return {
      messages: data.messages,
      pagination: data.pagination,
    }
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

export async function sendMessage(chatId, content, model, mode = 'chat', images = []) {
  try {
    const res = await fetch(`${API_BASE}/api/chats/${chatId}/messages`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ content, model, mode, images }),
    })
    return await parseResponse(res, 'Failed to send message')
  } catch (err) {
    throw normalizeError(err)
  }
}

export async function saveProjectMetadata(chatId, metadata) {
  try {
    const res = await fetch(`${API_BASE}/api/chats/${chatId}/metadata`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(metadata),
    })
    return await parseResponse(res, 'Failed to save project info')
  } catch (err) {
    throw normalizeError(err)
  }
}

export async function getProjectMetadata(chatId) {
  try {
    const res = await fetch(`${API_BASE}/api/chats/${chatId}/metadata`, { headers: getHeaders() })
    const data = await parseResponse(res, 'Failed to load project info')
    return data
  } catch (err) {
    throw normalizeError(err)
  }
}

export async function getUserTokens() {
  try {
    const res = await fetch(`${API_BASE}/api/user/tokens`, { headers: getHeaders() })
    return await parseResponse(res, 'Failed to fetch token balance')
  } catch (err) {
    throw normalizeError(err)
  }
}

export async function requestTokenTrial(email) {
  try {
    const res = await fetch(`${API_BASE}/api/token-trial-request`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ email }),
    })
    return await parseResponse(res, 'Failed to submit token trial request')
  } catch (err) {
    throw normalizeError(err)
  }
}

export function setToken(token) {
  if (token) localStorage.setItem('haggle_token', token)
  else localStorage.removeItem('haggle_token')
}
