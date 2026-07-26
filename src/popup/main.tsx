import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { PopupApp } from './PopupApp';
import '../styles/global.css';

const root = document.getElementById('root');

if (!root) {
  throw new Error('MindDrift popup root element not found');
}

createRoot(root).render(
  <StrictMode>
    <PopupApp />
  </StrictMode>,
);
