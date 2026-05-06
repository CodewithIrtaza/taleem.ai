import { useState, useEffect } from 'react'
import { SquarePlay } from 'lucide-react'

const STEPS_YT = ['Downloading', 'Transcribing', 'Summarizing', 'Generating Notes', 'Completed']

export default function YoutubeModal({
  loading,
  step,
  error,
  ytUrl,
  setYtUrl,
  handleYoutube,
  onClose,
}) {
  const [urlError, setUrlError] = useState('')
  const [localStep, setLocalStep] = useState(STEPS_YT[0])

  useEffect(() => {
    if (!loading) {
      setLocalStep(STEPS_YT[0])
      return
    }
    setLocalStep(STEPS_YT[0])
    const timers = [
      setTimeout(() => setLocalStep(STEPS_YT[1]), 3000),
      setTimeout(() => setLocalStep(STEPS_YT[2]), 9000),
      setTimeout(() => setLocalStep(STEPS_YT[3]), 16000),
      setTimeout(() => setLocalStep(STEPS_YT[4]), 24000),
    ]
    return () => timers.forEach(clearTimeout)
  }, [loading])

  function isValidYoutubeUrl(url) {
    return /^https?:\/\/(www\.)?(youtube\.com\/(watch|shorts|embed|live)|youtu\.be\/)/.test(url.trim())
  }

  function onSubmit() {
    if (!ytUrl.trim()) return
    if (!isValidYoutubeUrl(ytUrl)) {
      setUrlError('Please enter a valid YouTube URL (youtube.com or youtu.be)')
      return
    }
    setUrlError('')
    handleYoutube()
  }

  function stepWidth() {
    const i = STEPS_YT.indexOf(localStep)
    if (i === -1) return '0%'
    const widths = ['15%', '45%', '70%', '90%', '100%']
    return widths[i] || '0%'
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ position: 'relative' }}>
        <button className="modal-close" onClick={() => onClose()}>✕</button>
        <h2><SquarePlay size={20} /> YouTube Transcription</h2>
        <div className="gap-8">
          <label>YouTube URL</label>
          <input
            className="input"
            placeholder="https://youtube.com/watch?v=..."
            value={ytUrl}
            onChange={(e) => { setYtUrl(e.target.value); setUrlError('') }}
            onKeyDown={(e) => e.key === 'Enter' && onSubmit()}
          />
        </div>
        {loading && (
          <>
            <div className="status-steps mt-8">
              {STEPS_YT.map((s) => (
                <span
                  key={s}
                  className={`step-badge ${localStep === s ? 'active' : STEPS_YT.indexOf(localStep) > STEPS_YT.indexOf(s) ? 'done' : ''}`}
                >
                  {s}
                </span>
              ))}
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: stepWidth() }} />
            </div>
            <p className="text-muted text-center" style={{ fontSize: 12 }}>May take 2-3 minutes...</p>
          </>
        )}
        {urlError && <div className="alert alert-error mt-8">⚠️ {urlError}</div>}
        {error && <div className="alert alert-error mt-8">⚠️ {error}</div>}
        <div className="flex-row mt-16">
          <button className="btn btn-outline" onClick={() => onClose()}>Cancel</button>
          <button
            className="btn btn-teal"
            onClick={onSubmit}
            disabled={!ytUrl.trim() || loading}
            style={{ flex: 1, justifyContent: 'center' }}
          >
            {loading ? <><span className="spinner" /> Processing...</> : 'Start'}
          </button>
        </div>
      </div>
    </div>
  )
}
