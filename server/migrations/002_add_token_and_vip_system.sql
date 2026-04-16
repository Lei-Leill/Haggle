-- Token and VIP Code Management System

-- Table for VIP codes (45 total)
CREATE TABLE IF NOT EXISTS vip_codes (
  id BIGSERIAL PRIMARY KEY,
  code VARCHAR(20) UNIQUE NOT NULL,
  token_allowance INT DEFAULT 20000,
  is_used BOOLEAN DEFAULT false,
  used_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  used_at TIMESTAMP DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table for tracking user token balances
CREATE TABLE IF NOT EXISTS user_tokens (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  total_tokens INT DEFAULT 1000,  -- 1000 for free users, 20000 for VIP
  tokens_used INT DEFAULT 0,
  tokens_remaining INT DEFAULT 1000,
  vip_code_id BIGINT REFERENCES vip_codes(id) ON DELETE SET NULL,
  is_vip BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table for user feedback
CREATE TABLE IF NOT EXISTS feedback (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category VARCHAR(50),  -- 'bug', 'feature_request', 'general', 'ui/ux'
  rating INT,  -- 1-5 stars
  message TEXT,
  contact_email VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table for token requests (when users run out of tokens)
CREATE TABLE IF NOT EXISTS token_requests (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',  -- 'pending', 'approved', 'rejected'
  tokens_granted INT,
  grant_reason VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_vip_codes_code ON vip_codes(code);
CREATE INDEX IF NOT EXISTS idx_vip_codes_user_id ON vip_codes(used_by_user_id);
CREATE INDEX IF NOT EXISTS idx_user_tokens_user_id ON user_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_user_id ON feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON feedback(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_token_requests_user_id ON token_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_token_requests_email ON token_requests(email);
CREATE INDEX IF NOT EXISTS idx_token_requests_status ON token_requests(status);
