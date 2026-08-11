import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import FocalTool from './FocalTool.jsx'
import './styles.css'

// `?focal` swaps in the dev-only photo framing tool. Remove this branch, the
// FocalTool import, and the focalBake plugin in vite.config.js when the
// framing is settled.
const focalMode = new URLSearchParams(window.location.search).has('focal')

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>{focalMode ? <FocalTool /> : <App />}</React.StrictMode>
)
