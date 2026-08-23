import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
    procedureService,
    ProcedureServiceError,
    PROCEDURE_CATEGORIES,
    PROCEDURE_SCOPES,
    AUTONOMOUS_COMMUNITIES,
    SEARCH_DEBOUNCE_MS,
    MIN_SEARCH_LENGTH
} from '@trami-espana/shared';
import type { ProcedureWithDetails } from '@trami-espana/shared';
import { ProcedureCard, GridSkeleton, ErrorState, EmptyState } from '../components/ui';

export default function Search() {
    const [searchParams, setSearchParams] = useSearchParams();
    const [query, setQuery] = useState(searchParams.get('q') || '');
    const [category, setCategory] = useState(searchParams.get('categoria') || '');
    const [scope, setScope] = useState(searchParams.get('ambito') || '');
    const [community, setCommunity] = useState(searchParams.get('comunidad') || '');
    const [results, setResults] = useState<ProcedureWithDetails[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hasSearched, setHasSearched] = useState(false);

    // Actualizar URL cuando cambian los filtros
    const updateUrl = useCallback(() => {
        const params: Record<string, string> = {};
        if (query) params.q = query;
        if (category) params.categoria = category;
        if (scope) params.ambito = scope;
        if (community) params.comunidad = community;
        setSearchParams(params, { replace: true });
    }, [query, category, scope, community, setSearchParams]);

    // Búsqueda con debounce
    const performSearch = useCallback(async () => {
        const searchQuery = query.trim();
        if (searchQuery.length < MIN_SEARCH_LENGTH) {
            setResults([]);
            setHasSearched(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);
                        setHasSearched(true);

            const data = await procedureService.searchProcedures(searchQuery, {
                category: category || undefined,
                scope: scope || undefined,
                autonomous_community: community || undefined
            });
            setResults(data);
        } catch (err) {
            if (err instanceof ProcedureServiceError) {
                setError(err.message);
            } else {
                setError('Error en la búsqueda');
            }
        } finally {
            setLoading(false);
        }
    }, [query, category, scope, community]);

    // Debounce
    useEffect(() => {
        updateUrl();
        const timer = setTimeout(() => {
            performSearch();
        }, SEARCH_DEBOUNCE_MS);

        return () => clearTimeout(timer);
    }, [query, category, scope, community, updateUrl, performSearch]);

    const handleClear = () => {
        setQuery('');
        setCategory('');
        setScope('');
        setCommunity('');
        setResults([]);
        setHasSearched(false);
        setError(null);
    };

    const hasActiveFilters = category || scope || community;

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                {/* Header */}
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-bold text-gray-900 mb-4">
                        Buscar trámites
                    </h1>
                    <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                        Escribe lo que necesitas y encontraremos el trámite para ti.
                    </p>
                </div>

                {/* Buscador principal */}
                <div className="max-w-3xl mx-auto mb-8">
                    <div className="relative">
                        <svg
                            className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
                            fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                            type="search"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Ej.: renovar el DNI, pedir el paro, empadronarme..."
                            className="input pl-12 pr-12 h-14 text-base shadow-lg"
                            aria-label="Buscar trámite"
                            autoFocus
                        />
                        {query && (
                            <button
                                onClick={handleClear}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100"
                                aria-label="Limpiar búsqueda"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        )}
                    </div>
                </div>

                {/* Filtros */}
                <div className="max-w-3xl mx-auto mb-8">
                    <div className="flex flex-wrap gap-3">
                        {/* Categoría */}
                        <select
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            className="input h-10 text-sm"
                            aria-label="Filtrar por categoría"
                        >
                            <option value="">Todas las categorías</option>
                            {PROCEDURE_CATEGORIES.map((c) => (
                                <option key={c.id} value={c.slug}>{c.name}</option>
                            ))}
                        </select>

                        {/* Ámbito */}
                        <select
                            value={scope}
                            onChange={(e) => setScope(e.target.value)}
                            className="input h-10 text-sm"
                            aria-label="Filtrar por ámbito"
                        >
                            <option value="">Todos los ámbitos</option>
                            {PROCEDURE_SCOPES.map((s) => (
                                <option key={s.value} value={s.value}>{s.label}</option>
                            ))}
                        </select>

                        {/* Comunidad Autónoma */}
                        <select
                            value={community}
                            onChange={(e) => setCommunity(e.target.value)}
                            className="input h-10 text-sm"
                            aria-label="Filtrar por comunidad autónoma"
                        >
                            <option value="">Todas las comunidades</option>
                            {AUTONOMOUS_COMMUNITIES.map((c) => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                        </select>

                        {/* Limpiar filtros */}
                        {hasActiveFilters && (
                            <button
                                onClick={() => {
                                    setCategory('');
                                    setScope('');
                                    setCommunity('');
                                }}
                                className="btn-ghost btn-sm"
                                aria-label="Limpiar filtros"
                            >
                                Limpiar filtros
                            </button>
                        )}
                    </div>
                </div>

                {/* Contenido principal */}
                <div className="max-w-3xl mx-auto">
                    {/* Estado inicial */}
                    {!loading && !error && !hasSearched && (
                        <EmptyState
                            icon="🔍"
                            title="¿Qué trámite estás buscando?"
                            description="Escribe al menos 2 caracteres para comenzar la búsqueda."
                        />
                    )}

                    {/* Loading */}
                    {loading && <GridSkeleton count={6} />}

                    {/* Error */}
                    {error && !loading && (
                        <ErrorState message={error} onRetry={() => setQuery(query)} />
                    )}

                    {/* Sin resultados */}
                    {!loading && !error && hasSearched && results.length === 0 && (
                        <EmptyState
                            icon="😔"
                            title="No hemos encontrado exactamente lo que buscas."
                            description="Prueba con otros términos, revisa los filtros o explora las categorías."
                            actionLabel="Ver todas las categorías"
                            actionHref="/tramites"
                        />
                    )}

                    {/* Resultados */}
                    {!loading && !error && results.length > 0 && (
                        <>
                            <p className="text-sm text-gray-600 mb-4">
                                {results.length} resultado{results.length !== 1 ? 's' : ''} para "{query}"
                                {hasActiveFilters && ' con filtros aplicados'}
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {results.map((procedure) => (
                                    <ProcedureCard key={procedure.id} procedure={procedure} />
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
