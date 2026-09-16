import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Intercept and prevent benign Vite HMR & WebSocket closing errors from polluting the preview error console
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const errorText = String(event.reason?.message || event.reason || '');
    if (
      errorText.includes('WebSocket') ||
      errorText.includes('failed to connect to websocket') ||
      errorText.includes('WebSocket closed without opened')
    ) {
      event.preventDefault();
    }
  });

  window.addEventListener('error', (event) => {
    const errorText = String(event.message || event.error?.message || '');
    if (
      errorText.includes('WebSocket') ||
      errorText.includes('failed to connect to websocket') ||
      errorText.includes('WebSocket closed without opened')
    ) {
      event.preventDefault();
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
