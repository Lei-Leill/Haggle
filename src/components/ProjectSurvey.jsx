import { useState, useEffect } from 'react'
import * as api from '../api'
import './ProjectSurvey.css'

export default function ProjectSurvey({ projectId, onSurveyComplete, activeTab, onTabChange, onSelectChat }) {
  const [formData, setFormData] = useState({
    item_listing: '',
    listed_price: '',
    target_price: '',
    max_price: '',
    ideal_extras: '',
    urgency: '',
    private_notes: '',
    seller_type: '',
  })
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [chats, setChats] = useState([])
  const [chatsLoading, setChatsLoading] = useState(false)

  useEffect(() => {
    if (!projectId) return
    
    const loadData = async () => {
      try {
        const data = await api.getProjectMetadata(projectId)
        if (data) {
          setFormData(data)
          setSubmitted(true)
        }
      } catch (err) {
        console.error('Failed to load project info:', err)
      }
    }
    
    loadData()
  }, [projectId])

  useEffect(() => {
    if (!projectId || activeTab !== 'chats') return
    
    const loadChats = async () => {
      setChatsLoading(true)
      try {
        const children = await api.getChatChildren(projectId)
        setChats(children)
      } catch (err) {
        console.error('Failed to load chats:', err)
      } finally {
        setChatsLoading(false)
      }
    }
    
    loadChats()
  }, [projectId, activeTab])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      await api.saveProjectMetadata(projectId, formData)
      setSubmitted(true)
      if (onSurveyComplete) {
        onSurveyComplete(formData)
      }
    } catch (err) {
      console.error('Failed to save project info:', err)
      alert('Failed to save project info')
    } finally {
      setLoading(false)
    }
  }

  if (!projectId) return null

  return (
    <div className="project-survey-panel">
      <div className="project-survey-tabs">
        <button
          className={`project-survey-tab ${activeTab === 'chats' ? 'active' : ''}`}
          onClick={() => onTabChange('chats')}
        >
          Chats
        </button>
        <button
          className={`project-survey-tab ${activeTab === 'survey' ? 'active' : ''}`}
          onClick={() => onTabChange('survey')}
        >
          Survey
        </button>
      </div>

      <div className="project-survey-content">
        {activeTab === 'chats' && (
          <div className="project-chats-section">
            {chatsLoading ? (
              <div className="project-loading">Loading chats...</div>
            ) : chats.length === 0 ? (
              <div className="project-empty">
                <p className="project-empty-title">No chats yet</p>
                <p className="project-empty-text">Create a new chat from the sidebar to start negotiating</p>
              </div>
            ) : (
              <ul className="project-chats-list">
                {chats.map((chat) => (
                  <li key={chat.id} className="project-chat-item">
                    <button
                      type="button"
                      className="project-chat-link"
                      onClick={() => onSelectChat?.(chat.id)}
                    >
                      <div className="project-chat-title">{chat.title}</div>
                      <div className="project-chat-meta">
                        {new Date(chat.created_at).toLocaleDateString()}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {activeTab === 'survey' && (
          <form onSubmit={handleSubmit} className="project-survey-form">
        <div className="survey-section">
          <label htmlFor="item_listing" className="survey-label">
            Item / Listing
            <span className="survey-required">*</span>
          </label>
          <textarea
            id="item_listing"
            name="item_listing"
            value={formData.item_listing}
            onChange={handleChange}
            placeholder="e.g., iPhone 14 Pro, Tesla Model 3, Apartment in Brooklyn"
            className="survey-textarea"
            required
          />
        </div>

        <div className="survey-row">
          <div className="survey-col">
            <label htmlFor="listed_price" className="survey-label">
              Listed Price
            </label>
            <input
              type="text"
              id="listed_price"
              name="listed_price"
              value={formData.listed_price}
              onChange={handleChange}
              placeholder="e.g., $5000"
              className="survey-input"
            />
          </div>
          <div className="survey-col">
            <label htmlFor="target_price" className="survey-label">
              Your Target Price
            </label>
            <input
              type="text"
              id="target_price"
              name="target_price"
              value={formData.target_price}
              onChange={handleChange}
              placeholder="e.g., $4500"
              className="survey-input"
            />
          </div>
          <div className="survey-col">
            <label htmlFor="max_price" className="survey-label">
              Your Max Price
            </label>
            <input
              type="text"
              id="max_price"
              name="max_price"
              value={formData.max_price}
              onChange={handleChange}
              placeholder="e.g., $5000"
              className="survey-input"
            />
          </div>
        </div>

        <div className="survey-section">
          <label htmlFor="ideal_extras" className="survey-label">
            Ideal Extras (bundle, warranty, etc)
          </label>
          <textarea
            id="ideal_extras"
            name="ideal_extras"
            value={formData.ideal_extras}
            onChange={handleChange}
            placeholder="e.g., AppleCare+, Free shipping, 1-year warranty"
            className="survey-textarea"
            rows="2"
          />
        </div>

        <div className="survey-section">
          <label htmlFor="urgency" className="survey-label">
            Urgency: When do you need it?
          </label>
          <input
            type="text"
            id="urgency"
            name="urgency"
            value={formData.urgency}
            onChange={handleChange}
            placeholder="e.g., ASAP, this week, flexible"
            className="survey-input"
          />
        </div>

        <div className="survey-section">
          <label htmlFor="seller_type" className="survey-label">
            Seller Type
          </label>
          <select
            id="seller_type"
            name="seller_type"
            value={formData.seller_type}
            onChange={handleChange}
            className="survey-select"
          >
            <option value="">Select seller type</option>
            <option value="Individual">Individual</option>
            <option value="Household">Household / Family</option>
            <option value="Small Business">Small Business</option>
            <option value="Agency">Agency</option>
            <option value="Manufacturer">Manufacturer</option>
            <option value="Dealership">Dealership</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div className="survey-section">
          <label htmlFor="private_notes" className="survey-label">
            Private Notes (for your reference only)
          </label>
          <textarea
            id="private_notes"
            name="private_notes"
            value={formData.private_notes}
            onChange={handleChange}
            placeholder="e.g., Seller seemed hesitant at first, be patient. Has 5 reviews on platform."
            className="survey-textarea"
            rows="3"
          />
        </div>

        <div className="survey-actions">
          <button
            type="submit"
            disabled={loading || !formData.item_listing.trim()}
            className="survey-btn survey-btn--primary"
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
          {submitted && (
            <p className="survey-success">✓ Information saved</p>
          )}
        </div>
      </form>
        )}
      </div>
    </div>
  )
}
