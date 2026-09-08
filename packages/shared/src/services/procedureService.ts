// ===========================================
// TRAMI ESPAÑA - Servicio de Trámites
// ===========================================
// Servicio para consultar trámites desde Supabase

import { getSupabaseClient } from '../supabase';
import { MIN_SEARCH_LENGTH } from '../constants';
import type {
    ProcedureWithDetails,
    ProceduresListResponse,
    SearchFilters,
    ProcedureCategory
} from '../types';

// ===========================================
// TIPOS PARA RESPUESTAS
// ===========================================
// Nota: Estos tipos están definidos en types.ts y se importan desde allí

// ===========================================
// ERRORES PERSONALIZADOS
// ===========================================

export class ProcedureServiceError extends Error {
    constructor(
        message: string,
        public code?: string,
        public details?: Record<string, unknown>
    ) {
        super(message);
        this.name = 'ProcedureServiceError';
    }
}

// ===========================================
// FUNCIONES AUXILIARES
// ===========================================

const DEFAULT_LIMIT = 12;
const DEFAULT_PAGE = 1;

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Normaliza texto a minúsculas y SIN acentos para búsquedas tolerantes.
 * "Renovación" y "renovacion" se comparan igual.
 */
const normalizeEs = (text: string): string =>
    text
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9\s]/g, " ");

/**
 * Sinónimos de categorías para las consultas más frecuentes.
 * "empleo/trabajo/paro" → categoría laboral.
 * "coche/carros/vehículo/automóvil" → categoría vehículos.
 * Corrige fallos de parsing devolviendo resultados limpios sin excepciones.
 */
const SEARCH_SYNONYMS: Record<string, string[]> = {
    empleo: ["trabajo", "desempleo", "paro", "laboral", "contratacion", "contratado"],
    trabajo: ["empleo", "laboral", "desempleo", "paro", "contratacion", "contratado"],
    desempleo: ["paro", "empleo", "prestacion", "subsidio"],
    paro: ["desempleo", "empleo", "prestacion", "subsidio"],
    coche: ["coches", "vehiculo", "vehiculos", "carro", "carros", "automovil"],
    coches: ["coche", "vehiculo", "vehiculos", "carro", "carros", "automovil"],
    carro: ["coche", "coches", "vehiculo", "vehiculos", "carros", "automovil"],
    carros: ["coche", "coches", "vehiculo", "vehiculos", "carro", "automovil"],
    vehiculo: ["vehiculos", "coche", "coches", "carro", "carros", "automovil"],
    vehiculos: ["vehiculo", "coche", "coches", "carro", "carros", "automovil"],
};

/**
 * Expande los tokens de la consulta con sinónimos normalizados (sin acentos)
 * para que "coches" encuentre resultados de la categoría "Vehículos" y
 * "empleo/trabajo/paro" encuentre la categoría "Laboral".
 */
const expandTokens = (tokens: string[]): string[] => {
    const expanded = new Set<string>();
    for (const token of tokens) {
        expanded.add(token);
        const synonyms = SEARCH_SYNONYMS[token];
        if (synonyms) {
            for (const synonym of synonyms) {
                expanded.add(synonym);
            }
        }
    }
    return Array.from(expanded);
};

/**
 * Resuelve un identificador de categoría (UUID o slug) a su UUID.
 * La UI usa slugs (ej. 'identidad'), pero la columna category_id es UUID.
 * Si ya es un UUID, lo devuelve tal cual.
 */
const resolveCategoryId = async (category: string): Promise<string> => {
    if (UUID_REGEX.test(category)) {
        return category;
    }

    const { data, error } = await getSupabaseClient()
        .from('procedure_categories')
        .select('id')
        .eq('slug', category)
        .maybeSingle();

    if (error || !data) {
        return category;
    }

    return data.id;
};

// ===========================================
// SERVICIO DE TRÁMITES
// ===========================================

export const procedureService = {
    /**
     * Obtener lista de trámites con paginación y filtros
     */
    async getProcedures(filters: SearchFilters = {}): Promise<ProceduresListResponse> {
        try {
            const page = filters.page || DEFAULT_PAGE;
            const limit = filters.limit || DEFAULT_LIMIT;
            const from = (page - 1) * limit;
            const to = from + limit - 1;

            // Resolver el slug de categoría (si la UI lo envía) a su UUID
            let resolvedCategoryId: string | undefined;
            if (filters.category_id) {
                resolvedCategoryId = await resolveCategoryId(filters.category_id);
            }

            // Una única consulta con count: 'exact' y range aplicados juntos
            let query = getSupabaseClient()
                .from('procedures')
                .select(`
                    *,
                    category:procedure_categories(*),
                    requirements:procedure_requirements(*),
                    documents:procedure_documents(*),
                    steps:procedure_steps(*),
                    links:procedure_links(*)
`, { count: 'exact' })
                .eq('is_published', true)
                .eq('verification_status', 'verified')
                .order('created_at', { ascending: false });

            if (resolvedCategoryId) {
                query = query.eq('category_id', resolvedCategoryId);
            }
            if (filters.scope) {
                query = query.eq('scope', filters.scope);
            }
            if (filters.autonomous_community) {
                query = query.eq('autonomous_community', filters.autonomous_community);
            }

            const { data, count, error } = await query
                .range(from, to);

            if (error) {
                throw new ProcedureServiceError(
                    'Error al obtener trámites',
                    'FETCH_ERROR',
                    { message: error.message, details: error.details, hint: error.hint }
                );
            }

            const total = count || 0;
            const total_pages = Math.ceil(total / limit);

            return {
                data: data || [],
                total,
                page,
                limit,
                total_pages
            };
        } catch (error) {
            if (error instanceof ProcedureServiceError) {
                throw error;
            }
            throw new ProcedureServiceError(
                'Error inesperado al obtener trámites',
                'UNKNOWN_ERROR',
                { originalError: error }
            );
        }
    },

    /**
     * Obtener un trámite por su slug
     */
    async getProcedureBySlug(slug: string): Promise<ProcedureWithDetails | null> {
        try {
            const { data, error } = await getSupabaseClient()
                .from('procedures')
                .select(`
                    *,
                    category:procedure_categories(*),
                    requirements:procedure_requirements(*),
                    documents:procedure_documents(*),
                    steps:procedure_steps(*),
                    links:procedure_links(*)
`)
                .eq('slug', slug)
                .eq('is_published', true)
                .eq('verification_status', 'verified')
                .single();

            if (error) {
                if (error.code === 'PGRST116') {
                    return null; // No encontrado
                }
                throw new ProcedureServiceError(
                    'Error al obtener el trámite',
                    'FETCH_ERROR',
                    { message: error.message, details: error.details, hint: error.hint }
                );
            }

            return data as ProcedureWithDetails;
        } catch (error) {
            if (error instanceof ProcedureServiceError) {
                throw error;
            }
            throw new ProcedureServiceError(
                'Error inesperado al obtener el trámite',
                'UNKNOWN_ERROR',
                { originalError: error }
            );
        }
    },

/**
     * Buscar trámites con debounce
     * Acepta filtros opcionales para refinar la búsqueda
     */
async searchProcedures(
        query: string,
        filters: {
            category?: string;
            scope?: string;
            autonomous_community?: string;
        } = {}
    ): Promise<ProcedureWithDetails[]> {
        try {
            if (!query || query.length < MIN_SEARCH_LENGTH) {
                return [];
            }

            // Búsqueda tolerante: sin acentos y por palabras clave.
            // "renovacion dni" y "Renovación DNI" deben encontrar "renovacion-dni".
            const normalizedQuery = normalizeEs(query);
            const tokens = normalizedQuery
                .split(/\s+/)
                .filter((t) => t.length > 2);

            // Expansión de sinónimos: "coches"→vehículos, "paro"→desempleo, etc.
            const expandedTokens = expandTokens(tokens);

            // 1ª pasada: coincidencia literal normalizada (sin acentos) del texto completo.
            const candidates = await this.getSearchCandidates(normalizedQuery, filters);

            // 2ª pasada: si no hay coincidencia literal, buscar por cualquier palabra clave (OR)
            // usando los tokens expandidos con sinónimos.
            let results = candidates;
            if (results.length === 0 && expandedTokens.length > 0) {
                results = await this.searchByKeywords(expandedTokens, filters);

                // 3ª pasada (solo si sigue vacío): buscar con los tokens originales,
                // para no ensuciar resultados con sinónimos demasiado genéricos.
                if (results.length === 0 && tokens.length > 0) {
                    results = await this.searchByKeywords(tokens, filters);
                }
            }

            return results;
        } catch (error) {
            if (error instanceof ProcedureServiceError) {
                throw error;
            }
            throw new ProcedureServiceError(
                'Error inesperado en la búsqueda',
                'UNKNOWN_ERROR',
                { originalError: error }
            );
        }
    },

    /**
     * Recupera todos los trámites publicados y filtra en memoria por tokens normalizados.
     * Devuelve los que contienen TODOS los tokens (AND) en título/descripción corta,
     * y si no hay resultados, los que contienen ALGUNO (OR).
     */
    async searchByKeywords(
        tokens: string[],
        filters: {
            category?: string;
            scope?: string;
            autonomous_community?: string;
        } = {}
    ): Promise<ProcedureWithDetails[]> {
        const scope = filters.scope;
        const autonomousCommunity = filters.autonomous_community;
        const categorySlug = filters.category;

        let supabaseQuery = getSupabaseClient()
            .from('procedures')
            .select(`
                *,
                category:procedure_categories(*),
                requirements:procedure_requirements(*),
                documents:procedure_documents(*),
                steps:procedure_steps(*),
                links:procedure_links(*)
`)
            .eq('is_published', true)
            .eq('verification_status', 'verified')
            .order('created_at', { ascending: false })
            .limit(100);

        if (scope) {
            supabaseQuery = supabaseQuery.eq('scope', scope);
        }
        if (autonomousCommunity) {
            supabaseQuery = supabaseQuery.eq('autonomous_community', autonomousCommunity);
        }
        if (categorySlug) {
            const categoryId = await resolveCategoryId(categorySlug);
            supabaseQuery = supabaseQuery.eq('category_id', categoryId);
        }

        const { data, error } = await supabaseQuery;

        if (error) {
            throw new ProcedureServiceError(
                'Error al buscar trámites',
                'SEARCH_ERROR',
                { message: error.message, details: error.details, hint: error.hint }
            );
        }

        const procedures = (data || []) as ProcedureWithDetails[];

        // Filtro en memoria tolerante a acentos y por tokens.
        const scored = procedures
            .map((proc) => {
                const haystack = normalizeEs(
                    `${proc.title} ${proc.short_description || ""} ${proc.description || ""}`
                );
                const matchedTokens = tokens.filter((t) => haystack.includes(t));
                return { proc, matchedTokens };
            })
            .filter((item) => item.matchedTokens.length > 0)
            .sort((a, b) => b.matchedTokens.length - a.matchedTokens.length);

        return scored.map((item) => item.proc).slice(0, 20);
    },

    /**
     * Busca coincidencia literal normalizada en la BD (1ª pasada).
     */
    async getSearchCandidates(
        normalizedQuery: string,
        filters: {
            category?: string;
            scope?: string;
            autonomous_community?: string;
        } = {}
    ): Promise<ProcedureWithDetails[]> {
        const scope = filters.scope;
        const autonomousCommunity = filters.autonomous_community;
        const categorySlug = filters.category;

        let supabaseQuery = getSupabaseClient()
            .from('procedures')
            .select(`
                *,
                category:procedure_categories(*),
                requirements:procedure_requirements(*),
                documents:procedure_documents(*),
                steps:procedure_steps(*),
                links:procedure_links(*)
`)
            .eq('is_published', true)
            .eq('verification_status', 'verified')
            .or(
                `title.ilike.%${normalizedQuery}%,short_description.ilike.%${normalizedQuery}%,description.ilike.%${normalizedQuery}%`
            )
            .order('created_at', { ascending: false })
            .limit(20);

        if (scope) {
            supabaseQuery = supabaseQuery.eq('scope', scope);
        }
        if (autonomousCommunity) {
            supabaseQuery = supabaseQuery.eq('autonomous_community', autonomousCommunity);
        }
        if (categorySlug) {
            const categoryId = await resolveCategoryId(categorySlug);
            supabaseQuery = supabaseQuery.eq('category_id', categoryId);
        }

        const { data, error } = await supabaseQuery;

        if (error) {
            throw new ProcedureServiceError(
                'Error al buscar trámites',
                'SEARCH_ERROR',
                { message: error.message, details: error.details, hint: error.hint }
            );
        }

        return (data || []) as ProcedureWithDetails[];
    },

    /**
     * Obtener todas las categorías
     */
    async getCategories(): Promise<ProcedureCategory[]> {
        try {
            const { data, error } = await getSupabaseClient()
                .from('procedure_categories')
                .select('*')
                .order('order', { ascending: true });

            if (error) {
                throw new ProcedureServiceError(
                    'Error al obtener categorías',
                    'FETCH_ERROR',
                    { message: error.message, details: error.details, hint: error.hint }
                );
            }

            return data || [];
        } catch (error) {
            if (error instanceof ProcedureServiceError) {
                throw error;
            }
            throw new ProcedureServiceError(
                'Error inesperado al obtener categorías',
                'UNKNOWN_ERROR',
                { originalError: error }
            );
        }
    },

    /**
     * Obtener trámites por categoría
     */
    async getProceduresByCategory(categoryId: string, filters: Omit<SearchFilters, 'category_id'> = {}): Promise<ProceduresListResponse> {
        return this.getProcedures({
            ...filters,
            category_id: categoryId
        });
    },

    /**
     * Obtener trámites por ámbito
     */
    async getProceduresByScope(scope: string, filters: Omit<SearchFilters, 'scope'> = {}): Promise<ProceduresListResponse> {
        return this.getProcedures({
            ...filters,
            scope
        });
    },

    /**
     * Obtener trámites por comunidad autónoma
     */
    async getProceduresByAutonomousCommunity(community: string, filters: Omit<SearchFilters, 'autonomous_community'> = {}): Promise<ProceduresListResponse> {
        return this.getProcedures({
            ...filters,
            autonomous_community: community
        });
    },

    /**
     * Obtener trámites destacados o recientes
     */
    async getRecentProcedures(limit: number = 6): Promise<ProcedureWithDetails[]> {
        try {
            const { data, error } = await getSupabaseClient()
                .from('procedures')
                .select(`
                    *,
                    category:procedure_categories(*),
                    requirements:procedure_requirements(*),
                    documents:procedure_documents(*),
                    steps:procedure_steps(*),
                    links:procedure_links(*)
`)
            .eq('is_published', true)
            .eq('verification_status', 'verified')
            .order('created_at', { ascending: false })
            .limit(limit);

            if (error) {
                throw new ProcedureServiceError(
                    'Error al obtener trámites recientes',
                    'FETCH_ERROR',
                    { message: error.message, details: error.details, hint: error.hint }
                );
            }

            return (data || []) as ProcedureWithDetails[];
        } catch (error) {
            if (error instanceof ProcedureServiceError) {
                throw error;
            }
            throw new ProcedureServiceError(
                'Error inesperado al obtener trámites recientes',
                'UNKNOWN_ERROR',
                { originalError: error }
            );
        }
    }
};