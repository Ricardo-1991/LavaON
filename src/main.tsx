import { initBotId } from 'botid/client/core';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '@/app/app';
import { AppProviders } from '@/providers/app-providers';
import './global.css';
if (import.meta.env.PROD && import.meta.env.VITE_BOT_PROTECTION === 'on') {
  initBotId({
    protect: [{ path: '/api/app', method: 'POST', advancedOptions: { checkLevel: 'basic' } }],
  });
}
document.documentElement.dataset.version = import.meta.env.VITE_APP_VERSION ?? '1';
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProviders>
      <App />
    </AppProviders>
  </StrictMode>,
);
