import { useState, useRef, useEffect, useCallback } from 'react'
import './Main.css'

const SELLER_STORAGE_KEY = (projectId) => `haggle_seller_thread_${projectId ?? 'new'}`

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

export default function Main({ messages, onSendMessage, isEmpty, sendLoading, activeMode, onModeChange, hasProject, activeProjectId }) {
  const [input, setInput] = useState('')
  const [sellerInput, setSellerInput] = useState('')
  const messagesEndRef = useRef(null)
  const sellerEndRef = useRef(null)

  const [sellerThread, setSellerThread] = useState(() => {
    if (typeof window === 'undefined') return []
    try {
      const stored = localStorage.getItem(SELLER_STORAGE_KEY(activeProjectId))
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  })

  useEffect(() => {
    try {
      const stored = localStorage.getItem(SELLER_STORAGE_KEY(activeProjectId))
      setSellerThread(stored ? JSON.parse(stored) : [])
    } catch {
      setSellerThread([])
    }
  }, [activeProjectId])

  useEffect(() => {
    try {
      localStorage.setItem(SELLER_STORAGE_KEY(activeProjectId), JSON.stringify(sellerThread))
    } catch {}
  }, [sellerThread, activeProjectId])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }
  const scrollSellerToBottom = () => {
    sellerEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => { scrollToBottom() }, [messages])
  useEffect(() => { scrollSellerToBottom() }, [sellerThread])

  const handleSubmit = (e) => {
    e?.preventDefault()
    if (!input.trim()) return
    onSendMessage(input.trim())
    setInput('')
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  const addSellerMessage = useCallback(() => {
    if (!sellerInput.trim()) return
    setSellerThread((prev) => [...prev, { role: 'seller', content: sellerInput.trim() }])
    setSellerInput('')
  }, [sellerInput])

  const addYourReply = useCallback((text) => {
    if (!text?.trim()) return
    setSellerThread((prev) => [...prev, { role: 'you', content: text.trim() }])
  }, [])

  const lastAgentReply = messages.filter((m) => m.role === 'assistant').pop()?.content

  const isNegotiationSplit = activeMode === 'negotiation' && !isEmpty

  return (
    <main className="main">
      <div className={`main-content ${isNegotiationSplit ? 'main-content--split' : ''}`}>
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
        ) : isNegotiationSplit ? (
          <div className="main-split">
            <div className="main-split-panel main-split-panel--seller">
              <div className="main-split-panel-header">Chat with seller</div>
              <p className="main-split-panel-hint">Paste what the seller said. When the agent suggests a reply, add it here to track the conversation.</p>
              <div className="main-split-messages">
                {sellerThread.map((m, i) => (
                  <div key={i} className={`main-split-msg main-split-msg--${m.role}`}>
                    <span className="main-split-msg-label">{m.role === 'seller' ? 'Seller' : 'You'}</span>
                    <div className="main-split-msg-content">{m.content}</div>
                  </div>
                ))}
                <div ref={sellerEndRef} />
              </div>
              <div className="main-split-input-row">
                <input
                  type="text"
                  className="main-split-input"
                  placeholder="Paste what seller said..."
                  value={sellerInput}
                  onChange={(e) => setSellerInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSellerMessage())}
                />
                <button type="button" className="main-split-btn" onClick={addSellerMessage}>
                  Add
                </button>
              </div>
              {lastAgentReply && (
                <button
                  type="button"
                  className="main-split-use-btn"
                  onClick={() => addYourReply(lastAgentReply)}
                >
                  Add agent’s last reply as my reply
                </button>
              )}
            </div>
            <div className="main-split-panel main-split-panel--agent">
              <div className="main-split-panel-header">Haggle AI advisor</div>
              <p className="main-split-panel-hint">Paste what the seller said and get suggested replies.</p>
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
              <form className="main-form main-form--in-panel" onSubmit={handleSubmit}>
                <div className="main-input-wrap">
                  <input
                    type="text"
                    className="main-input"
                    placeholder={sendLoading ? 'Thinking…' : "Paste what seller said, e.g. \"Your quote is too high...\""}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={sendLoading}
                  />
                  <button type="submit" className="main-split-btn" disabled={sendLoading}>Send</button>
                </div>
                {sendLoading && <p className="main-thinking">Haggle AI is thinking…</p>}
              </form>
            </div>
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

        {!isNegotiationSplit && (
          <div className="main-actions-float">
            <button type="button" className="main-action-btn" aria-label="Compare">
              <IconCompare />
            </button>
            <button type="button" className="main-action-btn" aria-label="Regenerate">
              <IconRegenerate />
            </button>
          </div>
        )}

        {!isNegotiationSplit && (
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
              onKeyDown={handleKeyDown}
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
        )}
      </div>
    </main>
  )
}
