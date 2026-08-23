import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getSupabaseClient, accountService, LEGAL_DISCLAIMER } from '@trami-espana/shared';

export default function Profile() {
    const [fullName, setFullName] = useState('');
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [confirmingDelete, setConfirmingDelete] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [exporting, setExporting] = useState(false);

    const { user, logout, loading: authLoading } = useAuth();
    const navigate = useNavigate();

    // Cargar datos del perfil
    useEffect(() => {
        if (user?.user_metadata?.full_name) {
            setFullName(user.user_metadata.full_name);
        }
    }, [user]);

    // Redirigir si no está autenticado (esperando a que la sesión cargue
    // para no enviar al login a un usuario ya autenticado que recarga la página)
    useEffect(() => {
        if (!authLoading && !user) {
            navigate('/login', { state: { from: { pathname: '/perfil' } } });
        }
    }, [user, authLoading, navigate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setMessage(null);

        try {
            // Actualizar metadata del usuario
            const { error } = await getSupabaseClient()
                .auth.updateUser({
                    data: {
                        full_name: fullName
                    }
                });

            if (error) {
                setMessage({ type: 'error', text: 'Error al actualizar el perfil' });
            } else {
                setMessage({ type: 'success', text: 'Perfil actualizado correctamente' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Error al actualizar el perfil' });
        } finally {
            setSaving(false);
        }
    };

    const handleLogout = async () => {
        const result = await logout();
        if (!result.error) {
            navigate('/');
        }
    };

    // Eliminación real de la cuenta y sus datos (RPC delete_my_account).
    const handleDeleteAccount = async () => {
        if (!user) return;
        setDeleting(true);
        setMessage(null);
        const result = await accountService.deleteAccount();
        if (result.error) {
            setMessage({ type: 'error', text: 'No se pudo eliminar la cuenta. Inténtalo más tarde o contacta con nosotros.' });
            setDeleting(false);
            setConfirmingDelete(false);
            return;
        }
        // La cuenta se ha borrado en el servidor; cerramos la sesión local.
        await logout();
        navigate('/');
    };

    // Exportación / portabilidad de los datos del usuario.
    const handleExportData = async () => {
        if (!user) return;
        setExporting(true);
        setMessage(null);
        const result = await accountService.exportUserData();
        setExporting(false);
        if (result.error || !result.data) {
            setMessage({ type: 'error', text: result.error?.message || 'No se pudieron exportar los datos.' });
            return;
        }
        // Descargar como JSON en el navegador.
        const blob = new Blob([JSON.stringify(result.data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `trami-espana-mis-datos-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setMessage({ type: 'success', text: 'Tus datos se han exportado. Revisa los archivos descargados.' });
    };

    if (!user) {
        return null;
    }

    return (
        <div className="min-h-screen bg-gray-50 py-12">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-8">
                    Mi perfil
                </h1>

                {/* Información del usuario */}
                <div className="card p-8 mb-6">
                    <h2 className="text-2xl font-semibold text-gray-900 mb-6">
                        Información personal
                    </h2>

                    {message && (
                        <div className={`p-4 rounded-lg mb-6 ${message.type === 'success'
                            ? 'bg-green-50 border border-green-200 text-green-800'
                            : 'bg-red-50 border border-red-200 text-red-800'
                            }`}>
                            {message.text}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label htmlFor="email" className="label">
                                Email
                            </label>
                            <input
                                id="email"
                                type="email"
                                value={user.email || ''}
                                className="input bg-gray-100"
                                disabled
                            />
                            <p className="text-sm text-gray-500 mt-1">
                                El email no se puede modificar
                            </p>
                        </div>

                        <div>
                            <label htmlFor="fullName" className="label">
                                Nombre completo (opcional)
                            </label>
                            <input
                                id="fullName"
                                type="text"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                className="input"
                                placeholder="Juan García López"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={saving}
                            className="btn-primary btn-md disabled:opacity-50"
                        >
                            {saving ? 'Guardando...' : 'Guardar cambios'}
                        </button>
                    </form>
                </div>

                {/* Acciones de la cuenta */}
                <div className="card p-8 mb-6">
                    <h2 className="text-2xl font-semibold text-gray-900 mb-6">
                        Acciones de la cuenta
                    </h2>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                            <div>
                                <h3 className="font-medium text-gray-900">
                                    Cerrar sesión
                                </h3>
                                <p className="text-sm text-gray-600">
                                    Cierra tu sesión actual
                                </p>
                            </div>
                            <button
                                onClick={handleLogout}
                                className="btn-outline btn-md"
                            >
                                Cerrar sesión
                            </button>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                            <div>
                                <h3 className="font-medium text-gray-900">
                                    Exportar mis datos
                                </h3>
                                <p className="text-sm text-gray-600">
                                    Descarga una copia de tus favoritos, recordatorios y conversaciones (portabilidad).
                                </p>
                            </div>
                            <button
                                onClick={handleExportData}
                                disabled={exporting}
                                className="btn-outline btn-md disabled:opacity-50"
                            >
                                {exporting ? 'Exportando...' : 'Exportar'}
                            </button>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg border border-red-200">
                            <div>
                                <h3 className="font-medium text-red-900">
                                    Eliminar cuenta
                                </h3>
                                <p className="text-sm text-red-700">
                                    Esta acción no se puede deshacer y borra tus datos en el servidor.
                                </p>
                            </div>
                            {confirmingDelete ? (
                                <>
                                    <p className="text-sm text-red-700 mb-2">
                                        ¿Seguro que quieres eliminar tu cuenta y todos tus datos? Esta acción no se puede deshacer.
                                    </p>
                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => setConfirmingDelete(false)}
                                            className="btn-md btn-outline"
                                            disabled={deleting}
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            onClick={handleDeleteAccount}
                                            disabled={deleting}
                                            className="btn-md bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                                        >
                                            {deleting ? 'Eliminando...' : 'Sí, eliminar mi cuenta'}
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <button
                                    onClick={() => setConfirmingDelete(true)}
                                    className="btn-md bg-red-600 text-white hover:bg-red-700"
                                >
                                    Eliminar cuenta
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Información legal */}
                <div className="bg-blue-50 border-l-4 border-blue-500 p-4">
                    <p className="text-sm text-blue-800">
                        {LEGAL_DISCLAIMER}
                    </p>
                </div>
            </div>
        </div>
    );
}
