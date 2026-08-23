import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { procedureService, ProcedureServiceError } from '@trami-espana/shared';
import type { ProcedureWithDetails } from '@trami-espana/shared';
import type { Database } from '@trami-espana/shared';
type ProcedureCategory = Database['public']['Tables']['procedure_categories']['Row'];

export default function Procedures() {
    const [procedures, setProcedures] = useState<ProcedureWithDetails[]>([]);
    const [categories, setCategories] = useState<ProcedureCategory[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<string>('');
    const [selectedScope, setSelectedScope] = useState<string>('');

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const [proceduresResponse, categoriesData] = await Promise.all([
                procedureService.getProcedures({
                    category_id: selectedCategory || undefined,
                    scope: selectedScope || undefined,
                    limit: 12
                }),
                procedureService.getCategories()
            ]);

            setProcedures(proceduresResponse.data);
            setCategories(categoriesData);
        } catch (err) {
            if (err instanceof ProcedureServiceError) {
                setError(err.message);
            } else {
                setError('Error al cargar los trámites');
            }
        } finally {
            setLoading(false);
        }
    }, [selectedCategory, selectedScope]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const getScopeLabel = (scope: string) => {
        const labels: Record<string, string> = {
            'estatal': 'Estatal',
            'autonómico': 'Autonómico',
            'provincial': 'Provincial',
            'municipal': 'Municipal'
        };
        return labels[scope] || scope;
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-bold text-gray-900 mb-4">
                        Todos los trámites
                    </h1>
                    <p className="text-xl text-gray-600 mb-8">
                        Explora nuestra guía completa de trámites administrativos
                    </p>

                    {/* Filtros */}
                    <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                        <select
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            className="input"
                        >
                            <option value="">Todas las categorías</option>
                            {categories.map((category) => (
                                <option key={category.id} value={category.id}>
                                    {category.name}
                                </option>
                            ))}
                        </select>

                        <select
                            value={selectedScope}
                            onChange={(e) => setSelectedScope(e.target.value)}
                            className="input"
                        >
                            <option value="">Todos los ámbitos</option>
                            <option value="estatal">Estatal</option>
                            <option value="autonómico">Autonómico</option>
                            <option value="provincial">Provincial</option>
                            <option value="municipal">Municipal</option>
                        </select>
                    </div>
                </div>

                {/* Loading State */}
                {loading && (
                    <div className="text-center py-20">
                        <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-primary"></div>
                        <p className="text-gray-500 mt-4">Cargando trámites...</p>
                    </div>
                )}

                {/* Error State */}
                {error && (
                    <div className="max-w-2xl mx-auto">
                        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                            <p className="text-red-800 mb-4">{error}</p>
                            <button onClick={loadData} className="btn-primary btn-md">
                                Reintentar
                            </button>
                        </div>
                    </div>
                )}

                {/* Empty State */}
                {!loading && !error && procedures.length === 0 && (
                    <div className="text-center py-20">
                        <p className="text-gray-500 text-lg">
                            No se encontraron trámites con los filtros seleccionados.
                        </p>
                    </div>
                )}

                {/* Listado de trámites */}
                {!loading && !error && procedures.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {procedures.map((procedure) => (
                            <Link
                                key={procedure.id}
                                to={`/tramites/${procedure.slug}`}
                                className="card p-6 hover:shadow-lg transition-shadow"
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <span className="text-xs font-medium text-primary bg-blue-50 px-2 py-1 rounded">
                                        {procedure.category?.name || 'Sin categoría'}
                                    </span>
                                    <span className="text-xs text-gray-500">
                                        {getScopeLabel(procedure.scope)}
                                    </span>
                                </div>

                                <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
                                    {procedure.title.replace('[DEMO] ', '')}
                                </h3>

                                <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                                    {procedure.short_description}
                                </p>

                                <div className="flex items-center text-sm text-gray-500">
                                    <span className="mr-2">🔗</span>
                                    <span className="truncate">
                                        {procedure.links?.filter(l => l.is_official).length || 0} enlaces oficiales
                                    </span>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}