import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/react-query';

class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean}> {
  constructor(props: {children: React.ReactNode}) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("Global Error Caught:", error, errorInfo);
    // Check if it's a chunk load error (usually happens after a new deployment)
    const isChunkLoadError = error?.name === 'ChunkLoadError' || 
                             (error?.message && error.message.includes('dynamically imported module'));
    
    if (isChunkLoadError) {
      // Force a hard reload to get the latest assets
      window.location.reload();
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'sans-serif', padding: '20px', textAlign: 'center' }}>
          <h2 style={{ marginBottom: '10px' }}>Something went wrong.</h2>
          <p style={{ color: '#666', marginBottom: '20px' }}>We're having trouble loading the application. This is usually caused by a recent update.</p>
          <button 
            onClick={() => {
              localStorage.clear();
              sessionStorage.clear();
              window.location.reload();
            }}
            style={{ padding: '10px 20px', backgroundColor: '#0071E3', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            Clear Cache & Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// Clear the reload flag on successful script execution
sessionStorage.removeItem('asset_reload_attempted');

// Global listener for unhandled promise rejections (e.g., dynamic imports failing)
window.addEventListener('unhandledrejection', (event) => {
  const isChunkLoadError = event.reason?.name === 'ChunkLoadError' || 
                           (event.reason?.message && event.reason.message.includes('dynamically imported module'));
  if (isChunkLoadError) {
    console.warn("Chunk load error detected globally. Reloading page...");
    window.location.reload();
  }
});

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>
);