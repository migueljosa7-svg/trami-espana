import { Link } from 'react-router-dom';
import { APP_NAME, LEGAL_DISCLAIMER } from '@trami-espana/shared';

export default function Footer() {
    return (
        <footer className="bg-white border-t border-gray-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
                    <div className="col-span-1 md:col-span-2">
                        <h3 className="text-lg font-bold text-gray-900 mb-2">
                            {APP_NAME}
                        </h3>
                        <p className="text-sm text-gray-600 mb-4 max-w-sm">
                            Encuentra y entiende los trámites administrativos en España de forma clara y sencilla.
                        </p>

                        {/* Disclaimer */}
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                            <p className="text-xs text-gray-600 leading-relaxed">
                                {LEGAL_DISCLAIMER}
                            </p>
                        </div>
                    </div>

                    <div>
                        <h4 className="text-sm font-semibold text-gray-900 mb-3">
                            Enlaces
                        </h4>
                        <ul className="space-y-2.5">
                            {[
                                { to: '/tramites', label: 'Trámites' },
                                { to: '/buscar', label: 'Buscar' },
                                { to: '/asistente', label: 'Asistente' }
                            ].map((link) => (
                                <li key={link.to}>
                                    <Link
                                        to={link.to}
                                        className="text-sm text-gray-600 hover:text-blue-700 transition-colors"
                                    >
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div>
                        <h4 className="text-sm font-semibold text-gray-900 mb-3">
                            Legal
                        </h4>
                        <ul className="space-y-2.5">
                            {[
                                { to: '/privacidad', label: 'Privacidad' },
                                { to: '/terminos', label: 'Términos' },
                                { to: '/cookies', label: 'Cookies' },
                                { to: '/contacto', label: 'Contacto' }
                            ].map((link) => (
                                <li key={link.to}>
                                    <Link
                                        to={link.to}
                                        className="text-sm text-gray-600 hover:text-blue-700 transition-colors"
                                    >
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                <div className="mt-10 pt-8 border-t border-gray-200">
                    <p className="text-sm text-gray-500 text-center">
                        © {new Date().getFullYear()} {APP_NAME}. Todos los derechos reservados.
                    </p>
                </div>
            </div>
        </footer>
    );
}