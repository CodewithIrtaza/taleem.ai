import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f6f4ed',
          fontFamily: "'Inter', sans-serif",
        }}>
          <div style={{
            textAlign: 'center',
            maxWidth: 440,
            padding: 40,
            background: '#fff',
            borderRadius: 20,
            border: '1px solid #e6e8ef',
            boxShadow: '0 8px 30px rgba(20,24,38,0.06)',
          }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
            <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Something went wrong</h2>
            <p style={{ color: '#6f7687', fontSize: 14, lineHeight: 1.6, marginBottom: 20 }}>
              An unexpected error occurred. Please try refreshing the page.
            </p>
            <p style={{
              background: '#fff0f7',
              border: '1px solid #ffc3dd',
              borderRadius: 10,
              padding: '10px 14px',
              fontSize: 12,
              color: '#bb2058',
              textAlign: 'left',
              wordBreak: 'break-word',
              marginBottom: 20,
            }}>
              {this.state.error?.message || 'Unknown error'}
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{
                background: '#ed3c86',
                color: '#fff',
                border: 'none',
                borderRadius: 12,
                padding: '12px 28px',
                fontWeight: 700,
                fontSize: 14,
                cursor: 'pointer',
              }}
            >
              Refresh Page
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
