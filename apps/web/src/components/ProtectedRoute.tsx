import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// ===========================================
// TRAMI ESPAÑA - Ruta protegida
// ===========================================
// Envuelve secciones que requieren autenticación. Mientras la sesión carga
// muestra un skeleton; si no hay usuario muestra un aviso amigable con acceso
// al login (nunca genera 401 en la consola). NO redirige de forma brusca para
// no frustrar a un usuario que recarga una página ya autenticado.
interface ProtectedRouteProps {
    children: ReactNode;
    title?: string;
}

export default function ProtectedRoute({
    children,
    title = 'Área personal'
}: ProtectedRouteProps) {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="max-w-4xl mx-auto px-4 py-10">
                <div className="skeleton h-8 w-56 mb-6" aria-hidden="true" />
                <div className="skeleton h-56 w-full" aria-hidden="true" />
            </div>
        );
    }

    if (!user) {
        return (
            <div className="max-w-md mx-auto px-4 py-16 text-center">
                <div className="text-5xl mb-4">🔒</div>
                <h1 className="text-2xl font-bold text-gray-900 mb-3">{title}</h1>
                <p className="text-gray-600 mb-6">
                    Necesitas iniciar sesión para acceder a esta sección.
                </p>
                <Link
                    to="/login"
                    className="btn-primary btn-md"
                >
                    Iniciar sesión
                </Link>
            </div>
        );
    }

    return <>{children}</>;
}