import { Link } from 'react-router-dom';

export default function ErrorPage() {
    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="max-w-md w-full mx-4 text-center">
                <div className="text-6xl mb-4">😕</div>
                <h1 className="text-4xl font-bold text-gray-900 mb-4">
                    Página no encontrada
                </h1>
                <p className="text-gray-600 mb-8">
                    Lo sentimos, la página que buscas no existe o ha sido movida.
                </p>
                <Link to="/" className="btn-primary btn-md">
                    Volver al inicio
                </Link>
            </div>
        </div>
    );
}