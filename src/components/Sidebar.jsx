import { useState } from 'react'
import * as api from '../api'
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

const IconChevronDown = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M6 9l6 6 6-6" />
  </svg>
)

const IconPlus = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 5v14M5 12h14" />
  </svg>
)

const IconTrash = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <line x1="10" y1="11" x2="10" y2="17" />
    <line x1="14" y1="11" x2="14" y2="17" />
  </svg>
)

const IconEdit = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
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
  onDeleteProject,
  onDeleteChat,
  onCreateChat,
  onRename,
}) {
  const [search, setSearch] = useState('')
  const [expandedProjects, setExpandedProjects] = useState({})
  const [deletingIds, setDeletingIds] = useState(new Set())
  const [editingId, setEditingId] = useState(null)
  const [editingTitle, setEditingTitle] = useState('')
  const [originalTitle, setOriginalTitle] = useState('')
  const [renamingIds, setRenamingIds] = useState(new Set())

  const filteredProjects = search.trim()
    ? projects.filter((p) => (p.title || '').toLowerCase().includes(search.toLowerCase()))
    : projects

  const toggleProject = (projectId) => {
    setExpandedProjects((prev) => ({
      ...prev,
      [projectId]: !prev[projectId],
    }))
  }

  const handleDeleteProject = async (projectId, e) => {
    e.stopPropagation()
    if (!window.confirm('Delete this project and all its chats?')) return
    
    setDeletingIds((prev) => new Set(prev).add(projectId))
    try {
      await onDeleteProject(projectId)
    } finally {
      setDeletingIds((prev) => {
        const next = new Set(prev)
        next.delete(projectId)
        return next
      })
    }
  }

  const handleCreateChat = async (projectId, e) => {
    e.stopPropagation()
    try {
      await onCreateChat(projectId)
      setExpandedProjects((prev) => ({
        ...prev,
        [projectId]: true,
      }))
    } catch (err) {
      console.error('Failed to create chat:', err)
    }
  }

  const handleDeleteChat = async (chatId, e) => {
    e.stopPropagation()
    if (!window.confirm('Delete this chat?')) return
    
    setDeletingIds((prev) => new Set(prev).add(chatId))
    try {
      await onDeleteChat(chatId)
    } finally {
      setDeletingIds((prev) => {
        const next = new Set(prev)
        next.delete(chatId)
        return next
      })
    }
  }

  const handleStartRename = (e, itemId, currentTitle) => {
    e.stopPropagation()
    setEditingId(itemId)
    setEditingTitle(currentTitle)
    setOriginalTitle(currentTitle)
  }

  const handleCancelRename = (e) => {
    if (e) e.stopPropagation()
    setEditingId(null)
    setEditingTitle('')
    setOriginalTitle('')
  }

  const handleSaveRename = async (itemId, e) => {
    e.stopPropagation()
    const newTitle = editingTitle.trim()
    if (!newTitle || newTitle === originalTitle) {
      handleCancelRename()
      return
    }

    setRenamingIds((prev) => new Set(prev).add(itemId))
    try {
      await onRename(itemId, newTitle)
      setEditingId(null)
      setEditingTitle('')
      setOriginalTitle('')
    } catch (err) {
      console.error('Failed to rename:', err)
      alert('Failed to rename')
    } finally {
      setRenamingIds((prev) => {
        const next = new Set(prev)
        next.delete(itemId)
        return next
      })
    }
  }

  const handleRenameKeydown = (e, itemId) => {
    if (e.key === 'Enter') {
      handleSaveRename(itemId, e)
    } else if (e.key === 'Escape') {
      handleCancelRename(e)
    }
  }

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
                <li key={project.id} className="sidebar-project-item">
                  <div className="sidebar-project-header">
                    <button
                      type="button"
                      className="sidebar-project-toggle"
                      onClick={() => toggleProject(project.id)}
                      aria-expanded={expandedProjects[project.id] || false}
                    >
                      {expandedProjects[project.id] ? <IconChevronUp /> : <IconChevronDown />}
                    </button>
                    <button
                      type="button"
                      className={`sidebar-chat-item ${activeProjectId === project.id ? 'active' : ''}`}
                      onClick={() => onSelectProject(project.id)}
                      style={{ flex: 1 }}
                      disabled={deletingIds.has(project.id) || editingId !== null}
                    >
                      {editingId === project.id ? (
                        <input
                          type="text"
                          className="sidebar-edit-input"
                          value={editingTitle}
                          onChange={(e) => setEditingTitle(e.target.value)}
                          onBlur={(e) => handleSaveRename(project.id, e)}
                          onKeyDown={(e) => handleRenameKeydown(e, project.id)}
                          onClick={(e) => e.stopPropagation()}
                          autoFocus
                        />
                      ) : (
                        <>
                          <span className="sidebar-chat-item-icon"><IconProject /></span>
                          <span className="sidebar-chat-item-text">{project.title}</span>
                        </>
                      )}
                    </button>
                    {editingId !== project.id && (
                      <>
                        <button
                          type="button"
                          className="sidebar-action-btn"
                          onClick={(e) => handleStartRename(e, project.id, project.title)}
                          title="Rename project"
                          disabled={deletingIds.has(project.id) || renamingIds.has(project.id)}
                        >
                          <IconEdit />
                        </button>
                        <button
                          type="button"
                          className="sidebar-action-btn"
                          onClick={(e) => handleCreateChat(project.id, e)}
                          title="Add chat"
                          disabled={deletingIds.has(project.id)}
                        >
                          <IconPlus />
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      className="sidebar-action-btn sidebar-action-btn--danger"
                      onClick={(e) => handleDeleteProject(project.id, e)}
                      title="Delete project"
                      disabled={deletingIds.has(project.id)}
                    >
                      <IconTrash />
                    </button>
                  </div>

                  {expandedProjects[project.id] && (
                    <ul className="sidebar-chat-list sidebar-child-chats">
                      {project.children && project.children.length > 0 ? (
                        project.children.map((chat) => (
                          <li key={chat.id}>
                            <div className="sidebar-chat-item-wrapper">
                              <button
                                type="button"
                                className={`sidebar-chat-item sidebar-child-chat ${
                                  activeProjectId === chat.id ? 'active' : ''
                                }`}
                                onClick={() => onSelectProject(chat.id)}
                                disabled={deletingIds.has(chat.id) || editingId !== null}
                              >
                                {editingId === chat.id ? (
                                  <input
                                    type="text"
                                    className="sidebar-edit-input"
                                    value={editingTitle}
                                    onChange={(e) => setEditingTitle(e.target.value)}
                                    onBlur={(e) => handleSaveRename(chat.id, e)}
                                    onKeyDown={(e) => handleRenameKeydown(e, chat.id)}
                                    onClick={(e) => e.stopPropagation()}
                                    autoFocus
                                  />
                                ) : (
                                  <>
                                    <span className="sidebar-chat-item-icon"><IconChat /></span>
                                    <span className="sidebar-chat-item-text">{chat.title}</span>
                                  </>
                                )}
                              </button>
                              {editingId !== chat.id && (
                                <button
                                  type="button"
                                  className="sidebar-action-btn sidebar-action-btn--small"
                                  onClick={(e) => handleStartRename(e, chat.id, chat.title)}
                                  title="Rename chat"
                                  disabled={deletingIds.has(chat.id) || renamingIds.has(chat.id)}
                                >
                                  <IconEdit />
                                </button>
                              )}
                              <button
                                type="button"
                                className="sidebar-action-btn sidebar-action-btn--danger sidebar-action-btn--small"
                                onClick={(e) => handleDeleteChat(chat.id, e)}
                                title="Delete chat"
                                disabled={deletingIds.has(chat.id)}
                              >
                                <IconTrash />
                              </button>
                            </div>
                          </li>
                        ))
                      ) : (
                        <li className="sidebar-chats-empty" style={{ fontSize: '12px', padding: '8px 12px' }}>
                          No chats yet
                        </li>
                      )}
                    </ul>
                  )}
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
