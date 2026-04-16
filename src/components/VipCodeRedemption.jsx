import React, { useState } from 'react'
import * as api from '../api'

export default function VipCodeRedemption({ onSuccess, onCancel }) {
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleRedeem = async () => {
    if (!code.trim()) {
      setError('Please enter a VIP code')
      return
    }

    const authToken = localStorage.getItem('haggle_token')
    if (!authToken) {
      setError('Please sign in first, then redeem your VIP code.')
      return
    }

    setLoading(true)
    setError('')
    try {
      const response = await api.redeemVipCode(code.trim())
      setSuccess(true)
      setTimeout(() => {
        onSuccess?.(response.tokens)
      }, 1500)
    } catch (err) {
      setError(err.message || 'Failed to redeem VIP code')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div style={styles.container}>
        <div style={styles.modal}>
          <h2 style={styles.successTitle}>✓ Success!</h2>
          <p style={styles.successMessage}>Your VIP code has been redeemed!</p>
          <p style={styles.tokensMessage}>You now have 20,000 tokens available.</p>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      <div style={styles.modal}>
        <h2 style={styles.title}>Redeem VIP Code</h2>
        <input
          type="text"
          placeholder="Haggle-XXXX"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleRedeem()}
          style={styles.input}
          disabled={loading}
        />
        {error && <div style={styles.error}>{error}</div>}
        <div style={styles.buttonGroup}>
          <button 
            onClick={handleRedeem} 
            style={styles.redeemBtn}
            disabled={loading || !code.trim()}
          >
            {loading ? 'Redeeming...' : 'Redeem Code'}
          </button>
          <button 
            onClick={onCancel}
            style={styles.cancelBtn}
            disabled={loading}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

const styles = {
  container: {
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
    padding: '30px',
    maxWidth: '400px',
    width: '90%',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
  },
  title: {
    marginTop: 0,
    marginBottom: '20px',
    fontSize: '20px',
    fontWeight: '600',
    color: '#333',
  },
  successTitle: {
    marginTop: 0,
    marginBottom: '10px',
    fontSize: '24px',
    fontWeight: '600',
    color: '#10b981',
    textAlign: 'center',
  },
  successMessage: {
    marginBottom: '10px',
    fontSize: '16px',
    color: '#333',
    textAlign: 'center',
  },
  tokensMessage: {
    marginBottom: 0,
    fontSize: '14px',
    color: '#666',
    textAlign: 'center',
  },
  input: {
    width: '100%',
    padding: '10px',
    marginBottom: '15px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    fontSize: '14px',
    boxSizing: 'border-box',
    fontFamily: 'monospace',
  },
  error: {
    color: '#ef4444',
    fontSize: '14px',
    marginBottom: '15px',
    padding: '8px',
    backgroundColor: '#fee2e2',
    borderRadius: '4px',
  },
  buttonGroup: {
    display: 'flex',
    gap: '10px',
  },
  redeemBtn: {
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
  cancelBtn: {
    flex: 1,
    padding: '10px',
    backgroundColor: '#f3f4f6',
    color: '#333',
    border: '1px solid #ddd',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
  },
}
