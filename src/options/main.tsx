import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { OptionsApp } from './OptionsApp';
import '@/styles/global.css';

const root = document.getElementById('root');

if (!root) {
  throw new Error('MindDrift options root element not found');
}

createRoot(root).render(
  <StrictMode>
    <OptionsApp />
  </StrictMode>,
);
