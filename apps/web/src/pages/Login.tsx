import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { isEmailNotConfirmedError } from '@trami-espana/shared';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLogin, setIsLogin] = useState(true);
    const [fullName, setFullName] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [acceptedTerms, setAcceptedTerms] = useState(false);
    const [showResetPassword, setShowResetPassword] = useState(false);
    const [resetEmailSent, setResetEmailSent] = useState(false);
    const [passwordUpdated, setPasswordUpdated] = useState(false);
    const [emailConfirmationRequired, setEmailConfirmationRequired] = useState(false);
    const [resendStatus, setResendStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    // Error local de validación del formulario (términos, confirmación…)
    const [localError, setLocalError] = useState<string | null>(null);

    const { login, register, resetPassword, updatePassword, resendConfirmation, loading, error, clearError, isRecovery, clearRecovery } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    // Evita el doble submit / múltiples peticiones simultáneas.
    const submittingRef = useRef(false);

    // Si la URL trae ?reset=true, mostrar el formulario de recuperación
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        if (params.get('reset') === 'true') {
            setShowResetPassword(true);
        }
    }, [location.search]);

    // Al entrar en modo recuperación, el contexto gestiona el estado.
    useEffect(() => {
        if (isRecovery) {
            // En modo recuperación mostramos el formulario de nueva contraseña
            return;
        }
    }, [isRecovery]);

    // Limpiar errores al cambiar de modo
    useEffect(() => {
        clearError();
        setLocalError(null);
        setResendStatus(null);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isLogin, showResetPassword]);

    const handleResendConfirmation = async () => {
        if (submittingRef.current) return;
        submittingRef.current = true;
        setResendStatus(null);
        setLocalError(null);
        const result = await resendConfirmation(email);
        submittingRef.current = false;
        if (result.error) {
            setResendStatus({ type: 'error', text: result.error.message });
        } else {
            setResendStatus({ type: 'success', text: 'Te hemos enviado un nuevo email de confirmación.' });
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        clearError();
        setLocalError(null);
        setResendStatus(null);

        // Evitar doble submit / múltiples requests.
        if (submittingRef.current || loading) return;
        submittingRef.current = true;

        try {
            // Modo recuperación: mostrar formulario de nueva contraseña
            if (isRecovery) {
                if (password !== confirmPassword) {
                    setLocalError('Las contraseñas no coinciden.');
                    return;
                }
                const result = await updatePassword(password);
                if (!result.error) {
                    setPasswordUpdated(true);
                }
                return;
            }

            if (showResetPassword) {
                const result = await resetPassword(email);
                if (!result.error) {
                    setResetEmailSent(true);
                } else {
                    setLocalError(result.error.message);
                }
                return;
            }

            if (isLogin) {
                const result = await login(email, password);
                if (result.error) {
                    // Email registrado pero sin confirmar → pantalla de confirmación.
                    if (isEmailNotConfirmedError(result.error)) {
                        setEmailConfirmationRequired(true);
                    } else {
                        setLocalError(result.error.message);
                    }
                    return;
                }
                // Redirigir a la página que intentaba acceder o al home
                const from = location.state?.from?.pathname || '/';
                navigate(from, { replace: true });
            } else {
                if (!acceptedTerms) {
                    setLocalError('Debes aceptar los Términos y condiciones y la Política de privacidad para continuar.');
                    return;
                }

                if (password !== confirmPassword) {
                    setLocalError('Las contraseñas no coinciden.');
                    return;
                }

                const result = await register(email, password, confirmPassword, fullName);
                if (result.error) {
                    setLocalError(result.error.message);
                    return;
                }
                if (result.requiresEmailConfirmation) {
                    // Supabase requiere confirmar el email antes de entrar
                    setEmailConfirmationRequired(true);
                } else {
                    // Sesión activa inmediata: redirigir al home
                    navigate('/', { replace: true });
                }
            }
        } finally {
            submittingRef.current = false;
        }
    };

    // Si se envió el email de recuperación
    if (resetEmailSent) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
                <div className="max-w-md w-full">
                    <div className="card p-8">
                        <div className="text-center">
                            <div className="text-5xl mb-4">📧</div>
                            <h2 className="text-2xl font-bold text-gray-900 mb-4">
                                Email enviado
                            </h2>
                            <p className="text-gray-600 mb-6">
                                Si existe una cuenta asociada a ese correo, recibirás instrucciones
                                para restablecer tu contraseña. Revisa tu bandeja de entrada (y la
                                carpeta de spam).
                            </p>
                            <button
                                onClick={() => {
                                    setShowResetPassword(false);
                                    setResetEmailSent(false);
                                    setEmail('');
                                }}
                                className="btn-primary btn-md"
                            >
                                Volver al inicio de sesión
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Si se actualizó la contraseña satisfactoriamente
    if (passwordUpdated) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
                <div className="max-w-md w-full">
                    <div className="card p-8">
                        <div className="text-center">
                            <div className="text-5xl mb-4">🔒</div>
                            <h2 className="text-2xl font-bold text-gray-900 mb-4">
                                Contraseña actualizada
                            </h2>
                            <p className="text-gray-600 mb-6">
                                Tu contraseña se ha actualizado correctamente.
                                Ya puedes iniciar sesión con tu nueva contraseña.
                            </p>
                            <button
                                onClick={() => {
                                    clearRecovery();
                                    setPasswordUpdated(false);
                                    setIsLogin(true);
                                    setPassword('');
                                    setConfirmPassword('');
                                }}
                                className="btn-primary btn-md"
                            >
                                Iniciar sesión
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Si se requiere confirmación de email tras el registro
    if (emailConfirmationRequired) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
                <div className="max-w-md w-full">
                    <div className="card p-8">
                        <div className="text-center">
                            <div className="text-5xl mb-4">📧</div>
                            <h2 className="text-2xl font-bold text-gray-900 mb-4">
                                Confirma tu email
                            </h2>
                            <p className="text-gray-600 mb-2">
                                Te hemos enviado un email de confirmación a <strong>{email}</strong>.
                            </p>
                            <p className="text-gray-600 mb-6">
                                Revisa tu bandeja de entrada (y la carpeta de spam) para activar tu
                                cuenta y poder iniciar sesión.
                            </p>

                            {resendStatus && (
                                <div
                                    className={`mb-4 rounded-lg p-3 text-sm ${resendStatus.type === 'success'
                                        ? 'bg-green-50 border border-green-200 text-green-800'
                                        : 'bg-red-50 border border-red-200 text-red-800'
                                        }`}
                                    role="status"
                                >
                                    {resendStatus.text}
                                </div>
                            )}

                            <div className="flex flex-col gap-3">
                                <button
                                    onClick={handleResendConfirmation}
                                    disabled={loading}
                                    className="btn-outline btn-md w-full disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loading ? 'Enviando...' : 'Reenviar email de confirmación'}
                                </button>
                                <button
                                    onClick={() => {
                                        setEmailConfirmationRequired(false);
                                        setIsLogin(true);
                                        setPassword('');
                                        setLocalError(null);
                                        setResendStatus(null);
                                    }}
                                    className="btn-primary btn-md w-full"
                                >
                                    Volver a iniciar sesión
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
            <div className="max-w-md w-full">
                <div className="card p-8">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">
                            {isRecovery ? 'Nueva contraseña' :
                                showResetPassword ? 'Recuperar contraseña' :
                                    isLogin ? 'Iniciar sesión' : 'Crear cuenta'}
                        </h1>
                        <p className="text-gray-600">
                            {isRecovery ? 'Introduce tu nueva contraseña' :
                                showResetPassword ? 'Te enviaremos instrucciones para restablecer tu contraseña' :
                                    isLogin ? 'Accede a tu cuenta de Trami España' :
                                        'Únete a Trami España'}
                        </p>
                    </div>

                    {/* Disclaimer Legal */}
                    <div className="bg-blue-50 border-l-4 border-blue-500 p-3 mb-6 text-sm">
                        <p className="text-blue-800">
                            <strong>Trami España</strong> es un servicio independiente y no está afiliado,
                            patrocinado ni respaldado por ninguna administración pública.
                        </p>
                    </div>

                    {/* Error Message (fallback del contexto o validación local) */}
                    {(error || localError) && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                            <p className="text-red-800 text-sm">{localError || error}</p>
                        </div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                        {!isLogin && !showResetPassword && !isRecovery && (
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
                        )}

                        {!isRecovery && (
                            <div>
                                <label htmlFor="email" className="label">
                                    Email
                                </label>
                                <input
                                    id="email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="input"
                                    placeholder="tu@email.com"
                                    required
                                />
                            </div>
                        )}

                        {!showResetPassword && !isRecovery && (
                            <div>
                                <label htmlFor="password" className="label">
                                    Contraseña
                                </label>
                                <input
                                    id="password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="input"
                                    placeholder="••••••••"
                                    required
                                    minLength={6}
                                />
                            </div>
                        )}

                        {isRecovery && (
                            <>
                                <div>
                                    <label htmlFor="newPassword" className="label">
                                        Nueva contraseña
                                    </label>
                                    <input
                                        id="newPassword"
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="input"
                                        placeholder="••••••••"
                                        required
                                        minLength={6}
                                    />
                                </div>
                                <div>
                                    <label htmlFor="confirmNewPassword" className="label">
                                        Confirmar nueva contraseña
                                    </label>
                                    <input
                                        id="confirmNewPassword"
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="input"
                                        placeholder="••••••••"
                                        required
                                        minLength={6}
                                    />
                                </div>
                            </>
                        )}

                        {!isLogin && !showResetPassword && !isRecovery && (
                            <div>
                                <label htmlFor="confirmPassword" className="label">
                                    Confirmar contraseña
                                </label>
                                <input
                                    id="confirmPassword"
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="input"
                                    placeholder="••••••••"
                                    required
                                    minLength={6}
                                />
                            </div>
                        )}

                        {!isLogin && !isRecovery && (
                            <div className="flex items-start">
                                <input
                                    id="terms"
                                    type="checkbox"
                                    checked={acceptedTerms}
                                    onChange={(e) => setAcceptedTerms(e.target.checked)}
                                    className="mt-1 mr-2"
                                    required
                                />
                                <label htmlFor="terms" className="text-sm text-gray-600">
                                    He leído y acepto los{' '}
                                    <Link to="/terminos" className="text-primary hover:underline">
                                        Términos y condiciones
                                    </Link>{' '}
                                    y la{' '}
                                    <Link to="/privacidad" className="text-primary hover:underline">
                                        Política de privacidad
                                    </Link>
                                </label>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading || (!isLogin && !isRecovery && !acceptedTerms)}
                            className="btn-primary btn-md w-full disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Cargando...' :
                                isRecovery ? 'Actualizar contraseña' :
                                    showResetPassword ? 'Enviar instrucciones' :
                                        isLogin ? 'Iniciar sesión' : 'Registrarse'}
                        </button>
                    </form>

                    {/* Links */}
                    <div className="mt-6 space-y-2">
                        {isLogin && !showResetPassword && !isRecovery && (
                            <>
                                <button
                                    onClick={() => setShowResetPassword(true)}
                                    className="block w-full text-center text-sm text-primary hover:underline"
                                >
                                    ¿Has olvidado tu contraseña?
                                </button>
                                <p className="text-center text-sm text-gray-600">
                                    ¿No tienes cuenta?{' '}
                                    <button
                                        onClick={() => setIsLogin(false)}
                                        className="text-primary hover:underline font-medium"
                                    >
                                        Crear cuenta
                                    </button>
                                </p>
                            </>
                        )}

                        {!isLogin && !showResetPassword && !isRecovery && (
                            <p className="text-center text-sm text-gray-600">
                                ¿Ya tienes cuenta?{' '}
                                <button
                                    onClick={() => setIsLogin(true)}
                                    className="text-primary hover:underline font-medium"
                                >
                                    Iniciar sesión
                                </button>
                            </p>
                        )}

                        {showResetPassword && !isRecovery && (
                            <button
                                onClick={() => setShowResetPassword(false)}
                                className="block w-full text-center text-sm text-primary hover:underline"
                            >
                                Volver al inicio de sesión
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
