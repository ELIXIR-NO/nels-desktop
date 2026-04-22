import React from 'react'
import ReactDOM from 'react-dom/client'
import '@fontsource-variable/geist/index.css'
import { App } from './App'
import './styles/globals.css'

// Pre-React theme init to avoid a flash of the wrong palette. Must match the
// logic in ThemeContext.readStored() + systemPrefersDark().
;(function applyInitialTheme() {
  try {
    const stored = localStorage.getItem('nels-theme')
    const dark = stored === 'dark'
      || (stored !== 'light'
        && typeof window.matchMedia === 'function'
        && window.matchMedia('(prefers-color-scheme: dark)').matches)
    if (dark) document.documentElement.classList.add('dark')
  } catch { /* noop */ }
})()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
