import { UploadCloud, SquarePlay, Mic, FileText } from 'lucide-react'

const SOURCE_ICONS = { upload: UploadCloud, youtube: SquarePlay, live: Mic }

export default function LecturesSidebar({
  sessions,
  activeSession,
  sessionsLoading,
  openSession,
  deleteSession,
  newSession,
  generateTitle,
  prettyDate,
}) {
  return (
    <aside className="sessions-sidebar">
      <div className="sessions-header">
        <h3>Lectures</h3>
        <button className="new-session-btn" onClick={newSession} title="New Lecture">
          <span>+</span>
        </button>
      </div>

      {sessionsLoading ? (
        <div className="skeleton-list">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton-item">
              <div className="skeleton-circle" />
              <div className="skeleton-lines">
                <div className="skeleton-line w-70" />
                <div className="skeleton-line w-40" />
              </div>
            </div>
          ))}
        </div>
      ) : sessions.length === 0 ? (
        <p className="placeholder">No lectures yet. Click + to start recording or uploading!</p>
      ) : (
        <div className="sessions-list">
          {sessions.map((s) => (
            <button
              key={s.id}
              className={`session-item ${activeSession?.id === s.id ? 'active' : ''}`}
              onClick={() => openSession(s.id)}
            >
              <div className="session-item-header">
                <span className="session-icon">
                  {(() => {
                    const Icon = SOURCE_ICONS[s.source] || FileText
                    return <Icon size={14} />
                  })()}
                </span>
                <div className="session-item-info">
                  <strong title={generateTitle(s)}>{generateTitle(s)}</strong>
                  <small>{prettyDate(s.created_at)}</small>
                </div>
              </div>
              <button
                className="session-delete-btn"
                onClick={(e) => deleteSession(e, s.id)}
                title="Delete lecture"
              >
                ✕
              </button>
            </button>
          ))}
        </div>
      )}
    </aside>
  )
}
