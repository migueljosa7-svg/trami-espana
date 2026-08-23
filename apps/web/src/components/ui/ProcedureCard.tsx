import { Link } from 'react-router-dom';
import type { ProcedureWithDetails } from '@trami-espana/shared';
import { Badge } from './Badge';

interface ProcedureCardProps {
    procedure: ProcedureWithDetails;
    compact?: boolean;
}

const scopeLabels: Record<string, { label: string; color: 'primary' | 'green' | 'yellow' }> = {
    'estatal': { label: 'Estatal', color: 'primary' },
    'autonómico': { label: 'Autonómico', color: 'green' },
    'provincial': { label: 'Provincial', color: 'yellow' },
    'municipal': { label: 'Municipal', color: 'primary' }
};

export function ProcedureCard({ procedure, compact = false }: ProcedureCardProps) {
    const isDemo = procedure.verification_status === 'draft';
    const title = procedure.title.replace('[DEMO] ', '').trim();
    const scope = scopeLabels[procedure.scope];

    return (
        <Link
            to={`/tramites/${procedure.slug}`}
            className="card card-hover p-6 flex flex-col h-full group"
            aria-label={`Ver trámite: ${title}`}
        >
            <div className="flex items-center justify-between mb-3">
                <Badge variant="primary">
                    {procedure.category?.name || 'Sin categoría'}
                </Badge>
                {scope && (
                    <Badge variant={scope.color}>
                        {scope.label}
                    </Badge>
                )}
            </div>

            <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2 group-hover:text-blue-700 transition-colors">
                {title}
            </h3>

            {!compact && (
                <p className="text-sm text-gray-600 mb-4 line-clamp-3 flex-grow">
                    {procedure.short_description}
                </p>
            )}

            <div className="flex items-center justify-between mt-auto pt-2">
                <span className="text-sm text-gray-500 flex items-center gap-1.5">
                    <span aria-hidden="true">🔗</span>
                    {procedure.links?.filter(l => l.is_official).length || 0} enlaces
                </span>

                {isDemo && (
                    <Badge variant="yellow">
                        <span aria-hidden="true">⚪</span> Demo
                    </Badge>
                )}

                <span className="text-sm font-medium text-blue-600 inline-flex items-center gap-1">
                    Ver trámite
                    <svg
                        className="w-4 h-4 transition-transform group-hover:translate-x-0.5"
                        fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                </span>
            </div>
        </Link>
    );
}