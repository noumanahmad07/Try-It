import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

import { BrowserRouter } from 'react-router-dom';

const renderClientError = (message: string, source?: string, lineno?: number, colno?: number, error?: any) => {
  console.error('Client runtime error:', message, source, lineno, colno, error);
  const root = document.getElementById('root');
  if (root) {
    root.innerHTML = `<div style="background:#000;color:#f87171;padding:24px;font-family:system-ui, sans-serif;white-space:pre-wrap;">` +
      `Fatal client error:\n${message}\n${source || ''}:${lineno || 0}:${colno || 0}\n${error?.stack || ''}` +
      `</div>`;
  }
};

const isIgnoredClientError = (message: string | undefined) => {
  if (!message) return false;
  return message.includes('WebSocket closed without opened');
};

window.addEventListener('error', (event) => {
  if (isIgnoredClientError(event.message)) {
    console.warn('Ignored non-fatal client error:', event.message);
    return;
  }
  renderClientError(event.message, event.filename, event.lineno, event.colno, event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason instanceof Error ? event.reason.message : String(event.reason);
  if (isIgnoredClientError(reason)) {
    console.warn('Ignored non-fatal unhandled rejection:', reason);
    return;
  }
  renderClientError(`Unhandled promise rejection: ${reason}`);
});

const cleanupServiceWorkers = async () => {
  if ('serviceWorker' in navigator) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));
    } catch (error) {
      console.warn('Failed to unregister service workers:', error);
    }
  }

  if ('caches' in window) {
    try {
      const cacheKeys = await caches.keys();
      await Promise.all(cacheKeys.map((cacheName) => caches.delete(cacheName)));
    } catch (error) {
      console.warn('Failed to clear caches:', error);
    }
  }
};

cleanupServiceWorkers();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
