import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Block all new tabs and popups globally (runs before app loads)
(() => {
  window.open = function() { return null; };
  
  // Prevent external link navigation
  document.addEventListener('click', (e) => {
    if (e.ctrlKey || e.metaKey || e.shiftKey) {
      e.preventDefault();
      e.stopPropagation();
    }
    const target = e.target.closest('a');
    if (target && target.target === '_blank') {
      e.preventDefault();
      e.stopPropagation();
    }
  }, true);

  // Block right-click
  document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
  }, true);
})();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
