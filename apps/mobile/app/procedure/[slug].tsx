import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Linking } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { procedureService, ProcedureWithDetails } from '@trami-espana/shared';

export default function ProcedureDetailScreen() {
    const { slug } = useLocalSearchParams<{ slug: string }>();
    const [procedure, setProcedure] = useState<ProcedureWithDetails | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchProcedure = async () => {
            if (!slug) return;
            setIsLoading(true);
            try {
                const data = await procedureService.getProcedureBySlug(slug);
                setProcedure(data);
            } catch {
                // Error controlado.
            } finally {
                setIsLoading(false);
            }
        };
        fetchProcedure();
    }, [slug]);

    if (isLoading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#2563eb" />
                <Text style={styles.loadingText}>Cargando trámite...</Text>
            </View>
        );
    }

    if (!procedure) {
        return (
            <View style={styles.center}>
                <Text style={styles.errorText}>No se ha encontrado el trámite solicitado.</Text>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
            {/* Header info */}
            <View style={styles.headerCard}>
                <View style={styles.badgeRow}>
                    <Text style={styles.scopeBadge}>{procedure.scope.toUpperCase()}</Text>
                    {procedure.autonomous_community && (
                        <Text style={styles.communityBadge}>{procedure.autonomous_community}</Text>
                    )}
                </View>
                <Text style={styles.title}>{procedure.title}</Text>
                <Text style={styles.shortDesc}>{procedure.short_description}</Text>

                <View style={styles.metaGrid}>
                    <View style={styles.metaItem}>
                        <Text style={styles.metaLabel}>Coste</Text>
                        <Text style={styles.metaValue}>{procedure.cost || 'Gratuito'}</Text>
                    </View>
                    <View style={styles.metaItem}>
                        <Text style={styles.metaLabel}>Duración estimada</Text>
                        <Text style={styles.metaValue}>{procedure.estimated_duration || 'No especificada'}</Text>
                    </View>
                </View>
            </View>

            {/* Requisitos */}
            {procedure.requirements && procedure.requirements.length > 0 && (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Requisitos</Text>
                    {procedure.requirements.map((req, idx) => (
                        <View key={req.id || idx} style={styles.listItem}>
                            <Text style={styles.bullet}>•</Text>
                            <Text style={styles.listText}>{req.title}</Text>
                        </View>
                    ))}
                </View>
            )}

            {/* Documentación */}
            {procedure.documents && procedure.documents.length > 0 && (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Documentación necesaria</Text>
                    {procedure.documents.map((doc, idx) => (
                        <View key={doc.id || idx} style={styles.listItem}>
                            <Text style={styles.bullet}>📄</Text>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.listTextBold}>{doc.name}</Text>
                                {doc.description && <Text style={styles.listSubtext}>{doc.description}</Text>}
                            </View>
                        </View>
                    ))}
                </View>
            )}

            {/* Pasos */}
            {procedure.steps && procedure.steps.length > 0 && (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Pasos a seguir</Text>
                    {procedure.steps.map((step, idx) => (
                        <View key={step.id || idx} style={styles.stepItem}>
                            <View style={styles.stepNumber}>
                                <Text style={styles.stepNumberText}>{step.order_index || idx + 1}</Text>
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.stepTitle}>{step.title}</Text>
                                <Text style={styles.stepDesc}>{step.description}</Text>
                            </View>
                        </View>
                    ))}
                </View>
            )}

            {/* Enlaces Oficiales */}
            {procedure.links && procedure.links.length > 0 && (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Enlaces a Sedes Oficiales</Text>
                    {procedure.links.map((link, idx) => (
                        <TouchableOpacity
                            key={link.id || idx}
                            style={styles.linkButton}
                            onPress={() => Linking.openURL(link.url)}
                        >
                            <Text style={styles.linkButtonText}>{link.title}</Text>
                            <Text style={styles.linkSub}>Abrir en web oficial ↗</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            )}

            {/* Legal Notice Footer */}
            <View style={styles.legalNotice}>
                <Text style={styles.legalNoticeText}>
                    Servicio de orientación independiente. Información actualizada el{' '}
                    {new Date(procedure.updated_at).toLocaleDateString('es-ES')}.
                </Text>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc'
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24
    },
    loadingText: {
        marginTop: 8,
        fontSize: 14,
        color: '#64748b'
    },
    errorText: {
        fontSize: 15,
        color: '#ef4444',
        textAlign: 'center'
    },
    headerCard: {
        backgroundColor: '#ffffff',
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#e2e8f0'
    },
    badgeRow: {
        flexDirection: 'row',
        gap: 6,
        marginBottom: 8
    },
    scopeBadge: {
        fontSize: 11,
        fontWeight: '700',
        color: '#2563eb',
        backgroundColor: '#eff6ff',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6
    },
    communityBadge: {
        fontSize: 11,
        fontWeight: '600',
        color: '#475569',
        backgroundColor: '#f1f5f9',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#0f172a',
        marginBottom: 8
    },
    shortDesc: {
        fontSize: 14,
        color: '#475569',
        lineHeight: 20,
        marginBottom: 16
    },
    metaGrid: {
        flexDirection: 'row',
        borderTopWidth: 1,
        borderTopColor: '#f1f5f9',
        paddingTop: 12,
        gap: 16
    },
    metaItem: {
        flex: 1
    },
    metaLabel: {
        fontSize: 11,
        color: '#94a3b8',
        fontWeight: '600',
        textTransform: 'uppercase'
    },
    metaValue: {
        fontSize: 13,
        fontWeight: '600',
        color: '#0f172a',
        marginTop: 2
    },
    section: {
        backgroundColor: '#ffffff',
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#e2e8f0'
    },
    sectionTitle: {
        fontSize: 17,
        fontWeight: 'bold',
        color: '#0f172a',
        marginBottom: 12
    },
    listItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
        marginBottom: 10
    },
    bullet: {
        fontSize: 14,
        color: '#2563eb'
    },
    listText: {
        fontSize: 14,
        color: '#334155',
        flex: 1,
        lineHeight: 20
    },
    listTextBold: {
        fontSize: 14,
        fontWeight: '600',
        color: '#0f172a'
    },
    listSubtext: {
        fontSize: 12,
        color: '#64748b',
        marginTop: 2
    },
    stepItem: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 14
    },
    stepNumber: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#eff6ff',
        justifyContent: 'center',
        alignItems: 'center'
    },
    stepNumberText: {
        fontSize: 13,
        fontWeight: 'bold',
        color: '#2563eb'
    },
    stepTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: '#0f172a'
    },
    stepDesc: {
        fontSize: 13,
        color: '#475569',
        marginTop: 2,
        lineHeight: 18
    },
    linkButton: {
        backgroundColor: '#eff6ff',
        borderRadius: 12,
        padding: 14,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#bfdbfe'
    },
    linkButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1e40af'
    },
    linkSub: {
        fontSize: 12,
        color: '#3b82f6',
        marginTop: 2
    },
    legalNotice: {
        padding: 16,
        alignItems: 'center',
        marginBottom: 32
    },
    legalNoticeText: {
        fontSize: 11,
        color: '#94a3b8',
        textAlign: 'center'
    }
});
