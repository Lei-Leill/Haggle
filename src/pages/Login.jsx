import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import VipCodeRedemption from '../components/VipCodeRedemption'
import './Auth.css'

export default function Login({ onSwitchToRegister }) {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showVipRedemption, setShowVipRedemption] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
    } catch (err) {
      setError(err.message || 'Login failed')
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
              autoComplete="current-password"
            />
          </label>
          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <p className="auth-switch">
          Don’t have an account?{' '}
          <button type="button" className="auth-link" onClick={onSwitchToRegister}>
            Sign up
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
