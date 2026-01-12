import React from 'react';
import ReactDOM from 'react-dom/client';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import './index.css';
import './i18n';
import App from './App.jsx';

import { Suspense } from 'react';
// import LoadingSpinner from './components/LoadingSpinner'; 

// ...

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <ThemeProvider>
        <Suspense fallback={<div className="flex items-center justify-center p-10 text-white min-h-screen">Cargando aplicación...</div>}>
          <App />
        </Suspense>
      </ThemeProvider>
    </AuthProvider>
  </React.StrictMode>,
);
