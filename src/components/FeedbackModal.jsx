import React, { useState } from 'react'
import axios from 'axios'

export default function FeedbackModal({ onClose, token }) {
  const [category, setCategory] = useState('general')
  const [rating, setRating] = useState(5)
  const [message, setMessage] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!message.trim()) {
      setError('Please enter your feedback')
      return
    }

    setLoading(true)
    setError('')
    try {
      await axios.post('/api/feedback', 
        { category, rating, message: message.trim(), contact_email: contactEmail },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setSuccess(true)
      setTimeout(() => {
        onClose()
      }, 1500)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit feedback')
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
            <h3 style={styles.successTitle}>Thank You!</h3>
            <p style={styles.successMessage}>Your feedback has been submitted successfully.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.backdrop}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <h2 style={styles.title}>Send Us Your Feedback</h2>
          <button style={styles.closeBtn} onClick={onClose} disabled={loading}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Category</label>
            <select 
              value={category} 
              onChange={(e) => setCategory(e.target.value)}
              style={styles.select}
              disabled={loading}
            >
              <option value="general">General Feedback</option>
              <option value="feature_request">Feature Request</option>
              <option value="bug">Bug Report</option>
              <option value="ui/ux">UI/UX Suggestion</option>
            </select>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Rating</label>
            <div style={styles.ratingContainer}>
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  style={{
                    ...styles.star,
                    color: star <= rating ? '#fbbf24' : '#d1d5db',
                  }}
                  disabled={loading}
                >
                  ★
                </button>
              ))}
            </div>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Your Feedback *</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Tell us what you think..."
              style={styles.textarea}
              disabled={loading}
              rows={5}
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Email (optional)</label>
            <input
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              placeholder="your@email.com"
              style={styles.input}
              disabled={loading}
            />
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
              disabled={loading || !message.trim()}
            >
              {loading ? 'Submitting...' : 'Submit Feedback'}
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
    maxWidth: '500px',
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
    color: '#10b981',
    fontSize: '20px',
    fontWeight: '600',
  },
  successMessage: {
    margin: 0,
    color: '#6b7280',
    fontSize: '14px',
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
  select: {
    width: '100%',
    padding: '8px 10px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    boxSizing: 'border-box',
  },
  ratingContainer: {
    display: 'flex',
    gap: '8px',
  },
  star: {
    background: 'none',
    border: 'none',
    fontSize: '28px',
    cursor: 'pointer',
    padding: 0,
  },
  textarea: {
    width: '100%',
    padding: '10px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
    resize: 'vertical',
  },
  input: {
    width: '100%',
    padding: '8px 10px',
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
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
  },
}
