import { useState, useEffect, useCallback } from 'react'
import { useAuth } from './context/AuthContext'
import * as api from './api'
import { messageCache, projectCache, metadataCache, clearAllCaches } from './cache'
import Header from './components/Header'
import Sidebar from './components/Sidebar'
import Main from './components/Main'
import Login from './pages/Login'
import Register from './pages/Register'
import './App.css'

function App() {
  const { user, loading } = useAuth()
  const [authMode, setAuthMode] = useState('login') // 'login' | 'register'

  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [projects, setProjects] = useState([])
  const [activeProjectId, setActiveProjectId] = useState(null)
  const [activeMode, setActiveMode] = useState('chat')
  const [messages, setMessages] = useState([])
  const [chatLoading, setChatLoading] = useState(false)
  const [sendLoading, setSendLoading] = useState(false)
  const [selectedModel, setSelectedModel] = useState('gpt-4o-mini')
  const [pagination, setPagination] = useState({ limit: 50, offset: 0, total: 0, hasMore: false })

  const loadProjects = useCallback(async () => {
    if (!user) return

    // Check cache first
    const cached = projectCache.get()
    if (cached) {
      setProjects(cached)
      return
    }

    setChatLoading(true)
    try {
      const list = await api.getChats()
      projectCache.set(list)
      setProjects(list)
    } catch (err) {
      console.error('Failed to load projects', err)
    } finally {
      setChatLoading(false)
    }
  }, [user])

  // Load projects only when user logs in
  useEffect(() => {
    if (user) {
      loadProjects()
    }
  }, [user])

  const loadProjectMessages = useCallback(async (id, mode = activeMode) => {
    // Check cache first - if messages are cached, use them
    const cachedMessages = messageCache.get(id, mode)
    if (cachedMessages) {
      setMessages(cachedMessages)
      setPagination({ limit: 50, offset: 0, total: cachedMessages.length, hasMore: false })
      return
    }

    setChatLoading(true)
    setMessages([])
    try {
      const includeContext = mode === 'negotiation'
      const project = await api.getChat(id, mode, includeContext, 50, 0)
      const msgs = project.messages || []
      messageCache.set(id, mode, msgs)
      setMessages(msgs)
      setPagination(project.pagination || { limit: 50, offset: 0, total: msgs.length, hasMore: false })
    } catch (err) {
      console.error('Failed to load project', err)
      setMessages([])
      setPagination({ limit: 50, offset: 0, total: 0, hasMore: false })
    } finally {
      setChatLoading(false)
    }
  }, [activeMode])

  const handleNewProject = useCallback(async () => {
    try {
      const project = await api.createChat({ title: 'New project', category: 'project' })
      setProjects((prev) => [{ ...project, children: [] }, ...prev])
      projectCache.invalidate()
      setActiveProjectId(project.id)
      setActiveMode('chat')
      setMessages([])
    } catch (err) {
      console.error('Failed to create project', err)
    }
  }, [])

  const handleDeleteProject = useCallback(async (projectId) => {
    try {
      await api.deleteChat(projectId)
      setProjects((prev) => prev.filter((p) => p.id !== projectId))
      projectCache.invalidate()
      messageCache.invalidate(projectId)
      if (activeProjectId === projectId) {
        setActiveProjectId(null)
        setMessages([])
      }
    } catch (err) {
      console.error('Failed to delete project', err)
      alert('Failed to delete project')
    }
  }, [activeProjectId])

  const handleDeleteChat = useCallback(async (chatId) => {
    try {
      await api.deleteChat(chatId)
      setProjects((prev) =>
        prev.map((project) => ({
          ...project,
          children: (project.children || []).filter((chat) => chat.id !== chatId),
        }))
      )
      projectCache.invalidate()
      messageCache.invalidate(chatId)
      if (activeProjectId === chatId) {
        setActiveProjectId(null)
        setMessages([])
      }
    } catch (err) {
      console.error('Failed to delete chat', err)
      alert('Failed to delete chat')
    }
  }, [activeProjectId])

  const handleCreateChat = useCallback(async (projectId) => {
    try {
      const chat = await api.createChat({ title: 'New chat', category: 'chat', parent_id: projectId })
      setProjects((prev) =>
        prev.map((project) => {
          if (project.id === projectId) {
            return {
              ...project,
              children: [chat, ...(project.children || [])],
            }
          }
          return project
        })
      )
      projectCache.invalidate()
    } catch (err) {
      console.error('Failed to create chat', err)
      alert('Failed to create chat')
    }
  }, [])

  const handleRename = useCallback(async (itemId, newTitle) => {
    try {
      await api.updateChatTitle(itemId, newTitle)
      setProjects((prev) =>
        prev.map((project) => {
          if (project.id === itemId) {
            return { ...project, title: newTitle }
          }
          // Check if it's a nested chat
          return {
            ...project,
            children: (project.children || []).map((chat) =>
              chat.id === itemId ? { ...chat, title: newTitle } : chat
            ),
          }
        })
      )
      projectCache.invalidate()
    } catch (err) {
      console.error('Failed to rename:', err)
      throw err
    }
  }, [])

  const handleSelectProject = useCallback((id) => {
    if (id === activeProjectId) return
    setActiveProjectId(id)
  }, [activeProjectId])

  const handleModeChange = useCallback((mode) => {
    setActiveMode(mode)
  }, [])

  const handleLoadEarlierMessages = useCallback(async () => {
    if (!activeProjectId || !pagination.hasMore) return
    
    try {
      const result = await api.loadEarlierMessages(activeProjectId, activeMode, pagination.offset + pagination.limit)
      setMessages((prev) => [...result.messages, ...prev])
      setPagination(result.pagination)
    } catch (err) {
      console.error('Failed to load earlier messages', err)
    }
  }, [activeProjectId, activeMode, pagination])

  useEffect(() => {
    if (!activeProjectId) return
    loadProjectMessages(activeProjectId, activeMode)
  }, [activeProjectId, activeMode])

  const handleSendMessage = useCallback(async (text, images = []) => {
    if (!text.trim() && images.length === 0) return
    const userMessage = { role: 'user', mode: activeMode, content: text, images }
    setMessages((prev) => [...prev, userMessage])
    setSendLoading(true)

    let projectId = activeProjectId
    if (!projectId) {
      try {
        const project = await api.createChat({ title: 'New project', category: 'project' })
        setProjects((prev) => [{ ...project, children: [] }, ...prev])
        setActiveProjectId(project.id)
        projectId = project.id
        setMessages([])
        setMessages([userMessage])
      } catch (err) {
        setSendLoading(false)
        setMessages((prev) => [...prev, { role: 'assistant', content: err.message || 'Could not create project. Is the backend running? (cd server && npm run dev)' }])
        return
      }
    }

    try {
      const result = await api.sendMessage(projectId, text, selectedModel, activeMode, images)
      const newMessages = [{ ...result.userMessage, images }, result.assistantMessage]
      setMessages((prev) => {
        const withoutLast = prev.slice(0, -1)
        return [...withoutLast, ...newMessages]
      })
      // Update cache with new messages
      messageCache.set(projectId, activeMode, [...messages, ...newMessages])
      if (result.chatTitle) {
        setProjects((prev) =>
          prev.map((project) => {
            if (project.id === projectId) {
              return { ...project, title: result.chatTitle }
            }
            // Check if it's a nested chat
            return {
              ...project,
              children: (project.children || []).map((chat) =>
                chat.id === projectId ? { ...chat, title: result.chatTitle } : chat
              ),
            }
          })
        )
      }
    } catch (err) {
      setMessages((prev) => {
        const withoutLast = prev.slice(0, -1)
        return [...withoutLast, userMessage, { role: 'assistant', content: err.message || 'Failed to get response.' }]
      })
    } finally {
      setSendLoading(false)
    }
  }, [activeProjectId, activeMode, selectedModel])

  useEffect(() => {
    if (!user) {
      setProjects([])
      setActiveProjectId(null)
      setMessages([])
      return
    }
    setActiveProjectId(null)
    setActiveMode('chat')
    setMessages([])
  }, [user])

  // Determine if currently viewing a project (not a chat within a project)
  const isViewingProject = useCallback(() => {
    if (!activeProjectId) return false
    const project = projects.find((p) => p.id === activeProjectId)
    if (project) return true // It's a top-level project
    // Check if it's a chat within a project
    const chat = projects.flatMap((p) => p.children || []).find((c) => c.id === activeProjectId)
    return false // It's a chat, not a project
  }, [activeProjectId, projects])

  if (loading) {
    return (
      <div className="app app-loading">
        <div className="loading-spinner" />
        <p>Loading…</p>
      </div>
    )
  }

  if (!user) {
    return authMode === 'login' ? (
      <Login onSwitchToRegister={() => setAuthMode('register')} />
    ) : (
      <Register onSwitchToLogin={() => setAuthMode('login')} />
    )
  }

  return (
    <div className="app">
      <Header
        onMenuClick={() => setSidebarOpen((o) => !o)}
        user={user}
        selectedModel={selectedModel}
        onSelectModel={setSelectedModel}
        token={localStorage.getItem('haggle_token')}
        messageCount={messages.length}
      />
      <div className="app-body">
        <Sidebar
          isOpen={sidebarOpen}
          projects={projects}
          activeProjectId={activeProjectId}
          onNewProject={handleNewProject}
          onSelectProject={handleSelectProject}
          chatsLoading={chatLoading}
          user={user}
          onDeleteProject={handleDeleteProject}
          onDeleteChat={handleDeleteChat}
          onCreateChat={handleCreateChat}
          onRename={handleRename}
        />
        <Main
          messages={messages}
          onSendMessage={handleSendMessage}
          isEmpty={messages.length === 0}
          sendLoading={sendLoading}
          chatLoading={chatLoading}
          activeMode={activeMode}
          onModeChange={handleModeChange}
          hasProject={Boolean(activeProjectId)}
          activeProjectId={activeProjectId}
          isViewingProject={isViewingProject()}
          pagination={pagination}
          onLoadEarlier={handleLoadEarlierMessages}
        />
      </div>
    </div>
  )
}

export default App
