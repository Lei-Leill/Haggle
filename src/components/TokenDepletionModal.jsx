import React, { useState } from 'react'
import axios from 'axios'

export default function TokenDepletionModal({ onClose, token, onTokensRequested }) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email.trim()) {
      setError('Please enter your email')
      return
    }

    setLoading(true)
    setError('')
    try {
      await axios.post('/api/request-tokens', 
        { email: email.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setSuccess(true)
      if (onTokensRequested) {
        onTokensRequested()
      }
      setTimeout(() => {
        onClose()
      }, 2000)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit token request')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div style={styles.backdrop}>
        <div style={styles.modal}>
          <div style={styles.successContent}>
            <div style={styles.successIcon}>✓</div>
            <h3 style={styles.successTitle}>Request Sent!</h3>
            <p style={styles.successMessage}>We've received your token request and will review it shortly.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.backdrop}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <h2 style={styles.title}>⚡ Out of Tokens</h2>
          <button style={styles.closeBtn} onClick={onClose} disabled={loading}>✕</button>
        </div>

        <div style={styles.content}>
          <p style={styles.description}>
            You've used all your free trial tokens. To continue using Haggle AI, please request more tokens below.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Email Address *</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your.email@example.com"
              style={styles.input}
              disabled={loading}
              required
            />
          </div>

          {error && <div style={styles.error}>{error}</div>}

          <div style={styles.buttonGroup}>
            <button
              type="submit"
              style={{ ...styles.submitBtn, opacity: loading ? 0.6 : 1 }}
              disabled={loading}
            >
              {loading ? 'Sending...' : 'Request Tokens'}
            </button>
            <button
              type="button"
              onClick={onClose}
              style={styles.cancelBtn}
              disabled={loading}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const styles = {
  backdrop: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: 'var(--bg-primary, #ffffff)',
    borderRadius: '12px',
    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
    maxWidth: '420px',
    width: '90%',
    padding: '24px',
    color: 'var(--text-primary, #000000)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
    paddingBottom: '12px',
    borderBottom: '1px solid var(--border-color, #e5e7eb)',
  },
  title: {
    margin: 0,
    fontSize: '20px',
    fontWeight: '600',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    padding: '0',
    color: 'var(--text-secondary, #6b7280)',
    transition: 'color 0.2s',
  },
  content: {
    marginBottom: '20px',
  },
  description: {
    margin: 0,
    fontSize: '14px',
    color: 'var(--text-secondary, #6b7280)',
    lineHeight: '1.6',
  },
  formGroup: {
    marginBottom: '16px',
  },
  label: {
    display: 'block',
    fontSize: '13px',
    fontWeight: '500',
    marginBottom: '6px',
    color: 'var(--text-primary, #000000)',
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    fontSize: '14px',
    border: '1px solid var(--border-color, #d1d5db)',
    borderRadius: '6px',
    backgroundColor: 'var(--bg-secondary, #f9fafb)',
    color: 'var(--text-primary, #000000)',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s',
  },
  error: {
    color: '#ef4444',
    fontSize: '13px',
    marginBottom: '12px',
    padding: '8px 12px',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: '6px',
  },
  buttonGroup: {
    display: 'flex',
    gap: '8px',
    marginTop: '20px',
  },
  submitBtn: {
    flex: 1,
    padding: '10px 16px',
    fontSize: '14px',
    fontWeight: '600',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  cancelBtn: {
    flex: 1,
    padding: '10px 16px',
    fontSize: '14px',
    fontWeight: '600',
    backgroundColor: 'transparent',
    color: 'var(--text-primary, #000000)',
    border: '1px solid var(--border-color, #d1d5db)',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  successContent: {
    textAlign: 'center',
    padding: '20px 0',
  },
  successIcon: {
    fontSize: '48px',
    marginBottom: '12px',
    display: 'block',
  },
  successTitle: {
    margin: '0 0 8px 0',
    fontSize: '18px',
    fontWeight: '600',
  },
  successMessage: {
    margin: 0,
    fontSize: '14px',
    color: 'var(--text-secondary, #6b7280)',
  },
}
