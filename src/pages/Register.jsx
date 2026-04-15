import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import VipCodeRedemption from '../components/VipCodeRedemption'
import './Auth.css'

export default function Register({ onSwitchToLogin }) {
  const { register } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showVipRedemption, setShowVipRedemption] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    setLoading(true)
    try {
      await register(email, password, name)
    } catch (err) {
      setError(err.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="auth-logo">Haggle</h1>
        <p className="auth-tagline">AI Negotiation</p>
        <form className="auth-form" onSubmit={handleSubmit}>
          {error && <div className="auth-error">{error}</div>}
          <label className="auth-label">
            Name
            <input
              type="text"
              className="auth-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoComplete="name"
            />
          </label>
          <label className="auth-label">
            Email
            <input
              type="email"
              className="auth-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </label>
          <label className="auth-label">
            Password
            <input
              type="password"
              className="auth-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
            />
          </label>
          <label className="auth-label">
            Confirm password
            <input
              type="password"
              className="auth-input"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              autoComplete="new-password"
            />
          </label>
          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>
        <p className="auth-switch">
          Already have an account?{' '}
          <button type="button" className="auth-link" onClick={onSwitchToLogin}>
            Sign in
          </button>
        </p>
        <div className="auth-divider">or</div>
        <button 
          type="button" 
          className="auth-vip-btn"
          onClick={() => setShowVipRedemption(true)}
        >
          Have a VIP code? Redeem it
        </button>
      </div>
      {showVipRedemption && (
        <VipCodeRedemption 
          onSuccess={() => {
            setShowVipRedemption(false)
            window.location.href = '/'
          }}
          onCancel={() => setShowVipRedemption(false)}
        />
      )}
    </div>
  )
}
