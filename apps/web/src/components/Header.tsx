import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { APP_NAME } from '@trami-espana/shared';
import { useAuth } from '../contexts/AuthContext';

const navItems = [
    { to: '/tramites', label: 'Trámites' },
    { to: '/buscar', label: 'Buscar' },
    { to: '/asistente', label: 'Asistente' }
];

export default function Header() {
    const { user, loading } = useAuth();
    const [mobileOpen, setMobileOpen] = useState(false);

    return (
        <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    {/* Logo */}
                    <Link to="/" className="flex items-center gap-2.5" aria-label="Trami España - Inicio">
                        <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center shadow-sm">
                            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                <path d="M12 2a4 4 0 014 4v2a4 4 0 01-4 4 4 4 0 01-4-4V6a4 4 0 014-4zm0 2a2 2 0 00-2 2v2a2 2 0 004 0V6a2 2 0 00-2-2zm-7 12a2 2 0 012-2h10a2 2 0 012 2v6h-2v-4H7v4H5v-6z" />
                            </svg>
                        </div>
                        <span className="text-xl font-bold text-gray-900">
                            {APP_NAME}
                        </span>
                    </Link>

                    {/* Navegación desktop */}
                    <nav className="hidden md:flex items-center gap-1" aria-label="Navegación principal">
                        {navItems.map((item) => (
                            <NavLink
                                key={item.to}
                                to={item.to}
                                className={({ isActive }) =>
                                    `px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive
                                        ? 'text-blue-700 bg-blue-50'
                                        : 'text-gray-700 hover:text-blue-700 hover:bg-gray-50'
                                    }`
                                }
                            >
                                {item.label}
                            </NavLink>
                        ))}
                    </nav>

                    {/* Acciones derecha */}
                    <div className="hidden md:flex items-center gap-2">
                        {loading ? (
                            <div className="skeleton h-9 w-24" aria-hidden="true" />
                        ) : user ? (
                            <>
                                <NavLink
                                    to="/favoritos"
                                    className="p-2 rounded-lg text-gray-600 hover:text-blue-600 hover:bg-gray-50 transition-colors"
                                    aria-label="Mis favoritos"
                                    title="Favoritos"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.196-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.783-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                                    </svg>
                                </NavLink>
                                <NavLink
                                    to="/recordatorios"
                                    className="p-2 rounded-lg text-gray-600 hover:text-blue-600 hover:bg-gray-50 transition-colors"
                                    aria-label="Mis recordatorios"
                                    title="Recordatorios"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                    </svg>
                                </NavLink>
                                <NavLink
                                    to="/perfil"
                                    className={({ isActive }) =>
                                        `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive
                                            ? 'text-blue-700 bg-blue-50'
                                            : 'text-gray-700 hover:text-blue-700 hover:bg-gray-50'
                                        }`
                                    }
                                >
                                    <span className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-semibold">
                                        {(user.email || 'U')[0].toUpperCase()}
                                    </span>
                                    <span className="hidden lg:inline">Perfil</span>
                                </NavLink>
                            </>
                        ) : (
                            <Link
                                to="/login"
                                className="btn-primary btn-md ml-2"
                            >
                                Iniciar sesión
                            </Link>
                        )}
                    </div>

                    {/* Botón menú móvil */}
                    <button
                        onClick={() => setMobileOpen(!mobileOpen)}
                        className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
                        aria-label={mobileOpen ? 'Cerrar menú' : 'Abrir menú'}
                        aria-expanded={mobileOpen}
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            {mobileOpen ? (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            ) : (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            )}
                        </svg>
                    </button>
                </div>

                {/* Menú móvil */}
                {mobileOpen && (
                    <nav className="md:hidden py-4 border-t border-gray-100 space-y-1 animate-slide-down" aria-label="Navegación móvil">
                        {navItems.map((item) => (
                            <NavLink
                                key={item.to}
                                to={item.to}
                                onClick={() => setMobileOpen(false)}
                                className={({ isActive }) =>
                                    `block px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive
                                        ? 'text-blue-700 bg-blue-50'
                                        : 'text-gray-700 hover:text-blue-700 hover:bg-gray-50'
                                    }`
                                }
                            >
                                {item.label}
                            </NavLink>
                        ))}

                        <div className="pt-3 border-t border-gray-100 mt-3 space-y-1">
                            {loading ? (
                                <div className="skeleton h-10 w-full" />
                            ) : user ? (
                                <>
                                    <Link
                                        to="/favoritos"
                                        onClick={() => setMobileOpen(false)}
                                        className="block px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                                    >
                                        ⭐ Mis favoritos
                                    </Link>
                                    <Link
                                        to="/recordatorios"
                                        onClick={() => setMobileOpen(false)}
                                        className="block px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                                    >
                                        🔔 Mis recordatorios
                                    </Link>
                                    <Link
                                        to="/perfil"
                                        onClick={() => setMobileOpen(false)}
                                        className="block px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                                    >
                                        👤 Mi perfil
                                    </Link>
                                </>
                            ) : (
                                <Link
                                    to="/login"
                                    onClick={() => setMobileOpen(false)}
                                    className="btn-primary btn-md w-full"
                                >
                                    Iniciar sesión
                                </Link>
                            )}
                        </div>
                    </nav>
                )}
            </div>
        </header>
    );
}