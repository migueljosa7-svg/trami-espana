import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { procedureService, ProcedureServiceError } from '@trami-espana/shared';
import type { ProcedureWithDetails } from '@trami-espana/shared';

export default function ProcedureDetail() {
    const { slug } = useParams<{ slug: string }>();
    const [procedure, setProcedure] = useState<ProcedureWithDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (slug) {
            loadProcedure(slug);
        }
    }, [slug]);

    const loadProcedure = async (procedureSlug: string) => {
        try {
            setLoading(true);
            setError(null);
            const data = await procedureService.getProcedureBySlug(procedureSlug);
            setProcedure(data);
        } catch (err) {
            if (err instanceof ProcedureServiceError) {
                setError(err.message);
            } else {
                setError('Error al cargar el trámite');
            }
        } finally {
            setLoading(false);
        }
    };

    const getLinkTypeLabel = (linkType: string) => {
        const labels: Record<string, string> = {
            'official': 'Oficial',
            'appointment': 'Cita previa',
            'information': 'Información',
            'download': 'Descarga',
            'other': 'Otro'
        };
        return labels[linkType] || linkType;
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-primary"></div>
                    <p className="text-gray-500 mt-4">Cargando trámite...</p>
                </div>
            </div>
        );
    }

    if (error || !procedure) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="max-w-2xl mx-auto px-4">
                    <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                        <p className="text-red-800 mb-4">
                            {error || 'Trámite no encontrado'}
                        </p>
                        <Link to="/tramites" className="btn-primary btn-md">
                            Volver a trámites
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                {/* Disclaimer */}
                <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-8">
                    <p className="text-sm text-blue-800">
                        <strong>Importante:</strong> Trami España no es una administración pública.
                        Esta información es orientativa. Verifica siempre en las fuentes oficiales.
                    </p>
                </div>

                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-2 mb-4">
                        <span className="text-xs font-medium text-primary bg-blue-50 px-2 py-1 rounded">
                            {procedure.category?.name || 'Sin categoría'}
                        </span>
                        <span className="text-xs text-gray-500">
                            {procedure.scope === 'estatal' ? 'Estatal' :
                                procedure.scope === 'autonómico' ? 'Autonómico' :
                                    procedure.scope === 'provincial' ? 'Provincial' : 'Municipal'}
                        </span>
                    </div>
                    <h1 className="text-4xl font-bold text-gray-900 mb-4">
                        {procedure.title.replace('[DEMO] ', '')}
                    </h1>
                    <p className="text-xl text-gray-600">
                        {procedure.short_description}
                    </p>
                </div>

                {/* Información del trámite */}
                <div className="card p-8 mb-8">
                    <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                        Descripción
                    </h2>
                    <p className="text-gray-700 whitespace-pre-wrap">
                        {procedure.description}
                    </p>
                </div>

                {/* Requisitos */}
                {procedure.requirements && procedure.requirements.length > 0 && (
                    <div className="card p-8 mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                            Requisitos
                        </h2>
                        <ul className="space-y-2">
                            {procedure.requirements.map((req) => (
                                <li key={req.id} className="flex items-start">
                                    <span className="text-primary mr-2">✓</span>
                                    <div>
                                        <p className="font-medium text-gray-900">{req.title}</p>
                                        {req.description && (
                                            <p className="text-sm text-gray-600">{req.description}</p>
                                        )}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Documentación */}
                {procedure.documents && procedure.documents.length > 0 && (
                    <div className="card p-8 mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                            Documentación necesaria
                        </h2>
                        <ul className="space-y-2">
                            {procedure.documents.map((doc) => (
                                <li key={doc.id} className="flex items-start">
                                    <span className="text-primary mr-2">📄</span>
                                    <div>
                                        <p className="font-medium text-gray-900">{doc.name}</p>
                                        {doc.description && (
                                            <p className="text-sm text-gray-600">{doc.description}</p>
                                        )}
                                        {!doc.is_required && (
                                            <span className="text-xs text-gray-500">(Opcional)</span>
                                        )}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Pasos */}
                {procedure.steps && procedure.steps.length > 0 && (
                    <div className="card p-8 mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                            Pasos a seguir
                        </h2>
                        <div className="space-y-4">
                            {procedure.steps
                                .sort((a, b) => a.order_index - b.order_index)
                                .map((step) => (
                                    <div key={step.id} className="flex items-start">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-4 flex-shrink-0 ${step.is_important ? 'bg-red-100' : 'bg-blue-100'
                                            }`}>
                                            <span className={`font-bold ${step.is_important ? 'text-red-600' : 'text-blue-600'
                                                }`}>
                                                {step.order_index}
                                            </span>
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="font-semibold text-gray-900 mb-1">
                                                {step.title}
                                                {step.is_important && (
                                                    <span className="ml-2 text-xs bg-red-100 text-red-700 px-2 py-1 rounded">
                                                        Importante
                                                    </span>
                                                )}
                                            </h3>
                                            <p className="text-gray-600">{step.description}</p>
                                        </div>
                                    </div>
                                ))}
                        </div>
                    </div>
                )}

                {/* Enlaces */}
                {procedure.links && procedure.links.length > 0 && (
                    <div className="card p-8 mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                            Enlaces relacionados
                        </h2>
                        <div className="space-y-3">
                            {procedure.links
                                .sort((a) => (a.is_official ? -1 : 1))
                                .map((link) => (
                                    <a
                                        key={link.id}
                                        href={link.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                                    >
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <p className="font-medium text-gray-900">
                                                    {link.title}
                                                </p>
                                                {link.is_official && (
                                                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                                                        Oficial
                                                    </span>
                                                )}
                                            </div>
                                            {link.description && (
                                                <p className="text-sm text-gray-600 mt-1">
                                                    {link.description}
                                                </p>
                                            )}
                                            <p className="text-xs text-gray-500 mt-1">
                                                {getLinkTypeLabel(link.link_type)}
                                            </p>
                                        </div>
                                        <span className="text-primary ml-4">↗</span>
                                    </a>
                                ))}
                        </div>
                    </div>
                )}

                {/* Fuente y verificación */}
                <div className="card p-8">
                    <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                        Información de la fuente
                    </h2>
                    <div className="space-y-2 text-sm text-gray-600">
                        <p>
                            <strong>Fuente:</strong> {procedure.source}
                        </p>
                        {procedure.source_url && (
                            <p>
                                <strong>URL de la fuente:</strong>{' '}
                                <a
                                    href={procedure.source_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary hover:underline"
                                >
                                    {procedure.source_url}
                                </a>
                            </p>
                        )}
                        {procedure.last_verified_at && (
                            <p>
                                <strong>Última verificación:</strong>{' '}
                                {new Date(procedure.last_verified_at).toLocaleDateString('es-ES')}
                            </p>
                        )}
                        <p>
                            <strong>Estado de verificación:</strong>{' '}
                            <span className="text-yellow-600">
                                {procedure.verification_status === 'draft' ? 'Borrador (DEMO)' :
                                    procedure.verification_status === 'verified' ? 'Verificado' :
                                        procedure.verification_status === 'needs_review' ? 'Necesita revisión' :
                                            'Archivado'}
                            </span>
                        </p>
                    </div>
                </div>

                {/* Botón volver */}
                <div className="mt-8 text-center">
                    <Link to="/tramites" className="btn-outline btn-md">
                        ← Volver a todos los trámites
                    </Link>
                </div>
            </div>
        </div>
    );
}