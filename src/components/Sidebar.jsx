import { useState } from 'react'
import './Sidebar.css'

const IconNewProject = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 5v14M5 12h14" />
  </svg>
)

const IconSearch = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.35-4.35" />
  </svg>
)

const IconChat = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
)

const IconProject = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
  </svg>
)

const IconChevronUp = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M18 15l-6-6-6 6" />
  </svg>
)

export default function Sidebar({
  isOpen,
  projects,
  activeProjectId,
  onNewProject,
  onSelectProject,
  chatsLoading,
  user,
}) {
  const [search, setSearch] = useState('')

  const filteredProjects = search.trim()
    ? projects.filter((c) => (c.title || '').toLowerCase().includes(search.toLowerCase()))
    : projects

  if (!isOpen) return null

  return (
    <aside className="sidebar">
      <div className="sidebar-inner">
        <button type="button" className="sidebar-new-chat" onClick={onNewProject}>
          <span className="sidebar-new-chat-icon">
            <IconNewProject />
          </span>
          New project
        </button>
        <div className="sidebar-search-wrap">
          <span className="sidebar-search-icon">
            <IconSearch />
          </span>
          <input
            type="text"
            className="sidebar-search"
            placeholder="Search past projects"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <nav className="sidebar-nav">
          <div className="sidebar-nav-item active">
            <IconProject />
            <span>Past projects</span>
          </div>
        </nav>
        <div className="sidebar-chats">
          <h2 className="sidebar-chats-title">Past projects</h2>
          <ul className="sidebar-chat-list">
            {chatsLoading ? (
              <li className="sidebar-chats-loading">Loading…</li>
            ) : filteredProjects.length === 0 ? (
              <li className="sidebar-chats-empty">No projects yet</li>
            ) : (
              filteredProjects.map((project) => (
                <li key={project.id}>
                  <button
                    type="button"
                    className={`sidebar-chat-item ${activeProjectId === project.id ? 'active' : ''}`}
                    onClick={() => onSelectProject(project.id)}
                  >
                    <span className="sidebar-chat-item-icon"><IconChat /></span>
                    <span className="sidebar-chat-item-text">{project.title}</span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
        <div className="sidebar-user">
          <div className="sidebar-avatar">
            {(user?.name || 'U').charAt(0).toUpperCase()}
          </div>
          <div className="sidebar-user-info">
            <span className="sidebar-user-name">{user?.name || 'User'}</span>
            <span className="sidebar-user-badge">Pro</span>
          </div>
          <button type="button" className="sidebar-chevron" aria-label="Expand">
            <IconChevronUp />
          </button>
        </div>
      </div>
    </aside>
  )
}
