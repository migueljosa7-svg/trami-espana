import { useState, useEffect } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Link, useLocalSearchParams } from 'expo-router';
import { procedureService, ProcedureWithDetails } from '@trami-espana/shared';

export default function SearchScreen() {
    const params = useLocalSearchParams<{ categoria?: string }>();
    const [searchQuery, setSearchQuery] = useState('');
    const [procedures, setProcedures] = useState<ProcedureWithDetails[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // Debounce para evitar una llamada a Supabase por cada pulsación.
        const timer = setTimeout(async () => {
            setIsLoading(true);
            setError(null);
            try {
                if (searchQuery.trim()) {
                    const results = await procedureService.searchProcedures(searchQuery);
                    setProcedures(results);
                } else if (params.categoria) {
                    const response = await procedureService.getProcedures({ category_id: params.categoria });
                    setProcedures(response.data);
                } else {
                    const recent = await procedureService.getRecentProcedures(10);
                    setProcedures(recent);
                }
            } catch {
                setError('No se pudieron cargar los trámites. Comprueba tu conexión e inténtalo de nuevo.');
            } finally {
                setIsLoading(false);
            }
        }, 350);

        return () => clearTimeout(timer);
    }, [searchQuery, params.categoria]);

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Buscador de Trámites</Text>
                <TextInput
                    style={styles.searchInput}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholder="Ej. Renovar DNI, Empadronamiento..."
                    placeholderTextColor="#94a3b8"
                />
            </View>

            {isLoading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#2563eb" />
                    <Text style={styles.loadingText}>Buscando trámites...</Text>
                </View>
            ) : (
                <ScrollView style={styles.resultsList} contentContainerStyle={{ padding: 16 }}>
                    <Text style={styles.resultsCount}>
                        {procedures.length} trámites encontrados
                    </Text>

                    {procedures.map((proc) => (
                        <Link
                            key={proc.id}
                            href={`/procedure/${proc.slug}`}
                            asChild
                        >
                            <TouchableOpacity style={styles.card}>
                                <View style={styles.cardHeader}>
                                    <Text style={styles.cardScope}>{proc.scope.toUpperCase()}</Text>
                                    {proc.cost && <Text style={styles.cardCost}>{proc.cost}</Text>}
                                </View>
                                <Text style={styles.cardTitle}>{proc.title}</Text>
                                <Text style={styles.cardDesc} numberOfLines={2}>
                                    {proc.short_description}
                                </Text>
                            </TouchableOpacity>
                        </Link>
                    ))}
                </ScrollView>
            )}

            {error && !isLoading && (
                <View style={styles.errorBox}>
                    <Text style={styles.errorText}>{error}</Text>
                </View>
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
        paddingBottom: 16,
        backgroundColor: '#ffffff',
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0'
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#0f172a',
        marginBottom: 12
    },
    searchInput: {
        backgroundColor: '#f1f5f9',
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 10,
        fontSize: 14,
        color: '#0f172a'
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
    resultsCount: {
        fontSize: 12,
        fontWeight: '600',
        color: '#64748b',
        marginBottom: 12,
        textTransform: 'uppercase'
    },
    card: {
        backgroundColor: '#ffffff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#e2e8f0'
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 6
    },
    cardScope: {
        fontSize: 11,
        fontWeight: '700',
        color: '#2563eb',
        backgroundColor: '#eff6ff',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4
    },
    cardCost: {
        fontSize: 12,
        fontWeight: '600',
        color: '#059669'
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#0f172a',
        marginBottom: 4
    },
    cardDesc: {
        fontSize: 13,
        color: '#475569',
        lineHeight: 18
    },
    errorBox: {
        margin: 16,
        padding: 14,
        backgroundColor: '#fef2f2',
        borderWidth: 1,
        borderColor: '#fecaca',
        borderRadius: 10
    },
    errorText: {
        fontSize: 13,
        color: '#b91c1c',
        lineHeight: 18,
        textAlign: 'center'
    }
});
