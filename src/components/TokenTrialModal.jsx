import { useState } from 'react'
import * as api from '../api'

export default function TokenTrialModal({ onClose, defaultEmail = '' }) {
  const [email, setEmail] = useState(defaultEmail)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!email.trim()) {
      setError('Please enter your email address')
      return
    }

    setLoading(true)
    setError('')
    try {
      await api.requestTokenTrial(email.trim())
      setSuccess(true)
      setTimeout(() => {
        onClose()
      }, 1400)
    } catch (err) {
      setError(err.message || 'Failed to submit request')
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
            <h3 style={styles.successTitle}>Request Submitted</h3>
            <p style={styles.successMessage}>We received your email and will review your token trial request soon.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.backdrop}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <h2 style={styles.title}>Out of Tokens</h2>
          <button style={styles.closeBtn} onClick={onClose} disabled={loading}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={styles.body}>
            <p style={styles.description}>
              You have used all available trial tokens. Enter your email and we will send you additional token trial details.
            </p>

            <label style={styles.label}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              style={styles.input}
              disabled={loading}
              required
            />

            {error && <div style={styles.error}>{error}</div>}
          </div>

          <div style={styles.buttonGroup}>
            <button type="button" onClick={onClose} style={styles.cancelBtn} disabled={loading}>
              Cancel
            </button>
            <button type="submit" style={styles.submitBtn} disabled={loading || !email.trim()}>
              {loading ? 'Submitting...' : 'Request More Tokens'}
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
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: '8px',
    maxWidth: '460px',
    width: '90%',
    maxHeight: '90vh',
    overflow: 'auto',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px',
    borderBottom: '1px solid #e5e7eb',
  },
  title: {
    margin: 0,
    fontSize: '18px',
    fontWeight: '600',
    color: '#1f2937',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    color: '#6b7280',
    padding: 0,
  },
  body: {
    padding: '18px 20px',
  },
  description: {
    margin: '0 0 16px 0',
    color: '#4b5563',
    fontSize: '14px',
    lineHeight: 1.5,
  },
  label: {
    display: 'block',
    marginBottom: '8px',
    fontSize: '14px',
    fontWeight: '500',
    color: '#374151',
  },
  input: {
    width: '100%',
    padding: '10px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    boxSizing: 'border-box',
  },
  error: {
    marginTop: '12px',
    padding: '10px',
    backgroundColor: '#fee2e2',
    color: '#dc2626',
    borderRadius: '6px',
    fontSize: '14px',
  },
  successContent: {
    padding: '36px 20px',
    textAlign: 'center',
  },
  successIcon: {
    fontSize: '48px',
    color: '#10b981',
    marginBottom: '12px',
  },
  successTitle: {
    margin: 0,
    marginBottom: '10px',
    color: '#10b981',
    fontSize: '20px',
    fontWeight: '600',
  },
  successMessage: {
    margin: 0,
    color: '#6b7280',
    fontSize: '14px',
  },
  buttonGroup: {
    display: 'flex',
    gap: '10px',
    padding: '20px',
    backgroundColor: '#f9fafb',
  },
  cancelBtn: {
    flex: 1,
    padding: '10px',
    backgroundColor: 'white',
    color: '#374151',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
  },
  submitBtn: {
    flex: 1,
    padding: '10px',
    backgroundColor: '#f59e0b',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
  },
}
