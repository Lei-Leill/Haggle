/**
 * Frontend caching layer to reduce API calls and improve perceived performance
 */

const CACHE_KEYS = {
  PROJECTS: 'haggle_projects_cache',
  MESSAGES: 'haggle_messages_cache',
  METADATA: 'haggle_metadata_cache',
}

const CACHE_TTL = {
  PROJECTS: 5 * 60 * 1000, // 5 minutes
  MESSAGES: 30 * 60 * 1000, // 30 minutes (messages change less frequently during a session)
  METADATA: 30 * 60 * 1000, // 30 minutes
}

function getCacheWithTTL(key) {
  try {
    const cached = localStorage.getItem(key)
    if (!cached) return null

    const { data, timestamp } = JSON.parse(cached)
    const ttl = CACHE_TTL[key] || 60 * 1000

    if (Date.now() - timestamp > ttl) {
      localStorage.removeItem(key)
      return null
    }

    return data
  } catch (err) {
    console.warn('Cache read error:', err)
    return null
  }
}

function setCacheWithTTL(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }))
  } catch (err) {
    console.warn('Cache write error:', err)
  }
}

function invalidateCache(pattern) {
  try {
    const keys = Object.keys(localStorage)
    keys.forEach((key) => {
      if (key.includes(pattern)) {
        localStorage.removeItem(key)
      }
    })
  } catch (err) {
    console.warn('Cache invalidation error:', err)
  }
}

export const messageCache = {
  get(chatId, mode = 'chat') {
    return getCacheWithTTL(`${CACHE_KEYS.MESSAGES}_${chatId}_${mode}`)
  },

  set(chatId, mode, messages) {
    setCacheWithTTL(`${CACHE_KEYS.MESSAGES}_${chatId}_${mode}`, messages)
  },

  invalidate(chatId) {
    invalidateCache(`${CACHE_KEYS.MESSAGES}_${chatId}`)
  },

  invalidateAll() {
    invalidateCache(CACHE_KEYS.MESSAGES)
  },
}

export const projectCache = {
  get() {
    return getCacheWithTTL(CACHE_KEYS.PROJECTS)
  },

  set(projects) {
    setCacheWithTTL(CACHE_KEYS.PROJECTS, projects)
  },

  invalidate() {
    localStorage.removeItem(CACHE_KEYS.PROJECTS)
  },
}

export const metadataCache = {
  get(chatId) {
    return getCacheWithTTL(`${CACHE_KEYS.METADATA}_${chatId}`)
  },

  set(chatId, metadata) {
    setCacheWithTTL(`${CACHE_KEYS.METADATA}_${chatId}`, metadata)
  },

  invalidate(chatId) {
    localStorage.removeItem(`${CACHE_KEYS.METADATA}_${chatId}`)
  },

  invalidateAll() {
    invalidateCache(CACHE_KEYS.METADATA)
  },
}

export function clearAllCaches() {
  try {
    const keysToRemove = Object.keys(localStorage).filter(
      (key) =>
        key.includes(CACHE_KEYS.PROJECTS) ||
        key.includes(CACHE_KEYS.MESSAGES) ||
        key.includes(CACHE_KEYS.METADATA)
    )
    keysToRemove.forEach((key) => localStorage.removeItem(key))
  } catch (err) {
    console.warn('Error clearing caches:', err)
  }
}
