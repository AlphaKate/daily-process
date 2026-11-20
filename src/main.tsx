import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { enforceFrameBuster } from './services/securitySanitizer';

// Enforce anti-clickjacking frame protection
enforceFrameBuster();

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
