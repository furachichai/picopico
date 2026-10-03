import React, { StrictMode, useMemo, useCallback, useState, useEffect, useRef } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './i18n';
import App from './App.jsx'

if (typeof window !== 'undefined') {
  window.React = React;
  window.useMemo = useMemo;
  window.UseMemo = useMemo;
  window.useCallback = useCallback;
  window.useState = useState;
  window.useEffect = useEffect;
  window.useRef = useRef;
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
