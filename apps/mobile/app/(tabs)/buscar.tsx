import { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Link, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { procedureService, ProcedureWithDetails } from '@trami-espana/shared';

const FILTER_CHIPS = [
    { label: 'Todos', slug: '' },
    { label: '🪪 Identidad', slug: 'identidad' },
    { label: '💼 Empleo', slug: 'empleo' },
    { label: '🏛️ Impuestos', slug: 'impuestos' },
    { label: '🌍 Extranjería', slug: 'extranjeria' },
    { label: '🏠 Vivienda', slug: 'vivienda' },
    { label: '🚗 Transporte', slug: 'transporte' },
];

export default function SearchScreen() {
    const params = useLocalSearchParams<{ categoria?: string }>();
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState(params.categoria || '');
    const [procedures, setProcedures] = useState<ProcedureWithDetails[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Keep selectedCategory in sync if navigated from home category card
    useEffect(() => {
        if (params.categoria && params.categoria !== selectedCategory) {
            setSelectedCategory(params.categoria);
        }
    }, [params.categoria]);

    const fetchProcedures = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            if (searchQuery.trim()) {
                const results = await procedureService.searchProcedures(searchQuery);
                setProcedures(results);
            } else if (selectedCategory) {
                const response = await procedureService.getProcedures({ category_id: selectedCategory });
                setProcedures(response.data);
            } else {
                const recent = await procedureService.getRecentProcedures(20);
                setProcedures(recent);
            }
        } catch {
            setError('No se pudieron cargar los trámites. Comprueba tu conexión e inténtalo de nuevo.');
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

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Buscador de Trámites</Text>

                {/* Search bar with icon */}
                <View style={styles.searchRow}>
                    <Ionicons name="search" size={20} color="#64748b" style={styles.searchIcon} />
                    <TextInput
                        style={styles.searchInput}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        placeholder="Ej. Renovar DNI, Empadronamiento..."
                        placeholderTextColor="#94a3b8"
                        returnKeyType="search"
                        clearButtonMode="while-editing"
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
                            <Ionicons name="close-circle" size={20} color="#94a3b8" />
                        </TouchableOpacity>
                    )}
                </View>

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
            </View>

            {isLoading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#2563eb" />
                    <Text style={styles.loadingText}>Buscando trámites...</Text>
                </View>
            ) : error ? (
                <View style={styles.errorBox}>
                    <Text style={styles.errorText}>{error}</Text>
                    <TouchableOpacity style={styles.retryBtn} onPress={fetchProcedures}>
                        <Text style={styles.retryBtnText}>Reintentar</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <ScrollView style={styles.resultsList} contentContainerStyle={styles.resultsContent}>
                    <Text style={styles.resultsCount}>
                        {procedures.length} trámite{procedures.length !== 1 ? 's' : ''} encontrado{procedures.length !== 1 ? 's' : ''}
                    </Text>

                    {procedures.map((proc) => (
                        <Link
                            key={proc.id}
                            href={`/procedure/${proc.slug}`}
                            asChild
                        >
                            <TouchableOpacity style={styles.card} activeOpacity={0.8}>
                                <View style={styles.cardHeader}>
                                    <Text style={styles.cardScope}>{proc.scope.toUpperCase()}</Text>
                                    {proc.cost && (
                                        <View style={[
                                            styles.costTag,
                                            proc.cost.toLowerCase().includes('gratuit') && styles.costTagFree,
                                        ]}>
                                            <Text style={[
                                                styles.cardCost,
                                                proc.cost.toLowerCase().includes('gratuit') && styles.cardCostFree,
                                            ]}>
                                                {proc.cost.length > 18 ? proc.cost.slice(0, 18) + '…' : proc.cost}
                                            </Text>
                                        </View>
                                    )}
                                </View>
                                <Text style={styles.cardTitle}>{proc.title}</Text>
                                <Text style={styles.cardDesc} numberOfLines={2}>
                                    {proc.short_description}
                                </Text>
                                <Text style={styles.cardArrow}>Ver detalles →</Text>
                            </TouchableOpacity>
                        </Link>
                    ))}

                    {procedures.length === 0 && !isLoading && (
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyIcon}>🔍</Text>
                            <Text style={styles.emptyTitle}>Sin resultados</Text>
                            <Text style={styles.emptySubtitle}>
                                Prueba con términos como «DNI», «Empadronamiento» o «SEPE».
                            </Text>
                        </View>
                    )}
                </ScrollView>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc'
    },
    header: {
        paddingTop: 48,
        paddingHorizontal: 16,
        paddingBottom: 8,
        backgroundColor: '#ffffff',
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0'
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#0f172a',
        marginBottom: 12
    },
    searchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f1f5f9',
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    searchIcon: {
        marginRight: 10,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        color: '#0f172a',
        padding: 0,
    },
    clearButton: {
        padding: 4,
        marginLeft: 8,
    },
    chipsContainer: {
        paddingBottom: 12,
        gap: 8,
    },
    chip: {
        backgroundColor: '#f1f5f9',
        borderRadius: 20,
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    chipActive: {
        backgroundColor: '#2563eb',
        borderColor: '#2563eb',
    },
    chipText: {
        fontSize: 13,
        fontWeight: '500',
        color: '#475569',
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
        color: '#64748b'
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
        color: '#64748b',
        marginBottom: 12,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    card: {
        backgroundColor: '#ffffff',
        borderRadius: 14,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 3,
        elevation: 1,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8
    },
    cardScope: {
        fontSize: 11,
        fontWeight: '700',
        color: '#2563eb',
        backgroundColor: '#eff6ff',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6
    },
    costTag: {
        backgroundColor: '#fef9c3',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },
    costTagFree: {
        backgroundColor: '#dcfce7',
    },
    cardCost: {
        fontSize: 11,
        fontWeight: '600',
        color: '#92400e',
    },
    cardCostFree: {
        color: '#15803d',
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#0f172a',
        marginBottom: 6,
        lineHeight: 22,
    },
    cardDesc: {
        fontSize: 13,
        color: '#475569',
        lineHeight: 19,
        marginBottom: 8,
    },
    cardArrow: {
        fontSize: 12,
        fontWeight: '600',
        color: '#2563eb',
    },
    errorBox: {
        margin: 16,
        padding: 16,
        backgroundColor: '#fef2f2',
        borderWidth: 1,
        borderColor: '#fecaca',
        borderRadius: 12,
        alignItems: 'center',
    },
    errorText: {
        fontSize: 14,
        color: '#b91c1c',
        lineHeight: 20,
        textAlign: 'center',
        marginBottom: 12,
    },
    retryBtn: {
        backgroundColor: '#ef4444',
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
        color: '#0f172a',
        marginBottom: 6,
    },
    emptySubtitle: {
        fontSize: 14,
        color: '#64748b',
        textAlign: 'center',
        lineHeight: 20,
    },
});
