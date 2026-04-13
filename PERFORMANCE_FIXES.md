# Three Performance & UX Fixes

## ✅ 1. METADATA SAVING ERROR (500 Error) - FIXED

**Problem:** POST `/api/chats/:id/metadata` returns 500 error

**Root Cause:** Fragile error handling that checked `err.message.includes('UNIQUE')` - unreliable across database drivers

**Fix Applied:**
- Changed to check if metadata exists first: `SELECT * FROM project_metadata WHERE chat_id = ?`
- If exists: UPDATE
- If not exists: INSERT
- Much more reliable than exception-based routing

**Status:** ✅ Deployed to server/index.js

---

## ✅ 2. DYNAMIC NAMING FROM METADATA - IMPLEMENTED

**Feature:** Auto-update chat title from `item_listing` field in metadata

**Implementation:**
- When user saves project metadata with an `item_listing` value
- Backend automatically updates the chat title to that item (first 60 chars)
- Fallback: If no item_listing, first message content is used as title (already implemented)

**Priority:** Metadata takes priority → Message content as fallback

**Example:**
```
User enters "Apple iPhone 14 Pro" in item_listing field
→ Project name auto-updates to "Apple iPhone 14 Pro"
→ User can still manually change it via rename feature
```

**Status:** ✅ Deployed to server/index.js

---

## 🔧 3. FRONTEND CACHING (Performance Bottleneck)

**Problem:** Every time you click a project/chat, the entire list re-fetches from backend

**Root Cause:** React dependency array causes `loadProjects()` to be recreated frequently, triggering full refetch

**Current Flow (Slow):**
```
Click project → activeProjectId changes → useEffect fires
→ loadProjectMessages called → Simultaneously, loadProjects might refetch ALL projects
→ Full project list + messages + children all refetch
→ Shows "loading..." while everything reloads
```

**Solution:** Implement Smart Caching in Frontend

### Code Changes for App.jsx:

Replace the `useEffect` and `loadProjects` logic with:

```javascript
// INSTEAD OF:
const loadProjects = useCallback(async () => {
  if (!user) return
  setChatLoading(true)
  try {
    const list = await api.getChats()
    setProjects(list)
  } catch (err) {
    console.error('Failed to load projects', err)
  } finally {
    setChatLoading(false)
  }
}, [user])

useEffect(() => {
  loadProjects()
}, [loadProjects])

// USE THIS (Optimized):
const loadProjects = useCallback(async () => {
  if (!user) return
  setChatLoading(true)
  try {
    const list = await api.getChats()
    setProjects(list)
  } catch (err) {
    console.error('Failed to load projects', err)
  } finally {
    setChatLoading(false)
  }
}, [user])

// Load projects ONLY when user logs in (not on every render)
useEffect(() => {
  if (user) {
    loadProjects()
  }
}, [user]) // Remove loadProjects from deps - it will cause infinite loops

// Optionally: Add refresh button in Header to allow manual refresh
```

### Additional Optimization - Lazy Load Messages:

Currently when you click a project, it fetches:
1. The project details
2. All nested chats
3. All messages for that project

**Better approach:**
- Keep projects list in memory (already fetched)
- Only fetch messages when user actually clicks on a project
- Cache messages per project (don't refetch unless user clicks refresh)

```javascript
// When selecting a project
const handleSelectProject = useCallback((id) => {
  if (id === activeProjectId) return // Already loaded
  setActiveProjectId(id)
  // loadProjectMessages will be called by useEffect below
}, [activeProjectId])

// Only load messages when project ID changes
useEffect(() => {
  if (!activeProjectId) return
  loadProjectMessages(activeProjectId, activeMode)
}, [activeProjectId, loadProjectMessages]) // Don't add activeMode here - it causes refetches
```

### For Individual Chat Loading:

The current code already handles this well - it fetches messages for the selected chat/project. The issue is that mode changes trigger full refetch.

**Better:**
```javascript
// Keep messages in state per (projectId, mode) combination
// Quick fix: Debounce mode changes, don't immediately fetch

const [loadingMode, setLoadingMode] = useState(null)

const handleModeChange = useCallback((mode) => {
  setActiveMode(mode)
  // Don't force refetch - only fetch if messages are empty for this mode
  // Messages endpoint already handles this
}, [])
```

---

## 🏗️ Architecture Improvements (Optional, for future)

1. **Add Message Pagination:** Load last 50 messages, load more on scroll
2. **Implement React Query or SWR:** Automatic caching + background refetching
3. **Add Backend Caching Headers:** `Cache-Control: max-age=60` for frequently accessed data
4. **Implement Optimistic Updates:** Show UI update immediately, sync with backend in background

---

## Testing Checklist

After deploying these fixes:

- [ ] Try saving metadata again - should work without 500 error
- [ ] Metadata auto-generates chat title
- [ ] Can still manually rename projects/chats
- [ ] Can delete individual chats (already implemented)
- [ ] Clicking projects doesn't trigger full "loading..." state
- [ ] Sidebar feels responsive, not slow on navigation

