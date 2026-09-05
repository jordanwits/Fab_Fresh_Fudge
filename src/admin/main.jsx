import React from 'react'
import ReactDOM from 'react-dom/client'
import AdminApp from './AdminApp.jsx'
import './admin.css'

// Entry for admin/index.html, served at /admin/. Separate from src/main.jsx on
// purpose: the public site never loads any of this.
ReactDOM.createRoot(document.getElementById('admin-root')).render(
  <React.StrictMode>
    <AdminApp />
  </React.StrictMode>
)
