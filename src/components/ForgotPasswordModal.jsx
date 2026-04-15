import React, { useState } from 'react'
import axios from 'axios'

export default function ForgotPasswordModal({ onClose, onSuccess }) {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email.trim()) {
      setError('Please enter your email')
      return
    }

    setLoading(true)
    setError('')
    try {
      await axios.post('/api/auth/forgot-password', { email: email.trim().toLowerCase() })
      setSuccess(true)
      setTimeout(() => {
        onSuccess?.()
        onClose()
      }, 2000)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to process request. Please try again.')
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
            <h3 style={styles.successTitle}>Check Your Email</h3>
            <p style={styles.successMessage}>
              We've sent a password reset link to <strong>{email}</strong>
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.backdrop}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <h2 style={styles.title}>Reset Password</h2>
          <button style={styles.closeBtn} onClick={onClose} disabled={loading}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              style={styles.input}
              disabled={loading}
              autoFocus
            />
            <p style={styles.helperText}>
              Enter the email address associated with your account. We'll send you a link to reset your password.
            </p>
          </div>

          {error && <div style={styles.error}>{error}</div>}

          <div style={styles.buttonGroup}>
            <button
              type="button"
              onClick={onClose}
              style={styles.cancelBtn}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={styles.submitBtn}
              disabled={loading || !email.trim()}
            >
              {loading ? 'Sending...' : 'Send Reset Link'}
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
    maxWidth: '400px',
    width: '90%',
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
  successContent: {
    padding: '40px 20px',
    textAlign: 'center',
  },
  successIcon: {
    fontSize: '48px',
    color: '#10b981',
    marginBottom: '15px',
  },
  successTitle: {
    margin: 0,
    marginBottom: '10px',
    color: '#1f2937',
    fontSize: '20px',
    fontWeight: '600',
  },
  successMessage: {
    margin: 0,
    color: '#6b7280',
    fontSize: '14px',
    lineHeight: '1.5',
  },
  formGroup: {
    padding: '20px',
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
    marginBottom: '10px',
  },
  helperText: {
    margin: 0,
    fontSize: '13px',
    color: '#6b7280',
    lineHeight: '1.5',
  },
  error: {
    margin: '0 20px',
    padding: '10px',
    backgroundColor: '#fee2e2',
    color: '#dc2626',
    borderRadius: '6px',
    fontSize: '14px',
  },
  buttonGroup: {
    display: 'flex',
    gap: '10px',
    padding: '20px',
    backgroundColor: '#f9fafb',
    borderTop: '1px solid #e5e7eb',
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
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
  },
}
