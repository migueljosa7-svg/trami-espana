import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Button } from './Button';

interface EmptyStateProps {
    icon?: ReactNode;
    title: string;
    description?: string;
    actionLabel?: string;
    onAction?: () => void;
    actionHref?: string;
}

export function EmptyState({
    icon,
    title,
    description,
    actionLabel,
    onAction,
    actionHref
}: EmptyStateProps) {
    return (
        <div className="text-center py-16">
            {icon && <div className="text-6xl mb-4">{icon}</div>}
            <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>
            {description && <p className="text-gray-500 max-w-md mx-auto mb-6">{description}</p>}
            {actionLabel && actionHref && (
                <Link to={actionHref}>
                    <Button variant="primary" className="min-w-[140px]">
                        {actionLabel}
                    </Button>
                </Link>
            )}
            {actionLabel && onAction && !actionHref && (
                <Button variant="primary" onClick={onAction}>
                    {actionLabel}
                </Button>
            )}
        </div>
    );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
    return (
        <div className="max-w-2xl mx-auto">
            <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center">
                <div className="text-5xl mb-4">⚠️</div>
                <h3 className="text-lg font-semibold text-red-800 mb-2">Ha ocurrido un problema</h3>
                <p className="text-red-700 mb-6">{message}</p>
                {onRetry && (
                    <Button variant="primary" onClick={onRetry}>
                        Reintentar
                    </Button>
                )}
            </div>
        </div>
    );
}