import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { ConfigProvider } from './contexts/ConfigContext.tsx'
import { bootstrapApplication } from './services/bootstrap'

// Initialize Codebase Services
bootstrapApplication();

console.log("Main.tsx: Mounting Root...");
console.log("Main.tsx: Mounting Root...");
console.log("Main.tsx: Mounting Root...");
console.log("Main.tsx: Mounting Root...");
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ConfigProvider>
      <App />
    </ConfigProvider>
  </React.StrictMode>,
)
console.log("Main.tsx: Mount call finished.");
console.log("Main.tsx: Mount call finished.");
console.log("Main.tsx: Mount call finished.");
console.log("Main.tsx: Mount call finished.");
