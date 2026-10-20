import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '@/app/app';
import { AppProviders } from '@/providers/app-providers';
import './global.css';
document.documentElement.dataset.version = import.meta.env.VITE_APP_VERSION ?? '1';
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProviders>
      <App />
    </AppProviders>
  </StrictMode>,
);
