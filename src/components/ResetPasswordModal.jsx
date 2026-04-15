import React, { useState, useEffect } from 'react'
import axios from 'axios'

export default function ResetPasswordModal({ token, onSuccess, onCancel }) {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [tokenValid, setTokenValid] = useState(false)
  const [validating, setValidating] = useState(true)

  useEffect(() => {
    // Validate token on mount
    if (token) {
      validateToken()
    }
  }, [token])

  const validateToken = async () => {
    try {
      await axios.post('/api/auth/validate-reset-token', { token })
      setTokenValid(true)
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid or expired reset link')
      setTokenValid(false)
    } finally {
      setValidating(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setLoading(true)
    setError('')
    try {
      await axios.post('/api/auth/reset-password', { 
        token, 
        password 
      })
      setSuccess(true)
      setTimeout(() => {
        onSuccess?.()
      }, 2000)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reset password. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (validating) {
    return (
      <div style={styles.backdrop}>
        <div style={styles.modal}>
          <div style={styles.loadingContent}>
            <div style={styles.spinner} />
            <p style={styles.loadingText}>Validating reset link...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!tokenValid) {
    return (
      <div style={styles.backdrop}>
        <div style={styles.modal}>
          <div style={styles.errorContent}>
            <div style={styles.errorIcon}>✕</div>
            <h3 style={styles.errorTitle}>Invalid Link</h3>
            <p style={styles.errorMessage}>{error}</p>
            <button style={styles.actionBtn} onClick={onCancel}>
              Return to Login
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div style={styles.backdrop}>
        <div style={styles.modal}>
          <div style={styles.successContent}>
            <div style={styles.successIcon}>✓</div>
            <h3 style={styles.successTitle}>Password Reset!</h3>
            <p style={styles.successMessage}>
              Your password has been successfully reset. You can now sign in with your new password.
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
          <h2 style={styles.title}>Set New Password</h2>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={styles.formGroup}>
            <label style={styles.label}>New Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              style={styles.input}
              disabled={loading}
              autoFocus
              minLength={6}
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter your password"
              style={styles.input}
              disabled={loading}
              minLength={6}
            />
          </div>

          {error && <div style={styles.error}>{error}</div>}

          <div style={styles.buttonGroup}>
            <button
              type="button"
              onClick={onCancel}
              style={styles.cancelBtn}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={styles.submitBtn}
              disabled={loading || !password.trim() || !confirmPassword.trim()}
            >
              {loading ? 'Resetting...' : 'Reset Password'}
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
    padding: '20px',
    borderBottom: '1px solid #e5e7eb',
  },
  title: {
    margin: 0,
    fontSize: '18px',
    fontWeight: '600',
    color: '#1f2937',
  },
  loadingContent: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '40px 20px',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #e5e7eb',
    borderTop: '4px solid #3b82f6',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  loadingText: {
    margin: '15px 0 0',
    color: '#6b7280',
    fontSize: '14px',
  },
  errorContent: {
    padding: '40px 20px',
    textAlign: 'center',
  },
  errorIcon: {
    fontSize: '48px',
    color: '#ef4444',
    marginBottom: '15px',
  },
  errorTitle: {
    margin: 0,
    marginBottom: '10px',
    color: '#1f2937',
    fontSize: '20px',
    fontWeight: '600',
  },
  errorMessage: {
    margin: 0,
    marginBottom: '20px',
    color: '#6b7280',
    fontSize: '14px',
    lineHeight: '1.5',
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
    padding: '15px 20px',
    borderBottom: '1px solid #f3f4f6',
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
    margin: '0 20px',
    padding: '10px',
    backgroundColor: '#fee2e2',
    color: '#dc2626',
    borderRadius: '6px',
    fontSize: '14px',
  },
  actionBtn: {
    padding: '10px 20px',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
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
    backgroundColor: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
  },
}
