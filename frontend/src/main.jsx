import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './App.css';

const rootEl = document.getElementById('cpd-root');

class GlobalErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("Global crash:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '40px', background: '#fff', color: '#ff3333', fontFamily: 'monospace' }}>
          <h2>React Designer Crashed</h2>
          <p><strong>Error:</strong> {this.state.error?.message}</p>
          <pre style={{ fontSize: '11px', background: '#f4f4f4', padding: '10px' }}>
            {this.state.error?.stack}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

if (rootEl) {
  ReactDOM.createRoot(rootEl).render(
    <React.StrictMode>
      <GlobalErrorBoundary>
        <App />
      </GlobalErrorBoundary>
    </React.StrictMode>
  );
}
