// ===========================================
// TRAMI ESPAÑA - Tests de Publicación Segura de Trámites
// ===========================================
// Verifica que la regla de publicación segura se aplica:
// Un trámite público solo se devuelve cuando:
//   is_published = true
//   AND
//   verification_status = 'verified'
//
// - draft + is_published=true NO debe devolverse.
// - verified + is_published=true SÍ debe devolverse.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { procedureService } from '../procedureService';
import { getSupabaseClient } from '../../supabase';

// Mock del cliente Supabase
vi.mock('../../supabase', () => ({
    getSupabaseClient: vi.fn()
}));

const makeProcedure = (overrides: Partial<Record<string, unknown>> = {}) => ({
    id: 'proc-1',
    title: 'Trámite de prueba',
    slug: 'tramite-prueba',
    short_description: 'Descripción corta',
    description: 'Descripción completa',
    category_id: 'cat-1',
    scope: 'estatal' as const,
    autonomous_community: null,
    province: null,
    municipality: null,
    is_published: true,
    verification_status: 'verified' as const,
    last_verified_at: null,
    verified_by: null,
    source: 'Fuente oficial',
    source_url: 'https://sede.gob.es',
    cost: null,
    estimated_duration: null,
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
    ...overrides
});

/**
 * Construye un mock del cliente Supabase que registra los filtros `.eq()` aplicados
 * y devuelve los datos indicados.
 */
const buildClientMock = (dataToReturn: unknown[], countValue?: number) => {
    const eqCalls: Array<{ column: string; value: unknown }> = [];
    const order = vi.fn().mockReturnThis();
    const range = vi.fn().mockReturnThis();
    const limit = vi.fn().mockReturnThis();
    const single = vi.fn().mockResolvedValue(
        dataToReturn.length > 0
            ? { data: dataToReturn[0], error: null }
            : { data: null, error: { code: 'PGRST116', message: 'not found' } }
    );
    const or = vi.fn().mockReturnThis();
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });

    const eq = vi.fn().mockImplementation((column: string, value: unknown) => {
        eqCalls.push({ column, value });
        return client;
    });

    const select = vi.fn().mockReturnThis();
    const from = vi.fn().mockReturnValue({ select });

    const finalResolve = vi.fn().mockResolvedValue({
        data: dataToReturn,
        count: countValue ?? dataToReturn.length,
        error: null
    });

    const client = {
        from,
        select,
        eq,
        or,
        order,
        range,
        limit,
        single,
        maybeSingle
    };

    // Encadenar: select -> eq -> eq -> ... -> order/limit/range -> resolve
    select.mockReturnValue(client);

    return { client, eqCalls, finalResolve: finalResolve as unknown as () => Promise<unknown> };
};

describe('procedureService — Publicación segura (is_published + verified)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('getProcedures: filtra por is_published=true Y verification_status=verified', async () => {
        const { client, eqCalls } = buildClientMock([makeProcedure()]);
        (getSupabaseClient as any).mockReturnValue(client);

        await procedureService.getProcedures({ limit: 12 });

        const publishedCall = eqCalls.find((c) => c.column === 'is_published');
        const verifiedCall = eqCalls.find((c) => c.column === 'verification_status');

        expect(publishedCall).toBeDefined();
        expect(publishedCall?.value).toBe(true);
        expect(verifiedCall).toBeDefined();
        expect(verifiedCall?.value).toBe('verified');
    });

    it('getProcedures: un trámite draft+published NO se devuelve al usuario', async () => {
        // Simula que la BD devuelve solo trámites que superan el filtro (verified).
        // Si el filtro no se aplicara, el draft aparecería; aquí demostramos que
        // el cliente envía el filtro verification_status=verified.
        const { client, eqCalls } = buildClientMock([]);
        (getSupabaseClient as any).mockReturnValue(client);

        const result = await procedureService.getProcedures({ limit: 12 });

        const verifiedCall = eqCalls.find((c) => c.column === 'verification_status');
        expect(verifiedCall?.value).toBe('verified');
        // Como no hay trámites verificados, la lista pública está vacía (estado vacío correcto).
        expect(result.data).toEqual([]);
        expect(result.total).toBe(0);
    });

    it('getProcedureBySlug: aplica verification_status=verified (draft no accesible)', async () => {
        const { client, eqCalls } = buildClientMock([]);
        (getSupabaseClient as any).mockReturnValue(client);

        const result = await procedureService.getProcedureBySlug('renovacion-dni');

        const verifiedCall = eqCalls.find((c) => c.column === 'verification_status');
        expect(verifiedCall?.value).toBe('verified');
        // Un slug de un trámite draft/no verificado se comporta como no encontrado.
        expect(result).toBeNull();
    });

    it('getProcedureBySlug: devuelve trámite verified+published', async () => {
        const verifiedProc = makeProcedure({ slug: 'renovacion-dni', verification_status: 'verified' });
        const { client } = buildClientMock([verifiedProc]);
        (getSupabaseClient as any).mockReturnValue(client);

        const result = await procedureService.getProcedureBySlug('renovacion-dni');

        expect(result).not.toBeNull();
        expect(result?.verification_status).toBe('verified');
        expect(result?.is_published).toBe(true);
    });

    it('getRecentProcedures: filtra por verification_status=verified', async () => {
        const { client, eqCalls } = buildClientMock([makeProcedure()]);
        (getSupabaseClient as any).mockReturnValue(client);

        await procedureService.getRecentProcedures(6);

        const verifiedCall = eqCalls.find((c) => c.column === 'verification_status');
        expect(verifiedCall).toBeDefined();
        expect(verifiedCall?.value).toBe('verified');
    });

    it('searchProcedures: usa getSearchCandidates/searchByKeywords que filtrar por verified', async () => {
        // searchProcedures delega en getSearchCandidates (1ª pasada). Verificamos
        // que esa consulta aplica verification_status=verified.
        const { client, eqCalls } = buildClientMock([makeProcedure()]);
        (getSupabaseClient as any).mockReturnValue(client);

        const results = await procedureService.searchProcedures('renovar dni');

        const verifiedCalls = eqCalls.filter((c) => c.column === 'verification_status');
        // Al menos una de las pasadas de búsqueda debe filtar por verified.
        expect(verifiedCalls.length).toBeGreaterThanOrEqual(1);
        expect(verifiedCalls.every((c) => c.value === 'verified')).toBe(true);
        // Si el trámite devuelto es verified, aparece en resultados.
        expect(results.every((p) => p.verification_status === 'verified')).toBe(true);
    });

    it('searchByKeywords: descarta internamente resultados no verificados', async () => {
        // Incluso si el mock "devuelve" un draft, la búsqueda solo debe incluir verified.
        const draftProc = makeProcedure({ verification_status: 'draft' });
        const { client, eqCalls } = buildClientMock([draftProc]);
        (getSupabaseClient as any).mockReturnValue(client);

        const results = await procedureService.searchByKeywords(['dni']);

        const verifiedCall = eqCalls.find((c) => c.column === 'verification_status');
        expect(verifiedCall?.value).toBe('verified');
        // El gateway consulta solo verified; no debería traer drafts.
        expect(results.every((p) => p.verification_status === 'verified')).toBe(true);
    });

    it('searchProcedures: normaliza signos de puntuación (¿?) antes de generar keywords', async () => {
        // Regresión Fase 11: una consulta como "¿Cómo renuevo el DNI?" nunca debe
        // generar el token "¿como"; la puntuación debe separarse del texto.
        const { client } = buildClientMock([]);
        (getSupabaseClient as any).mockReturnValue(client);

        const spy = vi
            .spyOn(procedureService, 'searchByKeywords')
            .mockResolvedValue([makeProcedure()]);

        await procedureService.searchProcedures('¿Cómo renuevo el DNI?');

        expect(spy).toHaveBeenCalled();
        const tokensArg = spy.mock.calls[0][0];
        expect(tokensArg).toContain('dni');
        expect(tokensArg).not.toContain('¿como');
        expect(tokensArg).not.toContain('como?');
        expect(tokensArg.every((t) => /^[a-z0-9]+$/.test(t))).toBe(true);
        spy.mockRestore();
    });
});
