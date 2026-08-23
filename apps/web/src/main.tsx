import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { initializeSupabase } from '@trami-espana/shared';
import App from './App';
import './index.css';

// Inicializar Supabase con las variables de entorno
initializeSupabase(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY
);

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <App />
        </BrowserRouter>
    </React.StrictMode>
);
