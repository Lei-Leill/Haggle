import { useState, useEffect, useCallback } from 'react'
import { useAuth } from './context/AuthContext'
import * as api from './api'
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

  const loadProjects = useCallback(async () => {
    if (!user) return
    setChatLoading(true)
    try {
      const list = await api.getChats()
      setProjects(list)
    } catch (err) {
      console.error('Failed to load projects', err)
    } finally {
      setChatLoading(false)
    }
  }, [user])

  useEffect(() => {
    loadProjects()
  }, [loadProjects])

  const loadProjectMessages = useCallback(async (id, mode = activeMode) => {
    setChatLoading(true)
    try {
      const project = await api.getChat(id, mode)
      setMessages(project.messages || [])
    } catch (err) {
      console.error('Failed to load project', err)
      setMessages([])
    } finally {
      setChatLoading(false)
    }
  }, [activeMode])

  const handleNewProject = useCallback(async () => {
    try {
      const project = await api.createChat({ title: 'New project', category: 'project' })
      setProjects((prev) => [project, ...prev])
      setActiveProjectId(project.id)
      setActiveMode('chat')
      setMessages([])
    } catch (err) {
      console.error('Failed to create project', err)
    }
  }, [])

  const handleSelectProject = useCallback((id) => {
    if (id === activeProjectId) return
    setActiveProjectId(id)
  }, [activeProjectId])

  const handleModeChange = useCallback((mode) => {
    setActiveMode(mode)
  }, [])

  useEffect(() => {
    if (!activeProjectId) return
    loadProjectMessages(activeProjectId, activeMode)
  }, [activeProjectId, activeMode, loadProjectMessages])

  const handleSendMessage = useCallback(async (text) => {
    if (!text.trim()) return
    let projectId = activeProjectId
    if (!projectId) {
      try {
        const project = await api.createChat({ title: 'New project', category: 'project' })
        setProjects((prev) => [project, ...prev])
        setActiveProjectId(project.id)
        projectId = project.id
        setMessages([])
      } catch (err) {
        console.error('Failed to create project', err)
        return
      }
    }
    setSendLoading(true)
    const userMessage = { role: 'user', mode: activeMode, content: text }
    setMessages((prev) => [...prev, userMessage])
    try {
      const result = await api.sendMessage(projectId, text, selectedModel, activeMode)
      setMessages((prev) => {
        const withoutLast = prev.slice(0, -1)
        return [...withoutLast, result.userMessage, result.assistantMessage]
      })
      if (result.chatTitle) {
        setProjects((prev) =>
          prev.map((c) => (c.id === projectId ? { ...c, title: result.chatTitle } : c))
        )
      }
    } catch (err) {
      setMessages((prev) => prev.slice(0, -1))
      console.error('Failed to send message', err)
      setMessages((prev) => [...prev, userMessage, { role: 'assistant', mode: activeMode, content: err.message || 'Failed to get response.' }])
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
        />
        <Main
          messages={messages}
          onSendMessage={handleSendMessage}
          isEmpty={messages.length === 0}
          sendLoading={sendLoading}
          activeMode={activeMode}
          onModeChange={handleModeChange}
          hasProject={Boolean(activeProjectId)}
        />
      </div>
    </div>
  )
}

export default App
