import { useState, useRef, useEffect } from 'react'
import './Main.css'

const IconPlus = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 5v14M5 12h14" />
  </svg>
)

const IconMic = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8" />
  </svg>
)

const IconWaveform = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <rect x="2" y="10" width="3" height="4" rx="1" />
    <rect x="7" y="8" width="3" height="8" rx="1" />
    <rect x="12" y="4" width="3" height="16" rx="1" />
    <rect x="17" y="8" width="3" height="8" rx="1" />
    <rect x="22" y="10" width="3" height="4" rx="1" />
  </svg>
)

const IconRegenerate = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5" />
  </svg>
)

const IconCompare = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="7" height="7" />
    <rect x="14" y="3" width="7" height="7" />
    <path d="M6.5 10v4M17.5 10v4" />
  </svg>
)

const MODE_COPY = {
  chat: {
    label: 'Chat',
    placeholder: 'I am a buyer and I want to negotiate a better price for a 12-month software contract. The seller proposed $24,000 and my target is $18,000.',
  },
  negotiation: {
    label: 'Negotiation',
    placeholder: 'I am the seller. The buyer said, "Your quote is too high and we can only pay $9,500." What should I reply right now?',
  },
  practice: {
    label: 'Practice',
    placeholder: 'Please role-play as the seller and start a realistic in-person negotiation so I can practice my responses.',
  },
}

export default function Main({ messages, onSendMessage, isEmpty, sendLoading, activeMode, onModeChange, hasProject }) {
  const [input, setInput] = useState('')
  const messagesEndRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSubmit = (e) => {
    e?.preventDefault()
    if (!input.trim()) return
    onSendMessage(input.trim())
    setInput('')
  }

  return (
    <main className="main">
      <div className="main-content">
        <div className="main-modes">
          {Object.entries(MODE_COPY).map(([mode, copy]) => (
            <button
              key={mode}
              type="button"
              className={`main-mode-btn ${activeMode === mode ? 'active' : ''}`}
              onClick={() => onModeChange(mode)}
            >
              {copy.label}
            </button>
          ))}
        </div>

        {isEmpty ? (
          <div className="main-empty">
            <h1 className="main-greeting">Where shall we start?</h1>
            <p className="main-sub">
              {hasProject
                ? 'Tell me the latest context and I will guide you in this mode.'
                : 'Let us set up your new project. Tell me whether you are the buyer or seller, who the counterparty is, what you are negotiating, and your target outcome.'}
            </p>
          </div>
        ) : (
          <div className="main-messages">
            {messages.map((msg, i) => (
              <div key={msg.id ?? `m-${i}`} className={`main-message main-message--${msg.role}`}>
                <div className="main-message-inner">
                  {msg.role === 'user' ? (
                    <span className="main-message-avatar main-message-avatar--user">U</span>
                  ) : (
                    <span className="main-message-avatar main-message-avatar--assistant">H</span>
                  )}
                  <div className="main-message-text">{msg.content}</div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}

        <div className="main-actions-float">
          <button type="button" className="main-action-btn" aria-label="Compare">
            <IconCompare />
          </button>
          <button type="button" className="main-action-btn" aria-label="Regenerate">
            <IconRegenerate />
          </button>
        </div>

        <form className="main-form" onSubmit={handleSubmit}>
          <div className="main-input-wrap">
            <button type="button" className="main-input-btn" aria-label="Attach">
              <IconPlus />
            </button>
            <input
              type="text"
              className="main-input"
              placeholder={sendLoading ? 'Thinking…' : MODE_COPY[activeMode].placeholder}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSubmit()}
              disabled={sendLoading}
            />
            <button type="button" className="main-input-btn" aria-label="Voice input" disabled={sendLoading}>
              <IconMic />
            </button>
            <button type="button" className="main-input-btn main-input-btn--accent" aria-label="Audio" disabled={sendLoading}>
              <IconWaveform />
            </button>
          </div>
          {sendLoading && (
            <p className="main-thinking">Haggle AI is thinking…</p>
          )}
        </form>
      </div>
    </main>
  )
}
