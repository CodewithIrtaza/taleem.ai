import {
  Mic,
  UploadCloud,
  SquarePlay,
  MessageCircle,
  Check,
} from 'lucide-react'

const STEP_LABELS = ['Uploading', 'Transcribing', 'Summarizing', 'Generating Notes', 'Completed']

export default function MainPanel({
  user,
  error,
  loading,
  step,
  activeSession,
  setModal,
  setActiveTab,
}) {
  const stepMap = {
    'uploading': 0,
    'downloading': 0,
    'transcribing': 1,
    'summarizing': 2,
    'processing': 2,
    'indexing': 3
  }
  const currentStepIndex = step && stepMap[step] !== undefined ? stepMap[step] : 0
  const progressPercent = loading ? Math.min(90, currentStepIndex * 25 + 15) : activeSession ? 100 : 0

  return (
    <main className="dashboard-main">
      {error && <div className="alert alert-error">{error}</div>}

      <section className="welcome-card">
        <h2>Welcome, {user?.name || 'Learner'}! 👋</h2>
        <p>Your AI Assistant for Smarter Learning</p>
      </section>

      <section className="quick-actions">
        <button className="action-card pink" onClick={() => setModal('live')}>
          <span><Mic size={24} /></span>
          <h3>Live Recording</h3>
          <p>Record live audio and get notes instantly</p>
        </button>
        <button className="action-card cyan" onClick={() => setModal('upload')}>
          <span><UploadCloud size={24} /></span>
          <h3>Upload Audio</h3>
          <p>Upload MP3, WAV, M4A and transcribe</p>
        </button>
        <button className="action-card pink" onClick={() => setModal('youtube')}>
          <span><SquarePlay size={24} /></span>
          <h3>YouTube Link</h3>
          <p>Paste YouTube URL and generate notes</p>
        </button>
        <button className="action-card cyan" onClick={() => setActiveTab('qa')}>
          <span><MessageCircle size={24} /></span>
          <h3>Ask Questions</h3>
          <p>Get answers directly from your lectures</p>
        </button>
      </section>

      <section className="process-card">
        <h3>Processing Your Lecture...</h3>
        <div className="steps-row">
          {STEP_LABELS.map((label, idx) => (
            <div key={label} className={`step-dot ${idx < currentStepIndex ? 'done' : idx === currentStepIndex && loading ? 'active' : ''}`}>
              <span>
                {idx < currentStepIndex || (!loading && activeSession && idx === STEP_LABELS.length - 1)
                  ? <Check size={14} />
                  : idx === currentStepIndex && loading
                    ? <span className="processing-dot"></span>
                    : idx + 1}
              </span>
              <small>{label}</small>
            </div>
          ))}
        </div>
        <div className="progress-wrap">
          <div className="progress-fill" style={{ width: `${progressPercent}%` }} />
        </div>
        <div className="process-footer">
          <p>
            {loading
              ? `Current step: ${step || 'processing'}...`
              : activeSession
                ? 'Latest lecture processed successfully.'
                : 'Upload or record a lecture to start.'}
          </p>
          <strong>{progressPercent}%</strong>
        </div>
      </section>
    </main>
  )
}
