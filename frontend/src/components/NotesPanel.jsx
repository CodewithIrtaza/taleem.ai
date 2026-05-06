import { UploadCloud, SquarePlay, Mic, FileText, ChevronDown } from 'lucide-react'

const SOURCE_ICONS = { upload: UploadCloud, youtube: SquarePlay, live: Mic }

export default function NotesPanel({
  activeSession,
  sessionLoading,
  activeTab,
  setActiveTab,
  qaMessages,
  qaLoading,
  question,
  setQuestion,
  askQuestion,
  handleExport,
  generateTitle,
  formatNotes,
  prettyDate,
}) {
  const ActiveSourceIcon = SOURCE_ICONS[activeSession?.source] || FileText



  return (
    <aside className="notes-sidebar">
      {sessionLoading ? (
        <>
          <div className="skeleton-line w-40" style={{ height: 20, marginBottom: 18 }} />
          <div className="skeleton-line w-70" style={{ marginBottom: 10 }} />
          <div className="skeleton-line w-100" style={{ marginBottom: 8 }} />
          <div className="skeleton-line w-100" style={{ marginBottom: 8 }} />
          <div className="skeleton-line w-60" style={{ marginBottom: 8 }} />
          <div className="skeleton-line w-100" style={{ marginBottom: 8 }} />
          <div className="skeleton-line w-80" style={{ marginBottom: 8 }} />
          <div className="skeleton-line w-100" style={{ marginBottom: 8 }} />
          <div className="skeleton-line w-50" />
        </>
      ) : !activeSession ? (
        <>
          <h3>Lecture Details</h3>
          <p className="placeholder">Select a lecture from the left to view notes, transcript, and ask questions.</p>
        </>
      ) : (
        <>
          <div className="session-top-bar">
            <div>
              <h3>{generateTitle(activeSession)}</h3>
              <p className="meta-line">
                <ActiveSourceIcon size={13} /> {activeSession.language} • {prettyDate(activeSession.created_at)}
              </p>
            </div>
            <button className="solid-btn" onClick={handleExport}>Export</button>
          </div>

          <div className="tab-row">
            <button className={activeTab === 'notes' ? 'active' : ''} onClick={() => setActiveTab('notes')}>Notes</button>
            <button className={activeTab === 'transcript' ? 'active' : ''} onClick={() => setActiveTab('transcript')}>Transcript</button>
            <button className={activeTab === 'qa' ? 'active' : ''} onClick={() => setActiveTab('qa')}>Q&A</button>
          </div>



          {activeTab === 'qa' ? (
            <div className="qa-wrap-full">
              <div className="qa-messages-full">
                {qaMessages.length === 0 && <p className="placeholder">Ask a question about this lecture...</p>}
                {qaMessages.map((m, i) => (
                  <div key={i} className={`qa-msg-bubble ${m.role}`}>
                    <div className="qa-msg-content">{m.text}</div>
                  </div>
                ))}
                {qaLoading && (
                  <div className="qa-msg-bubble ai">
                    <div className="qa-msg-content">Thinking...</div>
                  </div>
                )}
              </div>
              <div className="qa-input-wrap">
                <input
                  className="qa-input"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && askQuestion()}
                  placeholder="Ask about this lecture..."
                />
                <button className="qa-send-btn" onClick={askQuestion} disabled={qaLoading || !question.trim()}>
                  <span>→</span>
                </button>
              </div>
            </div>
          ) : (
            <div
              className="reader-panel-full"
              dangerouslySetInnerHTML={{
                __html: formatNotes(
                  activeTab === 'notes' 
                    ? activeSession.notes
                    : activeSession.transcript
                ),
              }}
            />
          )}
        </>
      )}
    </aside>
  )
}
