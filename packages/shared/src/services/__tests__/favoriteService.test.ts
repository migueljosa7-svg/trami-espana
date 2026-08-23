// ===========================================
// TRAMI ESPAÑA - Tests de Favoritos
// ===========================================
// Tests para creación y eliminación de favoritos

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { favoriteService } from '../favoriteService';
import { getSupabaseClient } from '../../supabase';

// Mock del cliente Supabase
vi.mock('../../supabase', () => ({
    getSupabaseClient: vi.fn()
}));

const mockUser = { id: 'user-1', email: 'user@test.com' };

describe('Creación de favorito', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Mock del usuario autenticado
        (getSupabaseClient as any).mockReturnValue({
            auth: {
                getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } })
            },
            from: vi.fn().mockReturnThis(),
            insert: vi.fn().mockResolvedValue({ error: null }),
            select: vi.fn().mockReturnThis(),
            delete: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            order: vi.fn().mockResolvedValue({ data: [], error: null })
        });
    });

    it('debe añadir un trámite a favoritos', async () => {
        const result = await favoriteService.addFavorite('proc-1');

        expect(result.success).toBe(true);
        expect(result.error).toBeUndefined();
    });

    it('debe manejar favorito duplicado (idempotente)', async () => {
        (getSupabaseClient as any).mockReturnValue({
            auth: {
                getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } })
            },
            from: vi.fn().mockReturnThis(),
            insert: vi.fn().mockResolvedValue({
                error: { code: '23505', message: 'duplicate key value violates unique constraint' }
            }),
            select: vi.fn().mockReturnThis()
        });

        const result = await favoriteService.addFavorite('proc-1');

        expect(result.success).toBe(true);
    });

    it('debe rechazar si no hay usuario autenticado', async () => {
        (getSupabaseClient as any).mockReturnValue({
            auth: {
                getUser: vi.fn().mockResolvedValue({ data: { user: null } })
            }
        });

        const result = await favoriteService.addFavorite('proc-1');

        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
    });
});

describe('Eliminación de favorito', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('debe eliminar un trámite de favoritos', async () => {
        const mockEq2 = vi.fn().mockResolvedValue({ error: null });
        const mockEq1 = vi.fn().mockReturnValue({ eq: mockEq2 });
        const mockDelete = vi.fn().mockReturnValue({ eq: mockEq1 });
        (getSupabaseClient as any).mockReturnValue({
            auth: {
                getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } })
            },
            from: vi.fn().mockReturnValue({ delete: mockDelete })
        });

        const result = await favoriteService.removeFavorite('proc-1');

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

        const result = await favoriteService.removeFavorite('proc-1');

        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
    });

    it('debe verificar si un trámite es favorito', async () => {
        (getSupabaseClient as any).mockReturnValue({
            auth: {
                getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } })
            },
            from: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
                data: { id: 'fav-1' },
                error: null
            })
        });

        const isFav = await favoriteService.isFavorite('proc-1');

        expect(isFav).toBe(true);
    });
});