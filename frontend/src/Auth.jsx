import { useState } from 'react'
import axios from 'axios'
import { Mic, UploadCloud, SquarePlay, MessageCircle, Sun, Moon, ArrowLeft } from 'lucide-react'

const API = 'http://127.0.0.1:8000'

const features = [
  { Icon: Mic, title: 'Live Recording', text: 'Record lectures in real time and get instant notes.' },
  { Icon: UploadCloud, title: 'Upload Audio', text: 'Upload audio files and let AI generate smart notes.' },
  { Icon: SquarePlay, title: 'YouTube Transcription', text: 'Paste a YouTube link and extract transcripts.' },
  { Icon: MessageCircle, title: 'Ask Questions', text: 'Ask anything from your lectures and get answers.' },
]

export default function Auth({ onLogin }) {
  // mode: 'login' | 'register'
  const [mode, setMode] = useState('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [theme, setTheme] = useState('light')

  async function handleSubmit() {
    setError('')

    if (mode === 'login') {
      if (!email || !password) return
      setLoading(true)
      try {
        const r = await axios.post(`${API}/auth/login`, { email, password })
        localStorage.setItem('taleem_token', r.data.token)
        localStorage.setItem('taleem_user', JSON.stringify(r.data.user))
        onLogin(r.data.user, r.data.token)
      } catch (e) {
        setError(e.response?.data?.detail || 'Something went wrong')
      }
      setLoading(false)

    } else if (mode === 'register') {
      if (!email || !password || !name) return
      setLoading(true)
      try {
        const r = await axios.post(`${API}/auth/register`, { email, password, name })
        localStorage.setItem('taleem_token', r.data.token)
        localStorage.setItem('taleem_user', JSON.stringify(r.data.user))
        onLogin(r.data.user, r.data.token)
      } catch (e) {
        setError(e.response?.data?.detail || 'Something went wrong')
      }
      setLoading(false)
    }
  }

  function toggleMode() {
    setMode(mode === 'login' ? 'register' : 'login')
    setError('')
  }

  const titles = {
    login: { h: 'Welcome Back!', p: 'Login to continue your learning journey' },
    register: { h: 'Create Account', p: 'Join Taleem.AI and start learning smarter' },
  }

  return (
    <div className={`auth-page theme-${theme}`}>
      <div className="theme-switch">
        <button 
          className="top-icon" 
          onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} 
          title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>

      <section className="auth-left">
        <div className="brand-row">
          <img className="auth-brand-logo" src="/images/taleem-logo.png" alt="Taleem.AI logo" />
          <h1>Taleem.<span>AI</span></h1>
        </div>
        <h2>Your AI Assistant<br /><span>for Smarter Learning</span></h2>
        <p>Transcribe lectures, generate notes, ask questions, and learn faster with AI.</p>
        <div className="auth-showcase">
          <div className="feature-list">
            {features.map((feature) => (
              <div key={feature.title} className="feature-item">
                <div className="feature-icon"><feature.Icon size={18} /></div>
                <div>
                  <h3>{feature.title}</h3>
                  <p>{feature.text}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="auth-visual">
            <img src="/images/learning-illustration.png" alt="Learning illustration" />
          </div>
        </div>
      </section>

      <section className="auth-right">
        <div className="auth-card">
          <h3>{titles[mode].h}</h3>
          <p>{titles[mode].p}</p>

          {mode === 'register' && (
            <div className="field">
              <label>Full Name</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter your full name" />
            </div>
          )}

          <div className="field">
            <label>Email Address</label>
            <input
              type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            />
          </div>

          <div className="field">
            <label>Password</label>
            <input
              type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            />
          </div>

          {error && <div className="auth-error">{error}</div>}

          <button className="auth-submit" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Please wait...' : mode === 'login' ? 'Login' : 'Create Account'}
          </button>

          <div className="auth-divider">or continue with</div>
          <button className="social-btn" type="button" disabled title="Coming soon">
            <svg width="16" height="16" viewBox="0 0 48 48"><path fill="#4285F4" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#34A853" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59a14.5 14.5 0 0 1 0-9.18l-7.98-6.19a24.042 24.042 0 0 0 0 21.56l7.98-6.19z"/><path fill="#EA4335" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
            Continue with Google
            <span style={{fontSize:10,opacity:0.5,marginLeft:6}}>Soon</span>
          </button>
          <button className="social-btn" type="button" disabled title="Coming soon">
            <span className="social-icon microsoft-icon"><i /><i /><i /><i /></span>
            Continue with Microsoft
            <span style={{fontSize:10,opacity:0.5,marginLeft:6}}>Soon</span>
          </button>

          <div className="auth-switch">
            {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}
            <button type="button" onClick={toggleMode}>
              {mode === 'login' ? 'Sign up' : 'Login'}
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}