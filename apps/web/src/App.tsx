import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Layout from './components/Layout';
import Home from './pages/Home';
import Procedures from './pages/Procedures';
import ProcedureDetail from './pages/ProcedureDetail';
import Search from './pages/Search';
import Assistant from './pages/Assistant';
import Login from './pages/Login';
import Profile from './pages/Profile';
import Favorites from './pages/Favorites';
import Reminders from './pages/Reminders';
import ErrorPage from './pages/Error';
import ProtectedRoute from './components/ProtectedRoute';

// Páginas legales — cargadas bajo demanda (code splitting) para reducir
// el bundle inicial. Son páginas estáticas poco frecuentadas.
const Privacy = lazy(() => import('./pages/Privacy'));
const Terms = lazy(() => import('./pages/Terms'));
const Cookies = lazy(() => import('./pages/Cookies'));
const Contact = lazy(() => import('./pages/Contact'));

// Fallback de carga para las rutas lazy.
function PageFallback() {
    return (
        <div className="min-h-[60vh] flex items-center justify-center text-gray-500">
            Cargando…
        </div>
    );
}

function App() {
    return (
        <AuthProvider>
            <Suspense fallback={<PageFallback />}>
                <Routes>
                    <Route path="/" element={<Layout />}>
                        <Route index element={<Home />} />
                        <Route path="tramites" element={<Procedures />} />
                        <Route path="tramites/:slug" element={<ProcedureDetail />} />
                        <Route path="buscar" element={<Search />} />
                        <Route path="asistente" element={<Assistant />} />
                        <Route path="login" element={<Login />} />
                        <Route path="perfil" element={
                            <ProtectedRoute title="Mi perfil"><Profile /></ProtectedRoute>
                        } />
                        <Route path="favoritos" element={
                            <ProtectedRoute title="Mis favoritos"><Favorites /></ProtectedRoute>
                        } />
                        <Route path="recordatorios" element={
                            <ProtectedRoute title="Mis recordatorios"><Reminders /></ProtectedRoute>
                        } />
                        <Route path="privacidad" element={<Privacy />} />
                        <Route path="terminos" element={<Terms />} />
                        <Route path="cookies" element={<Cookies />} />
                        <Route path="contacto" element={<Contact />} />
                        <Route path="error" element={<ErrorPage />} />
                        <Route path="*" element={<ErrorPage />} />
                    </Route>
                </Routes>
            </Suspense>
        </AuthProvider>
    );
}

export default App;