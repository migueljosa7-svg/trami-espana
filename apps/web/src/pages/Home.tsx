import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { procedureService, ProcedureServiceError, PROCEDURE_CATEGORIES } from '@trami-espana/shared';
import type { ProcedureWithDetails } from '@trami-espana/shared';
import { CategoryCard, ProcedureCard, GridSkeleton, ErrorState } from '../components/ui';

export default function Home() {
    const [query, setQuery] = useState('');
    const [popular, setPopular] = useState<ProcedureWithDetails[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    // Cargar trámites populares
    const loadPopular = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await procedureService.getProcedures({ limit: 6 });
            setPopular(response.data);
        } catch (err) {
            if (err instanceof ProcedureServiceError) {
                setError(err.message);
            } else {
                setError('Error al cargar los trámites');
            }
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadPopular();
    }, [loadPopular]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (query.trim().length >= 2) {
            navigate(`/buscar?q=${encodeURIComponent(query.trim())}`);
        }
    };

    return (
        <div className="min-h-screen">
            {/* Hero Section */}
            <section className="bg-gradient-to-b from-blue-50 via-white to-white py-16 md:py-24">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                        ¿Qué necesitas hacer?
                    </h1>
                    <p className="text-lg md:text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
                        Encuentra el trámite que necesitas y descubre qué documentos, requisitos y pasos necesitas.
                    </p>

                    {/* Buscador principal */}
                    <form onSubmit={handleSearch} className="max-w-2xl mx-auto" role="search">
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
                                className="input pl-12 pr-32 h-14 text-base shadow-lg"
                                aria-label="Buscar trámite"
                            />
                            <button
                                type="submit"
                                className="absolute right-2 top-1/2 -translate-y-1/2 btn-primary btn-md"
                                disabled={query.trim().length < 2}
                            >
                                Buscar
                            </button>
                        </div>
                    </form>

                    {/* Ayuda */}
                    <div className="mt-8">
                        <p className="text-sm text-gray-500 mb-3">¿No sabes qué trámite necesitas?</p>
                        <Link to="/asistente" className="btn-outline btn-md">
                            <span aria-hidden="true">🤖</span> Te ayudamos
                        </Link>
                    </div>
                </div>
            </section>

            {/* Categorías */}
            <section className="section bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="section-title">
                        <h2>¿Qué estás buscando?</h2>
                        <p className="section-subtitle">
                            Explora por categoría para encontrar el trámite que necesitas
                        </p>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {PROCEDURE_CATEGORIES.map((category) => (
                            <CategoryCard
                                key={category.id}
                                id={category.id}
                                name={category.name}
                                slug={category.slug}
                                icon={category.icon}
                            />
                        ))}
                    </div>
                </div>
            </section>

            {/* Trámites populares */}
            <section className="section bg-gray-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="section-title">
                        <h2>Trámites populares</h2>
                        <p className="section-subtitle">
                            Los trámites más consultados por los usuarios
                        </p>
                    </div>

                    {loading ? (
                        <GridSkeleton count={6} />
                    ) : error ? (
                        <ErrorState message={error} onRetry={loadPopular} />
                    ) : popular.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {popular.map((procedure) => (
                                <ProcedureCard key={procedure.id} procedure={procedure} />
                            ))}
                        </div>
                    ) : null}

                    <div className="text-center mt-10">
                        <Link to="/tramites" className="btn-outline btn-lg">
                            Ver todos los trámites
                        </Link>
                    </div>
                </div>
            </section>

            {/* Cómo funciona */}
            <section className="section bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="section-title">
                        <h2>Así de fácil</h2>
                        <p className="section-subtitle">
                            Tres pasos para resolver tu trámite
                        </p>
                    </div>
                    <div className="grid md:grid-cols-3 gap-8">
                        {[
                            {
                                icon: '🔍',
                                title: 'Dinos qué necesitas',
                                description: 'Busca tu trámite o usa el asistente para encontrarlo.'
                            },
                            {
                                icon: '📋',
                                title: 'Descubre qué necesitas',
                                description: 'Requisitos, documentos y pasos explicados claramente.'
                            },
                            {
                                icon: '✅',
                                title: 'Sigue los pasos',
                                description: 'Accede a los enlaces oficiales y completa tu trámite.'
                            }
                        ].map((step, i) => (
                            <div key={i} className="text-center">
                                <div className="relative inline-flex mb-4">
                                    <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center text-3xl">
                                        <span aria-hidden="true">{step.icon}</span>
                                    </div>
                                    <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
                                        {i + 1}
                                    </span>
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-2">{step.title}</h3>
                                <p className="text-gray-600 max-w-xs mx-auto">{step.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Confianza */}
            <section className="section bg-gray-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="section-title">
                        <h2>Información clara y fácil de entender</h2>
                        <p className="section-subtitle">
                            Todo lo que necesitas saber, organizado y explicado
                        </p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl mx-auto">
                        {[
                            { icon: '✓', title: 'Requisitos organizados', desc: 'Cada trámite con sus requisitos claramente listados.' },
                            { icon: '✓', title: 'Documentación necesaria', desc: 'Sepa exactamente qué documentos necesitas llevar.' },
                            { icon: '✓', title: 'Pasos explicados', desc: 'Instrucciones paso a paso para completar tu trámite.' },
                            { icon: '✓', title: 'Enlaces a fuentes oficiales', desc: 'Acceso directo a los sitios web de las administraciones.' },
                            { icon: '✓', title: 'Información de verificación', desc: 'Sabrás si la información está verificada o es de demostración.' }
                        ].map((item, i) => (
                            <div key={i} className="card p-6 flex items-start gap-4">
                                <div className="w-8 h-8 rounded-full bg-green-100 text-green-700 flex items-center justify-center flex-shrink-0">
                                    <span aria-hidden="true">{item.icon}</span>
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-900 mb-1">{item.title}</h3>
                                    <p className="text-sm text-gray-600">{item.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="py-16 bg-blue-600">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <h2 className="text-3xl font-bold text-white mb-4">
                        ¿Necesitas ayuda con un trámite?
                    </h2>
                    <p className="text-lg text-blue-100 mb-8">
                        Nuestro asistente te guiará paso a paso.
                    </p>
                    <Link
                        to="/asistente"
                        className="inline-flex items-center justify-center btn bg-white text-blue-700 hover:bg-blue-50 btn-lg"
                    >
                        <span aria-hidden="true">🤖</span> Probar el asistente
                    </Link>
                </div>
            </section>
        </div>
    );
}