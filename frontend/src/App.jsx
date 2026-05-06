import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import Auth from './Auth'
import LecturesSidebar from './components/LecturesSidebar'
import MainPanel from './components/MainPanel'
import NotesPanel from './components/NotesPanel'
import UploadModal from './components/UploadModal'
import YoutubeModal from './components/YoutubeModal'
import LiveModal from './components/LiveModal'
import { Sun, Moon, LogOut, Key } from 'lucide-react'
import './index.css'

const API = 'http://127.0.0.1:8000'

// ── Utility functions ────────────────────────────────────────────────────

function prettyDate(str) {
  if (!str) return ''
  return new Date(str).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })
}

function generateTitle(session) {
  if (!session) return ''

  const transcript = session.transcript || ''
  if (transcript.length > 10) {
    // Extract first meaningful sentence
    const sentences = transcript.split(/[.!?]+/).filter(s => s.trim().length > 5)
    if (sentences.length > 0) {
      let raw = sentences[0].trim()
      // Strip filler words from start
      raw = raw.replace(/^(so|well|you know|okay|right|hello|welcome|hey|thanks|thank you|today|now|let's|let us|we will|we are going to|in this|this is)\s+/gi, '')
      // Remove common connecting words for a tighter title
      const stopWords = new Set(['the','a','an','is','are','was','were','of','and','to','in','for','on','with','that','this','it','we','i','you','they','my','our','about','from','by','at','as','or','but','not','be','been','have','has','had','do','does','did','will','would','can','could','should','may','might','into','also','very','just','then','than','more','most','some','all','each','every','any'])
      const words = raw.split(/\s+/).filter(w => !stopWords.has(w.toLowerCase()))
      // Take first 3 meaningful words for concise sidebar titles
      const titleWords = words.slice(0, 3)
      if (titleWords.length > 0) {
        // Capitalize each word
        return titleWords.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')
      }
    }
  }

  // Fallback: stored title
  let title = session.title || 'Lecture'
  title = title.replace(/\.(mp3|wav|m4a|ogg|webm|mp4)$/i, '')
  if (title.startsWith('http')) return 'YouTube Lecture'
  if (title === 'Live Recording') return 'Live Lecture'
  return title || 'Lecture'
}

function formatNotes(rawNotes) {
  if (!rawNotes) return ''
  let html = ''
  const lines = rawNotes.split('\n')
  
  // Keywords that should be styled as red headings
  const redHeadings = ['overview', 'key concepts', 'core discussion points', 'important points', 'examples', 'summary', 'q&a', 'questions and answers', 'jaeeza', 'aham tasavvurot', 'aham nukat', 'aham bahas', 'misalein', 'khulaasa', 'sawaalat aur jawabat', 'جائزہ', 'اہم تصورات', 'اہم نکات', 'اہم بحث', 'مثالیں', 'خلاصہ', 'سوالات و جوابات']

  for (let line of lines) {
    let trimmed = line.trim()
    
    // Remove markdown formatting (##, **, etc.) from anywhere in the line
    trimmed = trimmed.replace(/^\#+\s*/g, '').replace(/^\*\*/, '').replace(/\*\*$/, '')
    
    // Check if this line is a heading (with or without special characters)
    const cleanedForCheck = trimmed.replace(/\*\*/g, '').replace(/[\[\]]/g, '')
    const isRedHeading = redHeadings.some(heading => 
      cleanedForCheck.toLowerCase() === heading || 
      cleanedForCheck.toLowerCase().includes(heading)
    )

    if (trimmed && isRedHeading) {
      // Style as red heading
      const safe = trimmed.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      html += `<div style="color:rgb(229, 53, 129); font-weight: 700; font-size: 15px; margin-top: 16px; margin-bottom: 8px;">${safe}</div>`
    } else if (trimmed) {
      // Remove any remaining ** or ## characters and escape HTML
      const cleaned = trimmed.replace(/\*\*/g, '').replace(/#+/g, '')
      const safe = cleaned.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      html += `<div style="margin-bottom: 8px;">${safe}</div>`
    } else {
      html += '<br />'
    }
  }
  return html
}

// ── Main App ─────────────────────────────────────────────────────────────

export default function App() {
  // Auth state
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('taleem_user')
    return saved ? JSON.parse(saved) : null
  })
  const [token, setToken] = useState(() => localStorage.getItem('taleem_token') || '')

  // Session state
  const [sessions, setSessions] = useState([])
  const [activeSession, setActiveSession] = useState(null)
  const [sessionsLoading, setSessionsLoading] = useState(true)
  const [sessionLoading, setSessionLoading] = useState(false)

  // UI state
  const [modal, setModal] = useState(null)
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState('')
  const [error, setError] = useState('')
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('taleem_dark') === 'true')

  // Notes panel state
  const [activeTab, setActiveTab] = useState('notes')
  const [qaMessages, setQaMessages] = useState([])
  const [question, setQuestion] = useState('')
  const [qaLoading, setQaLoading] = useState(false)

  // Upload modal state
  const [file, setFile] = useState(null)
  const [dragging, setDragging] = useState(false)

  // YouTube modal state
  const [ytUrl, setYtUrl] = useState('')

  // User menu and change password state
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [oldPass, setOldPass] = useState('')
  const [newPass, setNewPass] = useState('')
  const [changePassStatus, setChangePassStatus] = useState({ loading: false, error: '', success: '' })

  const userMenuRef = useRef(null)

  // Live recording state
  const [recording, setRecording] = useState(false)
  const [recSeconds, setRecSeconds] = useState(0)
  const mediaRecRef = useRef(null)
  const timerRef = useRef(null)
  const wsRef = useRef(null)

  // ── Effects ──────────────────────────────────────────────────────────

  useEffect(() => {
    function handleClickOutside(event) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (token) {

      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
    }
    loadSessions()
  }, [token])

  // ── Session handlers ─────────────────────────────────────────────────

  async function loadSessions() {
    setSessionsLoading(true)
    try {
      const r = await axios.get(`${API}/sessions`)
      setSessions(r.data.sessions || [])
    } catch {}
    setSessionsLoading(false)
  }

  async function openSession(id) {
    setSessionLoading(true)
    try {
      const r = await axios.get(`${API}/sessions/${id}`)
      setActiveSession(r.data)
      setQaMessages([])
      setActiveTab('notes')
    } catch { setError('Failed to load session') }
    setSessionLoading(false)
  }

  async function deleteSession(e, id) {
    e.stopPropagation()
    if (!confirm('Delete?')) return
    await axios.delete(`${API}/sessions/${id}`)
    if (activeSession?.id === id) setActiveSession(null)
    loadSessions()
  }

  function newSession() {
    setActiveSession(null)
    setQaMessages([])
    setError('')
    setFile(null)
  }

  // ── Pipeline handlers ────────────────────────────────────────────────

  async function handleUpload() {
    if (!file) return
    setLoading(true); setError(''); setStep('uploading')
    try {
      const fd = new FormData()
      fd.append('file', file)
      setStep('transcribing')
      const r = await axios.post(`${API}/transcribe-and-summarize`, fd)
      setModal(null); setFile(null)
      await loadSessions()
      await openSession(r.data.session_id)
    } catch (e) {
      setError(e.response?.data?.detail || 'Upload error')
    }
    setLoading(false); setStep('')
  }

  async function handleYoutube() {
    if (!ytUrl.trim()) return
    setLoading(true); setError(''); setStep('downloading')
    try {
      setStep('transcribing')
      const r = await axios.post(`${API}/transcribe-youtube`, { url: ytUrl })
      setModal(null); setYtUrl('')
      await loadSessions()
      await openSession(r.data.session_id)
    } catch (e) {
      setError(e.response?.data?.detail || 'YouTube error')
    }
    setLoading(false); setStep('')
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const ws = new WebSocket(`ws://127.0.0.1:8000/record-live?token=${encodeURIComponent(token)}`)
      wsRef.current = ws
      ws.onopen = () => {
        const mr = new MediaRecorder(stream, { mimeType: 'audio/webm' })
        mediaRecRef.current = mr
        mr.ondataavailable = (e) => {
          if (e.data.size > 0) ws.send(e.data)
        }
        mr.start(1000)
        setRecording(true)
        timerRef.current = setInterval(() => setRecSeconds(s => s + 1), 1000)
      }
      ws.onmessage = async (e) => {
        const msg = JSON.parse(e.data)
        if (msg.success) {
          setModal(null); setRecording(false); setRecSeconds(0)
          clearInterval(timerRef.current)
          stream.getTracks().forEach(t => t.stop())
          await loadSessions()
          await openSession(msg.session_id)
          setLoading(false)
        } else if (msg.status === 'transcribing') {
          setStep('transcribing')
        } else if (msg.error) {
          setError(msg.error); setLoading(false)
        }
      }
    } catch (e) {
      setError('Mic access denied: ' + e.message)
    }
  }

  function stopRecording() {
    clearInterval(timerRef.current)
    setLoading(true); setStep('processing')
    mediaRecRef.current?.stop()
    wsRef.current?.send(new TextEncoder().encode('END'))
  }

  // ── Q&A handler ──────────────────────────────────────────────────────

  async function askQuestion() {
    if (!question.trim() || !activeSession) return
    const q = question
    setQuestion('')
    setQaMessages(prev => [...prev, { role: 'user', text: q }])
    setQaLoading(true)
    try {
      const r = await axios.post(`${API}/ask`, { session_id: activeSession.id, question: q })
      setQaMessages(prev => [...prev, { role: 'ai', text: r.data.answer }])
    } catch {
      setQaMessages(prev => [...prev, { role: 'ai', text: '❌ Answer not found.' }])
    }
    setQaLoading(false)
  }

  // ── Export handler ───────────────────────────────────────────────────

  async function handleExport() {
    if (!activeSession) return
    try {
      const r = await axios.post(`${API}/export`, {
        title: activeSession.title,
        transcript: activeSession.transcript,
        notes: activeSession.notes
      }, { responseType: 'blob' })
      const url = URL.createObjectURL(r.data)
      const a = document.createElement('a')
      a.href = url; a.download = 'TaleemAI_Notes.docx'; a.click()
      URL.revokeObjectURL(url)
    } catch { setError('Export error') }
  }

  // ── Theme toggle ─────────────────────────────────────────────────────

  function toggleDarkMode() {
    setDarkMode(prev => {
      const next = !prev
      localStorage.setItem('taleem_dark', String(next))
      return next
    })
  }

  // ── Auth handlers ────────────────────────────────────────────────────

  function handleLogin(userData, userToken) {
    setUser(userData)
    setToken(userToken)
    axios.defaults.headers.common['Authorization'] = `Bearer ${userToken}`
  }

  function handleLogout() {
    localStorage.removeItem('taleem_token')
    localStorage.removeItem('taleem_user')
    setUser(null)
    setToken('')
    setSessions([])
    setActiveSession(null)
    delete axios.defaults.headers.common['Authorization']
  }

  async function handleChangePassword() {
    if (!oldPass || !newPass) return
    setChangePassStatus({ loading: true, error: '', success: '' })
    try {
      await axios.post(`${API}/auth/change-password`, { old_password: oldPass, new_password: newPass })
      setChangePassStatus({ loading: false, error: '', success: 'Password changed successfully!' })
      setOldPass(''); setNewPass('')
      setTimeout(() => {
        setModal(null)
        setChangePassStatus(prev => ({ ...prev, success: '' }))
      }, 2000)
    } catch (e) {
      setChangePassStatus({ loading: false, error: e.response?.data?.detail || 'Failed to change password', success: '' })
    }
  }

  // ── Render ───────────────────────────────────────────────────────────

  if (!user) return <Auth onLogin={handleLogin} />

  return (
    <div className={`dashboard-shell ${darkMode ? 'dark' : ''}`}>
      {/* ── Topbar ── */}
      <header className="topbar">
        <div className="brand-row">
          <img className="brand-logo" src="/images/taleem-logo.png" alt="Taleem.AI logo" />
          <h1>Taleem.<span>AI</span></h1>
        </div>
        <div className="topbar-right">
          <button className="top-icon" onClick={toggleDarkMode} title={darkMode ? 'Light mode' : 'Dark mode'}>
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          
          <div className="user-menu-wrap" ref={userMenuRef}>
            <button className="user-chip" onClick={() => setUserMenuOpen(!userMenuOpen)}>
              <span>{user?.name?.[0]?.toUpperCase() || 'U'}</span>
              <strong>Hello, {user?.name || 'User'}</strong>
            </button>
            
            {userMenuOpen && (
              <div className="user-menu">
                <button className="user-menu-item" onClick={() => { setModal('password'); setUserMenuOpen(false) }}>
                  <Key size={16} />
                  Change Password
                </button>
                <button className="user-menu-item logout" onClick={handleLogout}>
                  <LogOut size={16} />
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── Three-column layout ── */}
      <div className="dashboard-body">
        <LecturesSidebar
          sessions={sessions}
          activeSession={activeSession}
          sessionsLoading={sessionsLoading}
          openSession={openSession}
          deleteSession={deleteSession}
          newSession={newSession}
          generateTitle={generateTitle}
          prettyDate={prettyDate}
        />

        <MainPanel
          key={activeSession ? `main-${activeSession.id}` : 'main-new'}
          user={user}
          error={error}
          loading={loading}
          step={step}
          activeSession={activeSession}
          setModal={setModal}
          setActiveTab={setActiveTab}
        />

        <NotesPanel
          key={activeSession ? `notes-${activeSession.id}` : 'notes-new'}
          activeSession={activeSession}
          sessionLoading={sessionLoading}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          qaMessages={qaMessages}
          qaLoading={qaLoading}
          question={question}
          setQuestion={setQuestion}
          askQuestion={askQuestion}
          handleExport={handleExport}
          generateTitle={generateTitle}
          formatNotes={formatNotes}
          prettyDate={prettyDate}
        />
      </div>

      {/* ── Modals ── */}
      {modal === 'upload' && (
        <UploadModal
          loading={loading}
          step={step}
          error={error}
          file={file}
          setFile={setFile}
          dragging={dragging}
          setDragging={setDragging}
          handleUpload={handleUpload}
          onClose={() => setModal(null)}
        />
      )}

      {modal === 'youtube' && (
        <YoutubeModal
          loading={loading}
          step={step}
          error={error}
          ytUrl={ytUrl}
          setYtUrl={setYtUrl}
          handleYoutube={handleYoutube}
          onClose={() => setModal(null)}
        />
      )}

      {modal === 'live' && (
        <LiveModal
          loading={loading}
          step={step}
          error={error}
          recording={recording}
          recSeconds={recSeconds}
          startRecording={startRecording}
          stopRecording={stopRecording}
          onClose={() => setModal(null)}
        />
      )}

      {modal === 'password' && (
        <div className="modal-overlay">
          <div className="modal">
            <button className="modal-close" onClick={() => setModal(null)}>×</button>
            <h2><Key size={24} /> Change Password</h2>
            <p className="text-muted mb-16">Update your account password securely.</p>

            <div className="gap-8">
              <div className="field">
                <label>Current Password</label>
                <input 
                  type="password" 
                  className="input" 
                  value={oldPass} 
                  onChange={(e) => setOldPass(e.target.value)} 
                  placeholder="Enter current password"
                />
              </div>
              <div className="field">
                <label>New Password</label>
                <input 
                  type="password" 
                  className="input" 
                  value={newPass} 
                  onChange={(e) => setNewPass(e.target.value)} 
                  placeholder="Enter new password"
                />
              </div>
            </div>

            {changePassStatus.error && <div className="alert alert-error mt-16">{changePassStatus.error}</div>}
            {changePassStatus.success && <div className="alert alert-success mt-16" style={{background:'#e6f9f0', border:'1px solid #b3eacd', color:'#1a8a5c'}}>{changePassStatus.success}</div>}

            <div className="mt-16 flex-row">
              <button 
                className="btn btn-teal" 
                onClick={handleChangePassword} 
                disabled={changePassStatus.loading || !oldPass || !newPass}
                style={{flex: 1}}
              >
                {changePassStatus.loading ? 'Updating...' : 'Update Password'}
              </button>
              <button className="btn btn-outline" onClick={() => setModal(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}