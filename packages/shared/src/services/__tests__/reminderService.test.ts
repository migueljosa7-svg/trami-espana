// ===========================================
// TRAMI ESPAÑA - Tests de Recordatorios
// ===========================================
// Tests para validación, creación y gestión de recordatorios

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { reminderService } from '../reminderService';
import { getSupabaseClient } from '../../supabase';

// Mock del cliente Supabase
vi.mock('../../supabase', () => ({
    getSupabaseClient: vi.fn()
}));

const mockUser = { id: 'user-1', email: 'user@test.com' };
const mockSession = { user: mockUser };

function mockAuthClient(user: typeof mockUser | null) {
    return {
        auth: {
            getSession: vi
                .fn()
                .mockResolvedValue({ data: { session: user ? mockSession : null } }),
            getUser: vi.fn().mockResolvedValue({ data: { user }, error: null }),
        },
    };
}

describe('Validación de recordatorio', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (getSupabaseClient as any).mockReturnValue({
            ...mockAuthClient(mockUser),
            from: vi.fn().mockReturnThis(),
            insert: vi.fn().mockResolvedValue({ error: null }),
            select: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: null, error: null })
        });
    });

    it('debe rechazar si no hay usuario autenticado', async () => {
        (getSupabaseClient as any).mockReturnValue({
            ...mockAuthClient(null),
        });

        await expect(reminderService.createReminder({
            procedure_id: 'proc-1',
            title: 'Revisar documentación',
            reminder_date: '2026-09-20T10:00:00'
        })).rejects.toThrow('Usuario no autenticado');
    });

    it('debe rechazar con mensaje de sesión expirada si getUser falla sin sesión', async () => {
        (getSupabaseClient as any).mockReturnValue({
            auth: {
                getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
                getUser: vi
                    .fn()
                    .mockResolvedValue({ data: { user: null }, error: new Error('JWT expired') }),
            },
        });

        await expect(
            reminderService.createReminder({
                procedure_id: 'proc-1',
                title: 'Revisar documentación',
                reminder_date: '2026-09-20T10:00:00',
            })
        ).rejects.toThrow('sesión ha expirado');
    });

    it('debe crear un recordatorio manual sin procedure_id (NULL, nunca "")', async () => {
        const mockReminder = {
            id: 'rem-manual',
            user_id: 'user-1',
            procedure_id: null,
            title: 'Recordatorio manual',
            description: null,
            reminder_date: '2026-09-20T10:00:00',
            is_completed: false,
            created_at: '2026-01-01',
            updated_at: '2026-01-01'
        };

        const insertFn = vi.fn().mockReturnThis();
        (getSupabaseClient as any).mockReturnValue({
            ...mockAuthClient(mockUser),
            from: vi.fn().mockReturnThis(),
            insert: insertFn,
            select: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: mockReminder, error: null })
        });

        const result = await reminderService.createReminder({
            procedure_id: null,
            title: 'Recordatorio manual',
            reminder_date: '2026-09-20T10:00:00'
        });

        expect(result).not.toBeNull();
        expect(result?.procedure_id).toBeNull();
        expect(insertFn).toHaveBeenCalledWith(
            expect.objectContaining({ procedure_id: null, user_id: 'user-1' })
        );
    });

    it('debe crear un recordatorio correctamente', async () => {
        const mockReminder = {
            id: 'rem-1',
            user_id: 'user-1',
            procedure_id: 'proc-1',
            title: 'Revisar documentación',
            description: null,
            reminder_date: '2026-09-20T10:00:00',
            is_completed: false,
            created_at: '2026-01-01',
            updated_at: '2026-01-01'
        };

        (getSupabaseClient as any).mockReturnValue({
            ...mockAuthClient(mockUser),
            from: vi.fn().mockReturnThis(),
            insert: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: mockReminder, error: null })
        });

        const result = await reminderService.createReminder({
            procedure_id: 'proc-1',
            title: 'Revisar documentación',
            reminder_date: '2026-09-20T10:00:00'
        });

        expect(result).not.toBeNull();
        expect(result?.title).toBe('Revisar documentación');
        expect(result?.procedure_id).toBe('proc-1');
    });

    it('debe crear un recordatorio con descripción', async () => {
        const mockReminder = {
            id: 'rem-2',
            user_id: 'user-1',
            procedure_id: 'proc-1',
            title: 'Revisar documentación',
            description: 'Llevar DNI y fotos',
            reminder_date: '2026-09-20T10:00:00',
            is_completed: false,
            created_at: '2026-01-01',
            updated_at: '2026-01-01'
        };

        (getSupabaseClient as any).mockReturnValue({
            ...mockAuthClient(mockUser),
            from: vi.fn().mockReturnThis(),
            insert: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: mockReminder, error: null })
        });

        const result = await reminderService.createReminder({
            procedure_id: 'proc-1',
            title: 'Revisar documentación',
            description: 'Llevar DNI y fotos',
            reminder_date: '2026-09-20T10:00:00'
        });

        expect(result).not.toBeNull();
        expect(result?.description).toBe('Llevar DNI y fotos');
    });
});

describe('Gestión de recordatorios', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('debe eliminar un recordatorio', async () => {
        const mockEq2 = vi.fn().mockResolvedValue({ error: null });
        const mockEq1 = vi.fn().mockReturnValue({ eq: mockEq2 });
        const mockDelete = vi.fn().mockReturnValue({ eq: mockEq1 });
        (getSupabaseClient as any).mockReturnValue({
            auth: {
                getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } })
            },
            from: vi.fn().mockReturnValue({ delete: mockDelete })
        });

        const result = await reminderService.deleteReminder('rem-1');

        expect(result.success).toBe(true);
    });

    it('debe marcar un recordatorio como completado', async () => {
        const mockEq2 = vi.fn().mockResolvedValue({ error: null });
        const mockEq1 = vi.fn().mockReturnValue({ eq: mockEq2 });
        const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq1 });
        (getSupabaseClient as any).mockReturnValue({
            auth: {
                getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } })
            },
            from: vi.fn().mockReturnValue({ update: mockUpdate })
        });

        const result = await reminderService.completeReminder('rem-1');

        expect(result.success).toBe(true);
    });

    it('debe manejar error al eliminar', async () => {
        const mockEq2 = vi.fn().mockResolvedValue({ error: { message: 'Error fatal' } });
        const mockEq1 = vi.fn().mockReturnValue({ eq: mockEq2 });
        const mockDelete = vi.fn().mockReturnValue({ eq: mockEq1 });
        (getSupabaseClient as any).mockReturnValue({
            auth: {
                getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } })
            },
            from: vi.fn().mockReturnValue({ delete: mockDelete })
        });

        const result = await reminderService.deleteReminder('rem-1');

        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
    });

    it('debe contar recordatorios pendientes', async () => {
        (getSupabaseClient as any).mockReturnValue({
            auth: {
                getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } })
            },
            from: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            count: 3
        });

        const count = await reminderService.countPendingReminders();

        expect(count).toBe(3);
    });
});