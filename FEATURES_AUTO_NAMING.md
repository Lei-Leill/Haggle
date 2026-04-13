# Auto-Naming and UI Improvements

## Changes Implemented

### 1. ✅ Project Auto-Naming from Item/Listing
**Location**: `/server/index.js` - POST `/api/chats/:id/metadata`

When user saves project metadata with `item_listing` field:
- Project title automatically updates to first 60 characters of item_listing
- Example: "MacBook Pro 2023" or "Annual Software License 2024..."
- Users can still manually rename projects anytime via edit button

---

### 2. ✅ Project Auto-Naming from First Message (Top-Level Only)
**Location**: `/server/index.js` - POST `/api/chats/:id/messages`

When user sends first message to a **project** (top-level, not nested chat) with default name "New project":
- Project title intelligently auto-updates to first 50 characters of message
- Example: "I want to negotiate better terms..." becomes project name
- **Important**: This ONLY applies to top-level projects, NOT nested chats
- Users can still manually rename anytime

**Why only projects, not chats?**
- Keeps chat names user-controlled (no unexpected auto-renames)
- Projects benefit from smart auto-naming as they're the main container
- Chats can be manually renamed with the edit button
- More user-friendly and predictable

**How it works**:
```javascript
const isProject = chat.parent_id === null  // Only auto-name top-level items
if (isProject && chat.title === 'New project' && titleSource) {
  const firstLine = titleSource.slice(0, 50).trim() + (titleSource.length > 50 ? '...' : '')
  await db.prepare('UPDATE chats SET title = ?').run(firstLine, chatId)
}
```

**Example flow**:
1. User creates new project → Title: "New project"
2. User sends first message → Project auto-renames to message preview
3. User creates nested chat → Stays as "New chat" (user controls naming)
4. User can click edit icon to rename anything manually

---

### 3. ✅ Manual Chat Naming (User-Controlled)
- Individual chats within projects stay as "New chat" by default
- Users click the edit icon (✏️) to rename chats when desired
- Prevents unwanted auto-renames, giving users full control

---

### 4. ✅ Removed Decorative Icons
Removed two non-functional floating buttons:
- ❌ "Compare" button
- ❌ "Regenerate" button

Result: Cleaner UI with only functional elements

---

## Testing

### Test Project Auto-Naming from Metadata:
1. Create new project
2. Click into it → fill "Item / Listing": "Sony WH-1000XM5 Headphones"
3. Save → project title auto-updates
4. Manual rename still works

### Test Project Auto-Naming from First Message:
1. Create new project (title: "New project")
2. Send first message: "I need help negotiating better price"
3. Project title auto-updates to message preview
4. Metadata takes priority if filled later

### Test Chat Manual Naming:
1. Inside project, create new chat (green + button)
2. Send messages → chat name stays "New chat" (no auto-rename)
3. Click edit icon to manually rename
4. Full user control over chat names

### Verify Icons Removed:
- No circular buttons in bottom-right corner
- Cleaner message input interface

---

## User Benefits

✅ **Smart defaults** - Projects auto-named intelligently  
✅ **User control** - Chats stay user-controlled for predictability  
✅ **No surprises** - Only top-level items auto-rename  
✅ **Manual override** - Always can rename anything  
✅ **Cleaner UI** - Non-functional buttons removed
