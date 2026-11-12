import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';

import './styles/tokens.css';
import './styles/components.css';
import './styles/tree.css';
import './styles/landing.css';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('Uncaught application error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            textAlign: 'center',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            backgroundColor: '#fdf8f2',
            color: '#2c1e16'
          }}
        >
          <h1 style={{ fontSize: '1.5rem', marginBottom: '12px' }}>
            Something went wrong
          </h1>
          <p style={{ marginBottom: '20px', color: '#5c493e', maxWidth: '420px' }}>
            An unexpected error occurred while rendering the family tree. Please reload the page to try again.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              padding: '10px 20px',
              fontSize: '1rem',
              fontWeight: 600,
              borderRadius: '8px',
              border: 'none',
              backgroundColor: '#8b2635',
              color: '#ffffff',
              cursor: 'pointer'
            }}
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const rootElement = document.getElementById('root');
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>
  );
}
