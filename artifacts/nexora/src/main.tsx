import { createRoot } from 'react-dom/client';
import { setBaseUrl } from '@workspace/api-client-react';

import App from './App';
import { ErrorBoundary } from '@/components/error-boundary';

import './index.css';

// The API server is a separate deployable ("artifact") with its own URL/port,
// so requests need an explicit base URL rather than assuming same-origin.
// Falls back to relative paths (same-origin) when unset, e.g. if a reverse
// proxy puts both services behind one host in production.
setBaseUrl(import.meta.env.VITE_API_BASE_URL ?? null);

createRoot(document.getElementById('root')!, {
  // Keeps caught errors off reportError(), which would raise the dev overlay.
  onCaughtError: (error, errorInfo) => {
    console.error(error, errorInfo.componentStack);
  },
}).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
);
