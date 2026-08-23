import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { favoriteService, FavoriteServiceError } from '@trami-espana/shared';
import type { FavoriteWithProcedure } from '@trami-espana/shared';

export default function Favorites() {
    const [favorites, setFavorites] = useState<FavoriteWithProcedure[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { user, loading: authLoading } = useAuth();
    const navigate = useNavigate();

    // Redirigir si no está autenticado (esperando a que la sesión cargue
    // para no redirigir a un usuario ya autenticado que recarga la página)
    useEffect(() => {
        if (!authLoading && !user) {
            navigate('/login', { state: { from: { pathname: '/favoritos' } } });
        }
    }, [user, authLoading, navigate]);

    // Cargar favoritos
    useEffect(() => {
        if (!user) return;

        const loadFavorites = async () => {
            try {
                setLoading(true);
                setError(null);
                const data = await favoriteService.getFavorites();
                setFavorites(data);
            } catch (err) {
                if (err instanceof FavoriteServiceError) {
                    setError(err.message);
                } else {
                    setError('Error al cargar los favoritos');
                }
            } finally {
                setLoading(false);
            }
        };

        loadFavorites();
    }, [user]);

    const handleRemoveFavorite = async (procedureId: string) => {
        try {
            const result = await favoriteService.removeFavorite(procedureId);
            if (result.success) {
                setFavorites(favorites.filter(f => f.procedure_id !== procedureId));
            } else {
                setError('Error al eliminar de favoritos');
            }
        } catch (err) {
            setError('Error al eliminar de favoritos');
        }
    };

    if (!user) {
        return null;
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-bold text-gray-900 mb-4">
                        Mis favoritos
                    </h1>
                    <p className="text-xl text-gray-600">
                        Trámites que has guardado para consultar más tarde
                    </p>
                </div>

                {/* Loading State */}
                {loading && (
                    <div className="text-center py-20">
                        <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-primary"></div>
                        <p className="text-gray-500 mt-4">Cargando favoritos...</p>
                    </div>
                )}

                {/* Error State */}
                {error && (
                    <div className="max-w-2xl mx-auto">
                        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                            <p className="text-red-800 mb-4">{error}</p>
                            <button
                                onClick={() => window.location.reload()}
                                className="btn-primary btn-md"
                            >
                                Reintentar
                            </button>
                        </div>
                    </div>
                )}

                {/* Empty State */}
                {!loading && !error && favorites.length === 0 && (
                    <div className="text-center py-20">
                        <div className="text-6xl mb-4">⭐</div>
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">
                            No tienes favoritos
                        </h3>
                        <p className="text-gray-600 mb-6">
                            Guarda trámites que te interesen para acceder a ellos rápidamente
                        </p>
                        <Link to="/tramites" className="btn-primary btn-md">
                            Explorar trámites
                        </Link>
                    </div>
                )}

                {/* Listado de favoritos */}
                {!loading && !error && favorites.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {favorites.map((favorite) => (
                            <div key={favorite.id} className="card p-6 hover:shadow-lg transition-shadow">
                                <div className="flex items-start justify-between mb-3">
                                    <span className="text-xs font-medium text-primary bg-blue-50 px-2 py-1 rounded">
                                        {favorite.procedure?.category?.name || 'Sin categoría'}
                                    </span>
                                    <button
                                        onClick={() => handleRemoveFavorite(favorite.procedure_id)}
                                        className="text-yellow-500 hover:text-yellow-600 text-xl"
                                        title="Eliminar de favoritos"
                                    >
                                        ★
                                    </button>
                                </div>

                                <Link
                                    to={`/tramites/${favorite.procedure?.slug}`}
                                    className="block"
                                >
                                    <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
                                        {favorite.procedure?.title?.replace('[DEMO] ', '')}
                                    </h3>

                                    <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                                        {favorite.procedure?.short_description}
                                    </p>

                                    <div className="flex items-center text-sm text-gray-500">
                                        <span className="mr-2">🔗</span>
                                        <span className="truncate">
                                            {favorite.procedure?.links?.filter(l => l.is_official).length || 0} enlaces oficiales
                                        </span>
                                    </div>
                                </Link>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}