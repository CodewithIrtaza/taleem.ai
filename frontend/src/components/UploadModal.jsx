import { useState, useEffect } from 'react'
import { UploadCloud, AudioLines } from 'lucide-react'

const STEPS_UPLOAD = ['Uploading', 'Transcribing', 'Summarizing', 'Generating Notes', 'Completed']
const MAX_FILE_SIZE = 25 * 1024 * 1024 // 25MB

export default function UploadModal({
  loading,
  step,
  error,
  file,
  setFile,
  dragging,
  setDragging,
  handleUpload,
  onClose,
}) {
  const [sizeError, setSizeError] = useState('')
  const [localStep, setLocalStep] = useState(STEPS_UPLOAD[0])

  useEffect(() => {
    if (!loading) {
      setLocalStep(STEPS_UPLOAD[0])
      return
    }
    setLocalStep(STEPS_UPLOAD[0])
    const timers = [
      setTimeout(() => setLocalStep(STEPS_UPLOAD[1]), 800),
      setTimeout(() => setLocalStep(STEPS_UPLOAD[2]), 5000),
      setTimeout(() => setLocalStep(STEPS_UPLOAD[3]), 10000),
      setTimeout(() => setLocalStep(STEPS_UPLOAD[4]), 15000),
    ]
    return () => timers.forEach(clearTimeout)
  }, [loading])

  function validateAndSetFile(f) {
    if (!f) return
    setSizeError('')
    if (f.size > MAX_FILE_SIZE) {
      setSizeError(`File is too large (${(f.size / (1024 * 1024)).toFixed(1)}MB). Maximum is 25MB.`)
      return
    }
    setFile(f)
  }

  function onDrop(e) {
    e.preventDefault()
    setDragging(false)
    validateAndSetFile(e.dataTransfer.files[0])
  }

  function stepWidth() {
    const i = STEPS_UPLOAD.indexOf(localStep)
    if (i === -1) return '0%'
    const widths = ['15%', '45%', '70%', '90%', '100%']
    return widths[i] || '0%'
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ position: 'relative' }}>
        <button className="modal-close" onClick={() => onClose()}>✕</button>
        <h2><AudioLines size={20} /> Audio File Upload</h2>
        <div
          className={`file-drop ${dragging ? 'dragging' : ''}`}
          onDrop={onDrop}
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onClick={() => document.getElementById('fileInput').click()}
        >
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
            <UploadCloud size={34} />
          </div>
          {file ? (
            <p style={{ fontWeight: 600, color: 'var(--teal)' }}>✅ {file.name}</p>
          ) : (
            <>
              <p style={{ fontWeight: 600 }}>Drag & Drop or Click</p>
              <p className="text-muted mt-8">MP3, WAV, M4A, OGG — max 25MB</p>
            </>
          )}
          <input
            id="fileInput"
            type="file"
            accept=".mp3,.wav,.m4a,.ogg,.webm,.mp4"
            style={{ display: 'none' }}
            onChange={(e) => validateAndSetFile(e.target.files[0])}
          />
        </div>

        {loading && (
          <>
            <div className="status-steps">
              {STEPS_UPLOAD.map((s) => (
                <span
                  key={s}
                  className={`step-badge ${localStep === s ? 'active' : STEPS_UPLOAD.indexOf(localStep) > STEPS_UPLOAD.indexOf(s) ? 'done' : ''}`}
                >
                  {s}
                </span>
              ))}
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: stepWidth() }} />
            </div>
          </>
        )}
        {sizeError && <div className="alert alert-error mt-8">⚠️ {sizeError}</div>}
        {error && <div className="alert alert-error mt-8">⚠️ {error}</div>}
        <div className="flex-row mt-16">
          <button className="btn btn-outline" onClick={() => onClose()}>Cancel</button>
          <button
            className="btn btn-teal"
            onClick={handleUpload}
            disabled={!file || loading}
            style={{ flex: 1, justifyContent: 'center' }}
          >
            {loading ? <><span className="spinner" /> Processing...</> : 'Transcribe & Summarize'}
          </button>
        </div>
      </div>
    </div>
  )
}
