import { ReactNode, useEffect } from 'react';

interface ModalProps {
    open: boolean;
    onClose: () => void;
    title?: string;
    description?: string;
    children: ReactNode;
    footer?: ReactNode;
}

export function Modal({ open, onClose, title, description, children, footer }: ModalProps) {
    // Cerrar con Escape
    useEffect(() => {
        if (!open) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [open, onClose]);

    // Bloquear scroll del body
    useEffect(() => {
        if (open) {
            document.body.style.overflow = 'hidden';
            return () => {
                document.body.style.overflow = '';
            };
        }
    }, [open]);

    if (!open) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? 'modal-title' : undefined}
        >
            {/* Overlay */}
            <div
                className="absolute inset-0 bg-black/50 animate-fade-in"
                onClick={onClose}
            />

            {/* Contenido */}
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-slide-up">
                {/* Header */}
                <div className="flex items-start justify-between p-6 pb-4 border-b border-gray-100">
                    <div>
                        {title && <h2 id="modal-title" className="text-lg font-semibold text-gray-900">{title}</h2>}
                        {description && <p className="text-sm text-gray-500 mt-1">{description}</p>}
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100"
                        aria-label="Cerrar"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Body */}
                <div className="p-6">{children}</div>

                {/* Footer */}
                {footer && <div className="px-6 py-4 border-t border-gray-100">{footer}</div>}
            </div>
        </div>
    );
}