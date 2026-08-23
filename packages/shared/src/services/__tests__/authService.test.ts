// ===========================================
// TRAMI ESPAÑA - Tests de Autenticación
// ===========================================
// Tests para validación de login, registro y contraseña

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authService, AuthServiceError, isEmailNotConfirmedError } from '../authService';
import { getSupabaseClient } from '../../supabase';

// Mock del cliente Supabase
vi.mock('../../supabase', () => ({
    getSupabaseClient: vi.fn()
}));

describe('Validación de login', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('debe rechazar email inválido', async () => {
        const mockSignIn = vi.fn().mockResolvedValue({
            data: { user: null, session: null },
            error: { message: 'Invalid email' }
        });

        (getSupabaseClient as any).mockReturnValue({
            auth: {
                signInWithPassword: mockSignIn
            }
        });

        const result = await authService.login({
            email: 'invalid-email',
            password: 'password123'
        });

        expect(result.error).toBeDefined();
        expect(result.error?.message).toBe('Email inválido');
    });

    it('debe rechazar contraseña incorrecta', async () => {
        const mockSignIn = vi.fn().mockResolvedValue({
            data: { user: null, session: null },
            error: { message: 'Invalid login credentials' }
        });

        (getSupabaseClient as any).mockReturnValue({
            auth: {
                signInWithPassword: mockSignIn
            }
        });

        const result = await authService.login({
            email: 'user@test.com',
            password: 'wrongpassword'
        });

        expect(result.error).toBeDefined();
        expect(result.error?.message).toBe('El correo o la contraseña no son correctos.');
    });

    it('debe permitir login correcto', async () => {
        const mockUser = { id: 'user-1', email: 'user@test.com' };
        const mockSession = { access_token: 'token', user: mockUser };

        const mockSignIn = vi.fn().mockResolvedValue({
            data: { user: mockUser, session: mockSession },
            error: null
        });

        (getSupabaseClient as any).mockReturnValue({
            auth: {
                signInWithPassword: mockSignIn
            }
        });

        const result = await authService.login({
            email: 'user@test.com',
            password: 'password123'
        });

        expect(result.error).toBeNull();
        expect(result.user).toEqual(mockUser);
        expect(result.session).toEqual(mockSession);
    });
});

describe('Validación de registro', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('debe rechazar contraseñas que no coinciden', async () => {
        const result = await authService.register({
            email: 'user@test.com',
            password: 'password123',
            confirmPassword: 'different123'
        });

        expect(result.error).toBeDefined();
        expect(result.error?.message).toBe('Las contraseñas no coinciden');
    });

    it('debe rechazar contraseña corta', async () => {
        const result = await authService.register({
            email: 'user@test.com',
            password: '123',
            confirmPassword: '123'
        });

        expect(result.error).toBeDefined();
        expect(result.error?.message).toBe('La contraseña debe tener al menos 6 caracteres');
    });

    it('debe rechazar email ya registrado', async () => {
        const mockSignUp = vi.fn().mockResolvedValue({
            data: { user: null, session: null },
            error: { message: 'User already registered' }
        });

        (getSupabaseClient as any).mockReturnValue({
            auth: {
                signUp: mockSignUp
            }
        });

        const result = await authService.register({
            email: 'existing@test.com',
            password: 'password123',
            confirmPassword: 'password123'
        });

        expect(result.error).toBeDefined();
        expect(result.error?.message).toBe('Este email ya está registrado. Puedes iniciar sesión o recuperar tu contraseña.');
    });

    it('debe permitir registro correcto', async () => {
        const mockUser = { id: 'user-2', email: 'new@test.com' };
        const mockSession = { access_token: 'token', user: mockUser };

        const mockSignUp = vi.fn().mockResolvedValue({
            data: { user: mockUser, session: mockSession },
            error: null
        });

        (getSupabaseClient as any).mockReturnValue({
            auth: {
                signUp: mockSignUp
            }
        });

        const result = await authService.register({
            email: 'new@test.com',
            password: 'password123',
            confirmPassword: 'password123'
        });

        expect(result.error).toBeNull();
        expect(result.user).toEqual(mockUser);
    });
});

describe('Validación de contraseña', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('debe rechazar contraseña vacía', async () => {
        const result = await authService.updatePassword('');

        expect(result.error).toBeDefined();
        expect(result.error?.message).toBe('La contraseña debe tener al menos 6 caracteres');
    });

    it('debe rechazar contraseña de 5 caracteres', async () => {
        const result = await authService.updatePassword('12345');

        expect(result.error).toBeDefined();
        expect(result.error?.message).toBe('La contraseña debe tener al menos 6 caracteres');
    });

    it('debe mapear email_address_invalid a un mensaje UX amigable', async () => {
        const mockSignUp = vi.fn().mockResolvedValue({
            data: { user: null, session: null },
            error: { message: 'Email address ... is invalid', code: 'email_address_invalid' }
        });

        (getSupabaseClient as any).mockReturnValue({
            auth: { signUp: mockSignUp }
        });

        const result = await authService.register({
            email: 'no-valido@dominio.invalid',
            password: 'password123',
            confirmPassword: 'password123'
        });

        expect(result.error).toBeDefined();
        expect(result.error?.message).toBe('El email introducido no es válido.');
        expect(result.error?.message).not.toContain('email_address_invalid');
        expect(result.error?.message).not.toContain('is invalid');
    });
});

describe('Email no confirmado', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('login con email no confirmado (por código) devuelve error mapeado y detectable', async () => {
        const mockSignIn = vi.fn().mockResolvedValue({
            data: { user: null, session: null },
            error: { message: 'Email not confirmed', code: 'email_not_confirmed' }
        });

        (getSupabaseClient as any).mockReturnValue({
            auth: { signInWithPassword: mockSignIn }
        });

        const result = await authService.login({
            email: 'user@test.com',
            password: 'password123'
        });

        expect(result.error).toBeDefined();
        expect(result.error?.message).toBe('Email no confirmado. Revisa tu bandeja de entrada.');
        expect(isEmailNotConfirmedError(result.error)).toBe(true);
    });

    it('isEmailNotConfirmedError detecta por código aunque el mensaje sea distinto', () => {
        const err = new AuthServiceError('Mensaje genérico', 'email_not_confirmed');
        expect(isEmailNotConfirmedError(err)).toBe(true);
        expect(isEmailNotConfirmedError(null)).toBe(false);
        expect(isEmailNotConfirmedError(new Error('otro error'))).toBe(false);
    });
});

describe('Reenvío de confirmación', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('debe llamar a auth.resend con type signup y email', async () => {
        const mockResend = vi.fn().mockResolvedValue({ data: {}, error: null });
        (getSupabaseClient as any).mockReturnValue({
            auth: { resend: mockResend }
        });

        const result = await authService.resendConfirmation('user@test.com');

        expect(result.error).toBeNull();
        expect(mockResend).toHaveBeenCalled();
        const args = mockResend.mock.calls[0][0];
        expect(args.type).toBe('signup');
        expect(args.email).toBe('user@test.com');
    });

    it('debe mapear el error de reenvío sin exponer texto técnico', async () => {
        const mockResend = vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Too many requests', code: 'over_email_send_rate_limit' }
        });
        (getSupabaseClient as any).mockReturnValue({
            auth: { resend: mockResend }
        });

        const result = await authService.resendConfirmation('user@test.com');
        expect(result.error).toBeDefined();
        // Nunca expone el texto técnico original
        expect(result.error?.message).not.toContain('Too many requests');
        expect(result.error?.message).not.toContain('REST');
        expect(result.error?.message).not.toContain('JWT');
    });
});

describe('Logout', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('debe cerrar sesión correctamente', async () => {
        const mockSignOut = vi.fn().mockResolvedValue({ error: null });
        (getSupabaseClient as any).mockReturnValue({
            auth: { signOut: mockSignOut }
        });

        const result = await authService.logout();
        expect(result.error).toBeNull();
        expect(mockSignOut).toHaveBeenCalled();
    });

    it('debe mapear un error de logout sin exponer texto técnico', async () => {
        const mockSignOut = vi.fn().mockResolvedValue({ error: { message: 'AuthApiError 500' } });
        (getSupabaseClient as any).mockReturnValue({
            auth: { signOut: mockSignOut }
        });

        const result = await authService.logout();
        expect(result.error).toBeDefined();
        expect(result.error?.message).not.toContain('AuthApiError');
        expect(result.error?.message).not.toContain('500');
    });
});

describe('Recuperación de contraseña', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('debe llamar a resetPasswordForEmail y no revelar si la cuenta no existe', async () => {
        const mockReset = vi.fn().mockResolvedValue({ error: { message: 'User not found' } });
        (getSupabaseClient as any).mockReturnValue({
            auth: { resetPasswordForEmail: mockReset }
        });

        const result = await authService.resetPassword('noexiste@test.com');
        // Por seguridad no revelamos la existencia de la cuenta
        expect(result.error).toBeNull();
        expect(mockReset).toHaveBeenCalled();
    });

    it('debe mapear un error de rate limit sin revelar detalles', async () => {
        const mockReset = vi.fn().mockResolvedValue({
            error: { message: 'Rate limit exceeded', code: 'over_email_send_rate_limit' }
        });
        (getSupabaseClient as any).mockReturnValue({
            auth: { resetPasswordForEmail: mockReset }
        });

        const result = await authService.resetPassword('user@test.com');
        expect(result.error).toBeDefined();
        expect(result.error?.message).toContain('Demasiados intentos');
        expect(result.error?.message).not.toContain('400');
    });
});