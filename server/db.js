import Database from 'better-sqlite3'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dbPath = path.join(__dirname, 'haggle.db')
const db = new Database(dbPath)

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS chats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    parent_id INTEGER REFERENCES chats(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT 'New chat',
    category TEXT NOT NULL DEFAULT 'chat',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chat_id INTEGER NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
    mode TEXT NOT NULL DEFAULT 'chat' CHECK(mode IN ('chat', 'negotiation', 'practice')),
    content TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_chats_user ON chats(user_id);
  CREATE INDEX IF NOT EXISTS idx_chats_category ON chats(user_id, category);
  CREATE INDEX IF NOT EXISTS idx_messages_chat ON messages(chat_id);
`)

const messageColumns = db.prepare('PRAGMA table_info(messages)').all()
const hasModeColumn = messageColumns.some((column) => column.name === 'mode')
if (!hasModeColumn) {
  db.exec(`
    ALTER TABLE messages ADD COLUMN mode TEXT NOT NULL DEFAULT 'chat' CHECK(mode IN ('chat', 'negotiation', 'practice'));
    CREATE INDEX IF NOT EXISTS idx_messages_chat_mode ON messages(chat_id, mode);
  `)
}

const chatColumns = db.prepare('PRAGMA table_info(chats)').all()
const hasParentIdColumn = chatColumns.some((column) => column.name === 'parent_id')
if (!hasParentIdColumn) {
  db.exec(`
    ALTER TABLE chats ADD COLUMN parent_id INTEGER REFERENCES chats(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_chats_parent ON chats(parent_id);
  `)
}

db.exec(`
  CREATE TABLE IF NOT EXISTS project_metadata (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chat_id INTEGER NOT NULL UNIQUE REFERENCES chats(id) ON DELETE CASCADE,
    item_listing TEXT,
    listed_price TEXT,
    target_price TEXT,
    max_price TEXT,
    ideal_extras TEXT,
    urgency TEXT,
    private_notes TEXT,
    seller_type TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );
  
  CREATE INDEX IF NOT EXISTS idx_project_metadata_chat ON project_metadata(chat_id);
`)

export default db
