-- Token trial request submissions for users who have exhausted their balance

CREATE TABLE IF NOT EXISTS token_trial_requests (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_token_trial_requests_user_id ON token_trial_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_token_trial_requests_status ON token_trial_requests(status);
CREATE INDEX IF NOT EXISTS idx_token_trial_requests_created_at ON token_trial_requests(created_at DESC);
