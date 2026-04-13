import { useState, useRef, useEffect, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import ProjectSurvey from './ProjectSurvey'
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

function parseAssistantContent(rawContent = '') {
  if (!rawContent) {
    return { visibleContent: '', thoughts: [] }
  }

  const thoughts = []
  let visibleContent = rawContent
    .replace(/&lt;\s*think\b[^&]*&gt;/gi, '<think>')
    .replace(/&lt;\s*\/\s*think\s*&gt;/gi, '</think>')

  visibleContent = visibleContent.replace(/<\s*think\b[^>]*>([\s\S]*?)<\s*\/\s*think\s*>/gi, (_, thoughtContent) => {
    const cleaned = thoughtContent.trim()
    if (cleaned) thoughts.push(cleaned)
    return ''
  })

  const openThinkMatch = visibleContent.match(/<\s*think\b[^>]*>([\s\S]*)$/i)
  if (openThinkMatch) {
    const trailingThought = openThinkMatch[1]?.trim()
    if (trailingThought) thoughts.push(trailingThought)
    visibleContent = visibleContent.slice(0, openThinkMatch.index).trim()
  }

  return {
    visibleContent: visibleContent.trim(),
    thoughts,
  }
}

function MessageContent({ message }) {
  if (message.role === 'assistant') {
    const { visibleContent, thoughts } = parseAssistantContent(message.content)
    return (
      <div className="main-message-rich">
        {thoughts.length > 0 && (
          <details className="main-think-block">
            <summary>Model thinking ({thoughts.length})</summary>
            {thoughts.map((thought, idx) => (
              <pre key={`thought-${idx}`} className="main-think-content">{thought}</pre>
            ))}
          </details>
        )}
        <div className="main-markdown">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {visibleContent || '_No response generated._'}
          </ReactMarkdown>
        </div>
      </div>
    )
  }

  return (
    <div className="main-message-user-wrap">
      {message.images?.length > 0 && (
        <div className="main-message-images">
          {message.images.map((url, i) => (
            <img key={i} src={url} alt={`Attached ${i + 1}`} className="main-message-image" />
          ))}
        </div>
      )}
      {message.content && <div className="main-message-text">{message.content}</div>}
    </div>
  )
}

export default function Main({ messages, onSendMessage, isEmpty, sendLoading, activeMode, onModeChange, hasProject, activeProjectId, chatLoading, isViewingProject, pagination = { hasMore: false }, onLoadEarlier = () => {} }) {
  const [input, setInput] = useState('')
  const [sellerInput, setSellerInput] = useState('')
  const [showSurvey, setShowSurvey] = useState(false)
  const [loadingEarlier, setLoadingEarlier] = useState(false)
  const [surveyActiveTab, setSurveyActiveTab] = useState('sources')
  const messagesEndRef = useRef(null)
  const sellerEndRef = useRef(null)
  const inputRef = useRef(null)
  const sellerInputRef = useRef(null)
  const fileInputRef = useRef(null)
  const [attachedImages, setAttachedImages] = useState([])

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

  useEffect(() => {
    // Show survey for projects when they first open and are empty
    if (hasProject && isEmpty && !chatLoading) {
      setShowSurvey(true)
    } else {
      setShowSurvey(false)
    }
  }, [hasProject, isEmpty, chatLoading])

  const autoResizeTextarea = (node) => {
    if (!node) return
    node.style.height = 'auto'
    node.style.height = `${Math.min(node.scrollHeight, 200)}px`
  }

  useEffect(() => {
    autoResizeTextarea(inputRef.current)
  }, [input])

  useEffect(() => {
    autoResizeTextarea(sellerInputRef.current)
  }, [sellerInput])

  const MAX_IMAGE_SIZE = 4 * 1024 * 1024
  const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp'])

  const appendImageFiles = (files) => {
    files.forEach((file) => {
      if (!ALLOWED_IMAGE_TYPES.has(file.type) || file.size > MAX_IMAGE_SIZE) return
      const reader = new FileReader()
      reader.onload = (ev) => {
        setAttachedImages((prev) => (prev.length >= 4 ? prev : [...prev, { dataUrl: ev.target.result, name: file.name }]))
      }
      reader.readAsDataURL(file)
    })
  }

  const handleImageAttach = (e) => {
    const files = Array.from(e.target.files || []).slice(0, 4)
    appendImageFiles(files)
    e.target.value = ''
  }

  const handleInputPaste = (e) => {
    const items = Array.from(e.clipboardData?.items || [])
    const imageFiles = items
      .filter((item) => item.kind === 'file' && item.type.startsWith('image/'))
      .map((item) => item.getAsFile())
      .filter(Boolean)

    if (imageFiles.length === 0) return

    e.preventDefault()
    const remainingSlots = Math.max(0, 4 - attachedImages.length)
    if (remainingSlots === 0) return
    appendImageFiles(imageFiles.slice(0, remainingSlots))
  }

  const removeImage = (idx) => setAttachedImages((prev) => prev.filter((_, i) => i !== idx))

  const handleSubmit = (e) => {
    e?.preventDefault()
    if (!input.trim() && attachedImages.length === 0) return
    onSendMessage(input.trim(), attachedImages.map((img) => img.dataUrl))
    setInput('')
    setAttachedImages([])
  }

  const handleInputKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  const handleSellerInputKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      addThreadMessage()
    }
  }

  const [addRole, setAddRole] = useState('seller')

  const addThreadMessage = useCallback(() => {
    if (!sellerInput.trim()) return
    const content = sellerInput.trim()
    const role = addRole
    const nextThread = [...sellerThread, { role, content }]
    setSellerThread(nextThread)
    setSellerInput('')
    if (role === 'seller') {
      const threadContext = nextThread
        .map((m) => (m.role === 'seller' ? 'Seller' : 'You') + ': ' + m.content)
        .join('\n\n')
      onSendMessage(`The seller just responded:\n"${content}"\n\nFull negotiation dialogue so far:\n${threadContext}\n\nWhat is the best reply I should send next?`)
    }
  }, [sellerInput, sellerThread, addRole, onSendMessage])

  const addYourReply = useCallback((rawText) => {
    const { visibleContent } = parseAssistantContent(rawText || '')
    const text = visibleContent.trim() || (rawText || '').trim()
    if (!text) return
    setSellerThread((prev) => [...prev, { role: 'you', content: text }])
  }, [])

  const isNegotiationSplit = activeMode === 'negotiation' && hasProject
  const isSurveySplit = showSurvey && !isNegotiationSplit && isViewingProject

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

        {isEmpty && !isNegotiationSplit && !isSurveySplit && !chatLoading ? (
          <div className="main-empty">
            <h1 className="main-greeting">Where shall we start?</h1>
            <p className="main-sub">
              {hasProject
                ? 'Tell me the latest context and I will guide you in this mode.'
                : 'Let us set up your new project. Tell me whether you are the buyer or seller, who the counterparty is, what you are negotiating, and your target outcome.'}
            </p>
          </div>
        ) : isSurveySplit ? (
          <ProjectSurvey 
            projectId={activeProjectId} 
            activeTab={surveyActiveTab}
            onTabChange={setSurveyActiveTab}
            onSurveyComplete={() => setShowSurvey(false)}
          />
        ) : isNegotiationSplit ? (
          <div className="main-split">
            <div className="main-split-panel main-split-panel--seller">
              <div className="main-split-panel-header">Negotiation dialogue</div>
              <p className="main-split-panel-hint">Track the full back-and-forth. Select who spoke, enter the message, then add it. Adding a seller message automatically asks the AI for your best next reply.</p>
              <div className="main-split-messages">
                {sellerThread.map((m, i) => (
                  <div key={i} className={`main-split-msg main-split-msg--${m.role}`}>
                    <span className="main-split-msg-label">{m.role === 'seller' ? 'Seller' : 'You'}</span>
                    <div className="main-split-msg-content">{m.content}</div>
                  </div>
                ))}
                <div ref={sellerEndRef} />
              </div>
              <div className="main-split-role-toggle">
                <button
                  type="button"
                  className={`main-split-role-btn ${addRole === 'you' ? 'active active--you' : ''}`}
                  onClick={() => setAddRole('you')}
                >
                  You said
                </button>
                <button
                  type="button"
                  className={`main-split-role-btn ${addRole === 'seller' ? 'active active--seller' : ''}`}
                  onClick={() => setAddRole('seller')}
                >
                  Seller said
                </button>
              </div>
              <div className="main-split-input-row">
                <textarea
                  ref={sellerInputRef}
                  className="main-split-input"
                  placeholder={addRole === 'seller' ? 'Paste what the seller said…' : 'What did you say to the seller…'}
                  value={sellerInput}
                  rows={1}
                  onChange={(e) => {
                    setSellerInput(e.target.value)
                    autoResizeTextarea(e.target)
                  }}
                  onKeyDown={handleSellerInputKeyDown}
                />
                <button type="button" className="main-split-btn" onClick={addThreadMessage}>
                  {addRole === 'seller' ? 'Add + Ask AI' : 'Add'}
                </button>
              </div>
            </div>
            <div className="main-split-panel main-split-panel--agent">
              <div className="main-split-panel-header">Haggle AI advisor</div>
              <p className="main-split-panel-hint">Suggestions appear automatically when you add a seller message. Click “Use as my reply” to log the AI’s reply in the dialogue, then continue.</p>
              <div className="main-messages">
                {chatLoading ? (
                  <div className="main-split-empty">Loading messages…</div>
                ) : messages.length === 0 ? (
                  <div className="main-split-empty">Send your first message to get AI negotiation advice.</div>
                ) : (
                  messages.map((msg, i) => (
                    <div key={msg.id ?? `m-${i}`} className={`main-message main-message--${msg.role}`}>
                      <div className="main-message-inner">
                        {msg.role === 'user' ? (
                          <span className="main-message-avatar main-message-avatar--user">U</span>
                        ) : (
                          <span className="main-message-avatar main-message-avatar--assistant">H</span>
                        )}
                        <MessageContent message={msg} />
                      </div>
                      {msg.role === 'assistant' && (
                        <button
                          type="button"
                          className="main-split-use-reply-btn"
                          onClick={() => addYourReply(msg.content)}
                        >
                          Use as my reply →
                        </button>
                      )}
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>
              <form className="main-form main-form--in-panel" onSubmit={handleSubmit}>
                {attachedImages.length > 0 && (
                  <div className="main-attach-preview">
                    {attachedImages.map((img, i) => (
                      <div key={i} className="main-attach-thumb">
                        <img src={img.dataUrl} alt={img.name} className="main-attach-img" />
                        <button type="button" className="main-attach-remove" onClick={() => removeImage(i)} aria-label="Remove">×</button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="main-input-wrap">
                  <button type="button" className="main-input-btn" aria-label="Attach image" onClick={() => fileInputRef.current?.click()}>
                    <IconPlus />
                  </button>
                  <textarea
                    ref={inputRef}
                    className="main-input"
                    placeholder={sendLoading ? 'Thinking\u2026' : (isEmpty ? "Paste what the seller said to get a suggested reply…" : 'Ask a follow-up…')}
                    value={input}
                    rows={1}
                    onChange={(e) => {
                      setInput(e.target.value)
                      autoResizeTextarea(e.target)
                    }}
                    onPaste={handleInputPaste}
                    onKeyDown={handleInputKeyDown}
                    disabled={sendLoading}
                  />
                  <button type="submit" className="main-split-btn" disabled={sendLoading}>Send</button>
                </div>
                {sendLoading && <p className="main-thinking">Haggle AI is thinking…</p>}
              </form>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                multiple
                style={{ display: 'none' }}
                onChange={handleImageAttach}
              />
            </div>
          </div>
        ) : (
          <div className="main-messages">
            {pagination?.hasMore && (
              <button
                type="button"
                className="main-load-earlier-btn"
                onClick={async () => {
                  setLoadingEarlier(true)
                  try {
                    await onLoadEarlier()
                  } finally {
                    setLoadingEarlier(false)
                  }
                }}
                disabled={loadingEarlier}
              >
                {loadingEarlier ? 'Loading earlier messages…' : 'Load earlier messages'}
              </button>
            )}
            {messages.map((msg, i) => (
              <div key={msg.id ?? `m-${i}`} className={`main-message main-message--${msg.role}`}>
                <div className="main-message-inner">
                  {msg.role === 'user' ? (
                    <span className="main-message-avatar main-message-avatar--user">U</span>
                  ) : (
                    <span className="main-message-avatar main-message-avatar--assistant">H</span>
                  )}
                  <MessageContent message={msg} />
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}

        {!isNegotiationSplit && (
        <form className="main-form" onSubmit={handleSubmit}>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            multiple
            style={{ display: 'none' }}
            onChange={handleImageAttach}
          />
          {attachedImages.length > 0 && (
            <div className="main-attach-preview">
              {attachedImages.map((img, i) => (
                <div key={i} className="main-attach-thumb">
                  <img src={img.dataUrl} alt={img.name} className="main-attach-img" />
                  <button type="button" className="main-attach-remove" onClick={() => removeImage(i)} aria-label="Remove">×</button>
                </div>
              ))}
            </div>
          )}
          <div className="main-input-wrap">
            <button type="button" className="main-input-btn" aria-label="Attach image" onClick={() => fileInputRef.current?.click()}>
              <IconPlus />
            </button>
            <textarea
              ref={inputRef}
              className="main-input"
              placeholder={sendLoading ? 'Thinking\u2026' : (isEmpty ? MODE_COPY[activeMode].placeholder : 'Ask a follow-up…')}
              value={input}
              rows={1}
              onChange={(e) => {
                setInput(e.target.value)
                autoResizeTextarea(e.target)
              }}
              onPaste={handleInputPaste}
              onKeyDown={handleInputKeyDown}
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
