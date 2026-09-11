import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Link, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import { procedureService, ProcedureWithDetails } from '@trami-espana/shared';
import { useTranslation } from 'react-i18next';
import { useBottomInset } from '../../src/hooks/useBottomInset';
import { cacheProcedures, readCachedProcedures } from '../../src/localCache';
import { useTheme, ThemeColors } from '../../constants/theme';
import { useSearchHistory } from '../../src/hooks/useSearchHistory';
import { SkeletonItem } from '../../components/SkeletonLoader';

const QUICK_CHIPS = [
    { label: 'DNI / Pasaporte', query: 'DNI' },
    { label: 'Cita SEPE', query: 'cita sepe' },
    { label: 'Vida Laboral', query: 'vida laboral' },
    { label: 'Certificado Digital', query: 'certificado digital' },
    { label: 'Ingreso Mínimo', query: 'ingreso mínimo vital' },
];

const FILTER_CHIPS = [
    { label: 'Todos', slug: '' },
    { label: '🪪 Identidad', slug: 'identidad' },
    { label: '💼 Empleo', slug: 'empleo' },
    { label: '🏛️ Impuestos', slug: 'impuestos' },
    { label: '🌍 Extranjería', slug: 'extranjeria' },
    { label: '🏠 Vivienda', slug: 'vivienda' },
    { label: '🚗 Transporte', slug: 'transporte' },
];

// ===========================================
// BUSCADOR AVANZADO: normalización y filtros
// ===========================================
/** Minúsculas sin acentos para matching tolerante (igual que el servicio). */
const normalizeText = (text: string): string =>
    text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');

/** Palabras clave por administración, buscadas en título/descripción/fuente. */
const ADMINISTRATION_KEYWORDS: Record<string, string[]> = {
    dgt: ['dgt', 'trafico', 'direccion general de trafico'],
    taxes: ['agencia tributaria', 'aeat', 'hacienda'],
    socialSecurity: ['seguridad social', 'sepe', 'inss', 'tgss'],
};

const matchesAdministration = (
    procedure: ProcedureWithDetails,
    adminKey: string
): boolean => {
    const keywords = ADMINISTRATION_KEYWORDS[adminKey];
    if (!keywords) return true;
    const haystack = normalizeText(
        `${procedure.title} ${procedure.short_description} ${procedure.source} ${procedure.scope}`
    );
    return keywords.some((keyword) => haystack.includes(keyword));
};

/** Un trámite es gratuito si su campo cost lo indica (gratuito/gratis/0 €). */
const isFreeProcedure = (procedure: ProcedureWithDetails): boolean => {
    const cost = normalizeText(procedure.cost ?? '');
    return (
        cost.includes('gratuit') ||
        cost.includes('gratis') ||
        cost.includes('sin coste') ||
        cost.includes('no tiene coste') ||
        cost === '0' ||
        cost === '0 €' ||
        cost === '0 eur'
    );
};

// ===========================================
// RESOLUCIÓN TOLERANTE DE CATEGORÍAS
// ===========================================
// El slug de la UI puede no coincidir EXACTAMENTE con el de la base de
// datos (p. ej. 'transporte' vs 'coches-y-transporte', 'empleo' vs
// 'trabajo'). Antes de filtrar, se resuelve contra el catálogo de
// categorías de Supabase usando slugs normalizados y sinónimos; así la
// categoría nunca llega cruda a `category_id` (que espera un UUID) y
// las respuestas vacías NO se tratan como error global.
const normalizeSlug = (text: string): string =>
    normalizeText(text)
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

/** Sinónimos/variantes conocidas de slugs de categoría en la base de datos. */
const CATEGORY_SYNONYMS: Record<string, string[]> = {
    transporte: ['transporte', 'coches-y-transporte', 'coches', 'vehiculos', 'movilidad', 'transporte-y-vehiculos'],
    empleo: ['empleo', 'trabajo', 'laboral', 'empleo-y-trabajo', 'desempleo'],
    identidad: ['identidad', 'documentacion-e-identidad', 'documentos', 'dni'],
    impuestos: ['impuestos', 'hacienda', 'taxes'],
    extranjeria: ['extranjeria', 'inmigracion', 'extranjeria-e-inmigracion'],
    vivienda: ['vivienda', 'vivienda-y-obras'],
};

/** Caché en memoria del catálogo de categorías (una petición por sesión). */
let categoriesCache: Array<{ id: string; name: string; slug: string }> | null = null;

async function loadCategories(): Promise<Array<{ id: string; name: string; slug: string }>> {
    if (categoriesCache) return categoriesCache;
    const categories = await procedureService.getCategories();
    categoriesCache = categories.map((c) => ({ id: c.id, name: c.name, slug: c.slug }));
    return categoriesCache;
}

/**
 * Resuelve un slug de categoría de la UI al UUID real de la base de datos.
 * Devuelve null si no se encuentra ninguna coincidencia tolerante.
 */
async function resolveCategoryUuid(slug: string): Promise<string | null> {
    const target = normalizeSlug(slug);
    const synonyms = CATEGORY_SYNONYMS[target] ?? [target];
    try {
        const categories = await loadCategories();
        // 1) Coincidencia directa por slug sinónimo.
        const bySlug = categories.find((c) => synonyms.includes(normalizeSlug(c.slug)));
        if (bySlug) return bySlug.id;
        // 2) Coincidencia por nombre normalizado ("Vehículos y transporte").
        const byName = categories.find((c) => {
            const name = normalizeSlug(c.name);
            return synonyms.some((syn) => name.includes(syn) || syn.includes(name));
        });
        if (byName) return byName.id;
        return null;
    } catch {
        return null;
    }
}

/**
 * Carga los trámites de una categoría con estrategia tolerante:
 *  1) intento directo con el slug tal cual (comportamiento previo);
 *  2) si falla o viene vacío, resuelve el UUID vía catálogo y reintenta.
 * Una lista VACÍA es un resultado válido, no un error.
 */
async function fetchProceduresByCategory(
    slug: string
): Promise<ProcedureWithDetails[]> {
    // 1) Intento directo (el servicio resuelve UUIDs exactos por sí solo).
    try {
        const response = await procedureService.getProcedures({ category_id: slug });
        if (response.data.length > 0) return response.data;
    } catch {
        // Slug no reconocido por el servicio: continuamos con la
        // resolución tolerante en lugar de propagar el error.
    }
    // 2) Resolución tolerante contra el catálogo de categorías.
    const uuid = await resolveCategoryUuid(slug);
    if (!uuid) return [];
    const response = await procedureService.getProcedures({ category_id: uuid });
    return response.data;
}

export default function SearchScreen() {
    const { t } = useTranslation();
    const { colors, isDark } = useTheme();
    const styles = getStyles(colors, isDark);
    useBottomInset(); /* eslint-disable-line @typescript-eslint/no-unused-vars */
    const params = useLocalSearchParams<{ categoria?: string }>();
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState(params.categoria || '');
    const [selectedAdmin, setSelectedAdmin] = useState('all');
    const [selectedCost, setSelectedCost] = useState<'all' | 'free' | 'paid'>('all');
    const [procedures, setProcedures] = useState<ProcedureWithDetails[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isFromCache, setIsFromCache] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isFocused, setIsFocused] = useState(false);
    const searchInputRef = useRef<TextInput>(null);

    // Historial de búsquedas
    const { history, addToHistory, removeFromHistory, clearHistory } = useSearchHistory();

    // Keep selectedCategory in sync if navigated from home category card
    useEffect(() => {
        if (params.categoria && params.categoria !== selectedCategory) {
            setSelectedCategory(params.categoria);
        }
    }, [params.categoria]);

    // Carga instantánea offline: si hay catálogo en caché se pinta al
    // instante mientras llega la respuesta de red.
    useEffect(() => {
        let mounted = true;
        void readCachedProcedures<ProcedureWithDetails[]>({ allowExpired: true }).then((cached) => {
            if (mounted && cached && cached.data.length > 0) {
                setProcedures((prev) => (prev.length > 0 ? prev : cached.data));
                setIsFromCache(true);
            }
        });
        return () => {
            mounted = false;
        };
    }, []);

    /** Aplica los filtros avanzados (administración + coste) en cliente. */
    const visibleProcedures = useMemo(() => {
        return procedures.filter((proc) => {
            if (selectedAdmin !== 'all' && !matchesAdministration(proc, selectedAdmin)) return false;
            if (selectedCost === 'free' && !isFreeProcedure(proc)) return false;
            if (selectedCost === 'paid' && isFreeProcedure(proc)) return false;
            return true;
        });
    }, [procedures, selectedAdmin, selectedCost]);

    const fetchProcedures = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            if (searchQuery.trim()) {
                const results = await procedureService.searchProcedures(searchQuery);
                setProcedures(results);
                setIsFromCache(false);
            } else if (selectedCategory) {
                // Resolución tolerante: prueba el slug directo y, si la base
                // de datos usa otro identificador ('coches-y-transporte',
                // 'trabajo'...), resuelve vía catálogo de categorías. Una
                // respuesta VACÍA es válida y muestra el estado vacío.
                const data = await fetchProceduresByCategory(selectedCategory);
                setProcedures(data);
                setIsFromCache(false);
            } else {
                // Vista inicial: catálogo completo (hasta 100 trámites) que se
                // cachea para carga instantánea y modo offline.
                const response = await procedureService.getProcedures({ limit: 100 });
                setProcedures(response.data);
                setIsFromCache(false);
                if (response.data.length > 0) {
                    void cacheProcedures(response.data);
                }
            }
        } catch {
            // Sin conexión: caemos a la caché del catálogo si existe.
            const cached = await readCachedProcedures<ProcedureWithDetails[]>({ allowExpired: true });
            if (cached && cached.data.length > 0) {
                setProcedures(cached.data);
                setIsFromCache(true);
                setError(null);
            } else {
                setError('No se pudieron cargar los trámites. Comprueba tu conexión e inténtalo de nuevo.');
            }
        } finally {
            setIsLoading(false);
        }
    }, [searchQuery, selectedCategory]);

    useEffect(() => {
        const timer = setTimeout(fetchProcedures, 350);
        return () => clearTimeout(timer);
    }, [fetchProcedures]);

    const handleChipPress = (slug: string) => {
        setSelectedCategory(slug);
        setSearchQuery('');
    };

    const handleQuickChipPress = (query: string) => {
        setSearchQuery(query);
        setSelectedCategory('');
        setIsFocused(false);
        void addToHistory(query);
    };

    const handleHistoryItemPress = (query: string) => {
        setSearchQuery(query);
        setIsFocused(false);
    };

    const handleSearchSubmit = () => {
        if (searchQuery.trim().length >= 2) {
            void addToHistory(searchQuery);
        }
        setIsFocused(false);
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Buscador de Trámites</Text>

                {/* Search bar with icon */}
                <View style={styles.searchRow}>
                    <Ionicons name="search" size={20} color={colors.textSecondary} style={styles.searchIcon} />
                    <TextInput
                        ref={searchInputRef}
                        style={styles.searchInput}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        placeholder="Ej. Renovar DNI, Empadronamiento..."
                        placeholderTextColor={colors.textMuted}
                        returnKeyType="search"
                        clearButtonMode="while-editing"
                        onFocus={() => setIsFocused(true)}
                        onBlur={() => setTimeout(() => setIsFocused(false), 200)}
                        onSubmitEditing={handleSearchSubmit}
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
                            <Ionicons name="close-circle" size={20} color={colors.textMuted} />
                        </TouchableOpacity>
                    )}
                </View>

                {/* Quick chips */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.chipsContainer}
                >
                    {QUICK_CHIPS.map((chip) => (
                        <TouchableOpacity
                            key={chip.label}
                            style={[styles.quickChip, { backgroundColor: colors.chip, borderColor: colors.border }]}
                            onPress={() => handleQuickChipPress(chip.query)}
                            activeOpacity={0.75}
                        >
                            <Text style={[styles.quickChipText, { color: colors.textSecondary }]}>{chip.label}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                {/* Search history dropdown */}
                {isFocused && history.length > 0 && searchQuery.length === 0 && (
                    <View style={[styles.historyDropdown, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <View style={styles.historyHeader}>
                            <Text style={[styles.historyTitle, { color: colors.textSecondary }]}>Búsquedas recientes</Text>
                            <TouchableOpacity onPress={clearHistory}>
                                <Text style={[styles.historyClear, { color: colors.primary }]}>Borrar todo</Text>
                            </TouchableOpacity>
                        </View>
                        {history.map((item) => (
                            <TouchableOpacity
                                key={item}
                                style={styles.historyItem}
                                onPress={() => handleHistoryItemPress(item)}
                            >
                                <Ionicons name="time-outline" size={16} color={colors.textMuted} />
                                <Text style={[styles.historyItemText, { color: colors.text }]} numberOfLines={1}>{item}</Text>
                                <TouchableOpacity onPress={() => removeFromHistory(item)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                                    <Ionicons name="close" size={14} color={colors.textMuted} />
                                </TouchableOpacity>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}

                {/* Filter chips */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.chipsContainer}
                >
                    {FILTER_CHIPS.map((chip) => (
                        <TouchableOpacity
                            key={chip.slug}
                            style={[
                                styles.chip,
                                selectedCategory === chip.slug && styles.chipActive,
                            ]}
                            onPress={() => handleChipPress(chip.slug)}
                            activeOpacity={0.75}
                        >
                            <Text
                                style={[
                                    styles.chipText,
                                    selectedCategory === chip.slug && styles.chipTextActive,
                                ]}
                            >
                                {chip.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                {/* Filtro por Administración (buscador avanzado) */}
                <Text style={styles.filterLabel}>{t('search.filters.administration')}</Text>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.chipsContainer}
                >
                    {[
                        { key: 'all', label: t('search.allAdministrations') },
                        { key: 'dgt', label: t('search.adminDgt') },
                        { key: 'taxes', label: t('search.adminTaxes') },
                        { key: 'socialSecurity', label: t('search.adminSocialSecurity') },
                    ].map((chip) => (
                        <TouchableOpacity
                            key={chip.key}
                            style={[styles.chip, selectedAdmin === chip.key && styles.chipActive]}
                            onPress={() => setSelectedAdmin(chip.key)}
                            activeOpacity={0.75}
                        >
                            <Text style={[styles.chipText, selectedAdmin === chip.key && styles.chipTextActive]}>
                                {chip.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                {/* Filtro por Coste (Gratis / De pago) */}
                <Text style={styles.filterLabel}>{t('search.filters.cost')}</Text>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.chipsContainer}
                >
                    {[
                        { key: 'all' as const, label: t('search.costAll') },
                        { key: 'free' as const, label: t('search.costFree') },
                        { key: 'paid' as const, label: t('search.costPaid') },
                    ].map((chip) => (
                        <TouchableOpacity
                            key={chip.key}
                            style={[styles.chip, selectedCost === chip.key && styles.chipActive]}
                            onPress={() => setSelectedCost(chip.key)}
                            activeOpacity={0.75}
                        >
                            <Text style={[styles.chipText, selectedCost === chip.key && styles.chipTextActive]}>
                                {chip.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {isLoading ? (
                <View style={styles.center}>
                    <View style={{ width: '100%', padding: 16 }}>
                        <SkeletonItem width="60%" height={18} borderRadius={6} style={{ marginBottom: 10 }} />
                        <SkeletonItem width="90%" height={14} borderRadius={6} style={{ marginBottom: 6 }} />
                        <SkeletonItem width="75%" height={14} borderRadius={6} style={{ marginBottom: 16 }} />
                        <SkeletonItem width="100%" height={80} borderRadius={12} style={{ marginBottom: 12 }} />
                        <SkeletonItem width="100%" height={80} borderRadius={12} style={{ marginBottom: 12 }} />
                        <SkeletonItem width="100%" height={80} borderRadius={12} />
                    </View>
                </View>
            ) : error ? (
                <View style={styles.errorBox}>
                    <Text style={styles.errorText}>{error}</Text>
                    <TouchableOpacity style={styles.retryBtn} onPress={fetchProcedures}>
                        <Text style={styles.retryBtnText}>Reintentar</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <FlashList
                    data={visibleProcedures}
                    renderItem={({ item: proc }) => (
                        <Link href={`/procedure/${proc.slug}`} asChild>
                            <TouchableOpacity style={styles.card} activeOpacity={0.8}>
                                <View style={styles.cardHeader}>
                                    <Text style={styles.cardScope}>{proc.scope.toUpperCase()}</Text>
                                    {proc.cost && (
                                        <View style={[styles.costTag, proc.cost.toLowerCase().includes('gratuit') && styles.costTagFree]}>
                                            <Text style={[styles.cardCost, proc.cost.toLowerCase().includes('gratuit') && styles.cardCostFree]}>
                                                {proc.cost.length > 18 ? proc.cost.slice(0, 18) + '…' : proc.cost}
                                            </Text>
                                        </View>
                                    )}
                                </View>
                                <Text style={styles.cardTitle}>{proc.title}</Text>
                                <Text style={styles.cardDesc} numberOfLines={2}>{proc.short_description}</Text>
                                <Text style={styles.cardArrow}>Ver detalles →</Text>
                            </TouchableOpacity>
                        </Link>
                    )}
                    keyExtractor={(item) => item.id}
                    estimatedItemSize={120}
                    contentContainerStyle={styles.resultsContent}
                    ListHeaderComponent={
                        <>
                            {isFromCache && (
                                <View style={styles.offlineBanner}>
                                    <Ionicons name="cloud-offline-outline" size={14} color={colors.warningText} />
                                    <Text style={styles.offlineBannerText}>{t('search.offlineBanner')}</Text>
                                </View>
                            )}
                            <Text style={styles.resultsCount}>
                                {visibleProcedures.length} trámite{visibleProcedures.length !== 1 ? 's' : ''} encontrado{visibleProcedures.length !== 1 ? 's' : ''}
                            </Text>
                        </>
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyIcon}>🔍</Text>
                            <Text style={styles.emptyTitle}>{t('search.noResults')}</Text>
                            <Text style={styles.emptySubtitle}>{t('search.noResultsMsg')}</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
}

const getStyles = (colors: ThemeColors, _isDark: boolean) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        paddingTop: 48,
        paddingHorizontal: 16,
        paddingBottom: 8,
        backgroundColor: colors.card,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 12,
        color: colors.text,
    },
    searchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
        marginBottom: 12,
        borderWidth: 1,
        backgroundColor: colors.card,
        borderColor: colors.border,
    },
    searchIcon: {
        marginRight: 10,
        color: colors.textSecondary,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        padding: 0,
        color: colors.text,
    },
    clearButton: {
        padding: 4,
        marginLeft: 8,
    },
    chipsContainer: {
        paddingBottom: 12,
        gap: 8,
    },
    filterLabel: {
        fontSize: 11,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        marginTop: 6,
        marginBottom: 2,
        color: colors.textSecondary,
    },
    offlineBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        borderWidth: 1,
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 8,
        marginBottom: 12,
        backgroundColor: colors.warningBackground,
        borderColor: colors.warningBorder,
    },
    offlineBannerText: {
        fontSize: 12,
        fontWeight: '600',
        flex: 1,
        color: colors.warningText,
    },
    quickChip: {
        borderRadius: 20,
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderWidth: 1,
        marginRight: 8,
    },
    quickChipText: {
        fontSize: 13,
        fontWeight: '500',
    },
    historyDropdown: {
        borderRadius: 12,
        borderWidth: 1,
        paddingVertical: 8,
        marginBottom: 12,
        maxHeight: 220,
    },
    historyHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
    },
    historyTitle: {
        fontSize: 12,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    historyClear: {
        fontSize: 12,
        fontWeight: '600',
    },
    historyItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    historyItemText: {
        flex: 1,
        fontSize: 14,
    },
    chip: {
        borderRadius: 20,
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.card,
        marginRight: 8,
    },
    chipText: {
        fontSize: 13,
        fontWeight: '500',
        color: colors.textSecondary,
    },
    chipActive: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    chipTextActive: {
        color: '#ffffff',
        fontWeight: '600',
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center'
    },
    loadingText: {
        marginTop: 8,
        fontSize: 14,
        color: colors.textSecondary,
    },
    resultsList: {
        flex: 1
    },
    resultsContent: {
        padding: 16,
        paddingBottom: 32,
    },
    resultsCount: {
        fontSize: 12,
        fontWeight: '600',
        marginBottom: 12,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        color: colors.textMuted,
    },
    card: {
        borderRadius: 14,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 3,
        elevation: 1,
        backgroundColor: colors.card,
        borderColor: colors.border,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 6,
        marginBottom: 8
    },
    cardScope: {
        fontSize: 11,
        fontWeight: '700',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        flexShrink: 1,
        backgroundColor: colors.chip,
        color: colors.textSecondary,
    },
    costTag: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        maxWidth: '55%',
        flexShrink: 1,
        backgroundColor: colors.chip,
    },
    costTagFree: {
        backgroundColor: colors.successBackground,
    },
    cardCost: {
        fontSize: 11,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    cardCostFree: {
        color: colors.successText,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 6,
        lineHeight: 22,
        color: colors.text,
    },
    cardDesc: {
        fontSize: 13,
        lineHeight: 19,
        marginBottom: 8,
        color: colors.textSecondary,
    },
    cardArrow: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.primary,
    },
    errorBox: {
        margin: 16,
        padding: 16,
        borderWidth: 1,
        borderRadius: 12,
        alignItems: 'center',
        backgroundColor: colors.errorBackground,
        borderColor: colors.errorBorder,
    },
    errorText: {
        fontSize: 14,
        lineHeight: 20,
        textAlign: 'center',
        marginBottom: 12,
        color: colors.errorText,
    },
    retryBtn: {
        backgroundColor: colors.danger,
        paddingHorizontal: 20,
        paddingVertical: 8,
        borderRadius: 8,
    },
    retryBtnText: {
        color: '#ffffff',
        fontWeight: '600',
        fontSize: 13,
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 40,
    },
    emptyIcon: {
        fontSize: 40,
        marginBottom: 12,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 6,
        color: colors.text,
    },
    emptySubtitle: {
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
        color: colors.textSecondary,
    },
});
