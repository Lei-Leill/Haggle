-- Performance Optimization: Create Indexes in Supabase
-- This file contains SQL queries to add important indexes to ensure fast lookups
-- 
-- Instructions:
-- 1. Go to your Supabase project: https://app.supabase.com
-- 2. Navigate to "SQL Editor"
-- 3. Create a new query and paste this content
-- 4. Run the query

-- Index for user_id lookups on chats table (used in GET /api/chats)
CREATE INDEX IF NOT EXISTS idx_chats_user_id ON chats(user_id);

-- Index for parent_id lookups on chats table (used in GET /api/chats/:id/children)
CREATE INDEX IF NOT EXISTS idx_chats_parent_id ON chats(parent_id);

-- Composite index for user_id + parent_id (optimizes filtering)
CREATE INDEX IF NOT EXISTS idx_chats_user_parent ON chats(user_id, parent_id);

-- Index for chat_id lookups on messages table (used in message queries)
CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id);

-- Index for chat_id + mode on messages (used in filtered message queries)
CREATE INDEX IF NOT EXISTS idx_messages_chat_mode ON messages(chat_id, mode);

-- Index for chat_id lookups on project_metadata table
CREATE INDEX IF NOT EXISTS idx_metadata_chat_id ON project_metadata(chat_id);

-- Index for email lookups on users table (used in login/register)
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Composite index for created_at sorting (improves ORDER BY performance)
CREATE INDEX IF NOT EXISTS idx_chats_updated_at ON chats(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(chat_id, created_at ASC);
