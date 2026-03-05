import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import './Header.css'

const IconMenu = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="4" y1="6" x2="20" y2="6" />
    <line x1="4" y1="12" x2="20" y2="12" />
    <line x1="4" y1="18" x2="20" y2="18" />
  </svg>
)

const IconPanel = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="4 2">
    <rect x="3" y="3" width="18" height="18" rx="2" />
  </svg>
)

const IconChevronDown = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M6 9l6 6 6-6" />
  </svg>
)

const IconUser = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="8" r="3" />
    <path d="M5 20c0-4 3-6 7-6s7 2 7 6" />
  </svg>
)

const IconSettings = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
)

const IconLogout = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
)

const MODELS = [
  { id: 'gpt-4o-mini', label: 'Haggle AI 1.0' },
  { id: 'gpt-4o', label: 'Haggle AI Pro' },
]

export default function Header({ onMenuClick, user, selectedModel, onSelectModel }) {
  const [modelOpen, setModelOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const modelRef = useRef(null)
  const userMenuRef = useRef(null)
  const { logout } = useAuth()

  useEffect(() => {
    function handleClick(e) {
      if (modelRef.current && !modelRef.current.contains(e.target)) setModelOpen(false)
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setUserMenuOpen(false)
    }
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [])

  const currentModelLabel = MODELS.find((m) => m.id === selectedModel)?.label || 'Haggle AI 1.0'

  return (
    <header className="header">
      <div className="header-left">
        <button type="button" className="header-icon-btn" onClick={onMenuClick} aria-label="Toggle sidebar">
          <IconMenu />
        </button>
        <button type="button" className="header-icon-btn" aria-label="Panel">
          <IconPanel />
        </button>
      </div>
      <div className="header-center">
        <div className="header-model-wrap" ref={modelRef}>
          <button
            type="button"
            className="header-model-btn"
            onClick={() => setModelOpen((o) => !o)}
            aria-expanded={modelOpen}
            aria-haspopup="listbox"
          >
            <span>{currentModelLabel}</span>
            <IconChevronDown />
          </button>
          {modelOpen && (
            <div className="header-dropdown" role="listbox">
              {MODELS.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  role="option"
                  aria-selected={selectedModel === m.id}
                  className={`header-dropdown-item ${selectedModel === m.id ? 'selected' : ''}`}
                  onClick={() => {
                    onSelectModel(m.id)
                    setModelOpen(false)
                  }}
                >
                  {m.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="header-right" ref={userMenuRef}>
        <button
          type="button"
          className="header-icon-btn"
          aria-label="Account menu"
          aria-expanded={userMenuOpen}
          onClick={() => setUserMenuOpen((o) => !o)}
        >
          <IconUser />
        </button>
        <button type="button" className="header-icon-btn" aria-label="Settings">
          <IconSettings />
        </button>
        {userMenuOpen && (
          <div className="header-user-menu">
            <div className="header-user-menu-head">
              <span className="header-user-menu-name">{user?.name || 'User'}</span>
              <span className="header-user-menu-email">{user?.email}</span>
            </div>
            <button
              type="button"
              className="header-user-menu-item"
              onClick={() => setUserMenuOpen(false)}
            >
              <IconSettings />
              Settings
            </button>
            <button
              type="button"
              className="header-user-menu-item header-user-menu-item--danger"
              onClick={() => {
                logout()
                setUserMenuOpen(false)
              }}
            >
              <IconLogout />
              Log out
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
