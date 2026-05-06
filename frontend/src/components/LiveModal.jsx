import { useState, useEffect } from 'react'
import { Mic, Square, Loader2 } from 'lucide-react'

const STEPS_LIVE = ['Uploading', 'Transcribing', 'Summarizing', 'Generating Notes', 'Completed']

function fmtTime(sec) {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export default function LiveModal({
  loading,
  step,
  error,
  recording,
  recSeconds,
  startRecording,
  stopRecording,
  onClose,
}) {
  const [localStep, setLocalStep] = useState(STEPS_LIVE[0])

  useEffect(() => {
    if (!loading) {
      setLocalStep(STEPS_LIVE[0])
      return
    }
    setLocalStep(STEPS_LIVE[0])
    const timers = [
      setTimeout(() => setLocalStep(STEPS_LIVE[1]), 800),
      setTimeout(() => setLocalStep(STEPS_LIVE[2]), 4000),
      setTimeout(() => setLocalStep(STEPS_LIVE[3]), 8000),
      setTimeout(() => setLocalStep(STEPS_LIVE[4]), 12000),
    ]
    return () => timers.forEach(clearTimeout)
  }, [loading])

  function stepWidth() {
    const i = STEPS_LIVE.indexOf(localStep)
    if (i === -1) return '0%'
    const widths = ['15%', '45%', '70%', '90%', '100%']
    return widths[i] || '0%'
  }

  return (
    <div
      className="modal-overlay"
      onClick={(e) => e.target === e.currentTarget && !recording && onClose()}
    >
      <div className="modal" style={{ position: 'relative', textAlign: 'center' }}>
        {!recording && (
          <button className="modal-close" onClick={onClose}>✕</button>
        )}
        <h2><Mic size={20} /> Live Recording</h2>
        <p className="text-muted" style={{ marginBottom: 24 }}>
          Allow mic → Record → Stop → Notes ready!
        </p>
        <div className="record-timer">{fmtTime(recSeconds)}</div>
        <button
          className={`record-btn ${recording ? 'recording' : 'idle'}`}
          onClick={recording ? stopRecording : startRecording}
          disabled={loading}
        >
          {loading
            ? <Loader2 size={30} className="spin-icon" />
            : recording
              ? <Square size={24} />
              : <Mic size={28} />}
        </button>
        <div className="text-muted mt-8" style={{ fontSize: 12 }}>
          {loading ? (
            <>
              <div className="status-steps mt-8" style={{ justifyContent: 'center' }}>
                {STEPS_LIVE.map((s) => (
                  <span
                    key={s}
                    className={`step-badge ${localStep === s ? 'active' : STEPS_LIVE.indexOf(localStep) > STEPS_LIVE.indexOf(s) ? 'done' : ''}`}
                  >
                    {s}
                  </span>
                ))}
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: stepWidth() }} />
              </div>
            </>
          ) : recording
            ? <p>Recording is running — Click Stop</p>
            : <p>Click Start</p>}
        </div>
        {error && <div className="alert alert-error mt-8">⚠️ {error}</div>}
      </div>
    </div>
  )
}
