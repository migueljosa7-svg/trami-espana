import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Linking, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { procedureService, favoriteService, ProcedureWithDetails } from '@trami-espana/shared';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { exportProcedureToPdf } from '../../src/utils/exportPdf';

export default function ProcedureDetailScreen() {
    const { slug } = useLocalSearchParams<{ slug: string }>();
    const router = useRouter();
    const [procedure, setProcedure] = useState<ProcedureWithDetails | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isFavorite, setIsFavorite] = useState(false);
    const [favLoading, setFavLoading] = useState(false);
    const [exportingPdf, setExportingPdf] = useState(false);
    // Insets para que el contenido nunca quede bajo la barra del sistema.
    const insets = useSafeAreaInsets();

    useEffect(() => {
        const fetchProcedure = async () => {
            if (!slug) return;
            setIsLoading(true);
            try {
                const data = await procedureService.getProcedureBySlug(slug);
                setProcedure(data);

                // Check favorite status for this procedure
                if (data) {
                    try {
                        const favs = await favoriteService.getFavorites();
                        setIsFavorite(favs.some((f) => f.procedure?.id === data.id));
                    } catch {
                        // User may not be logged in — just leave isFavorite = false
                    }
                }
            } catch {
                // Error controlado.
            } finally {
                setIsLoading(false);
            }
        };
        fetchProcedure();
    }, [slug]);

    const toggleFavorite = async () => {
        if (!procedure) return;
        setFavLoading(true);
        try {
            if (isFavorite) {
                const result = await favoriteService.removeFavorite(procedure.id);
                if (result.success) {
                    setIsFavorite(false);
                    Alert.alert('Eliminado', 'Trámite eliminado de tus favoritos.');
                }
            } else {
                const result = await favoriteService.addFavorite(procedure.id);
                if (result.success) {
                    setIsFavorite(true);
                    Alert.alert('¡Guardado! 💙', 'Trámite añadido a tus favoritos.');
                }
            }
        } catch {
            Alert.alert('Error', 'No se pudo actualizar favoritos. Inicia sesión e inténtalo de nuevo.');
        } finally {
            setFavLoading(false);
        }
    };

    /** Genera un PDF con el resumen del trámite y lo comparte con el sistema. */
    const handleExportPdf = async () => {
        if (!procedure || exportingPdf) return;
        setExportingPdf(true);
        try {
            const result = await exportProcedureToPdf({
                title: procedure.title,
                scope: procedure.scope,
                community: procedure.autonomous_community,
                cost: procedure.cost,
                duration: procedure.estimated_duration,
                source: procedure.source,
                sourceUrl: procedure.source_url,
                description: procedure.description,
                requirements: procedure.requirements?.map((r) => ({ title: r.title, description: r.description })),
                documents: procedure.documents?.map((d) => ({
                    title: d.name,
                    description: d.description,
                    isRequired: d.is_required,
                })),
                steps: procedure.steps?.map((s) => ({ title: s.title, description: s.description })),
                links: procedure.links?.map((l) => ({ title: l.title, url: l.url })),
            });
            if (result === 'failed') {
                Alert.alert('Error', 'No se pudo generar el PDF. Inténtalo de nuevo.');
            } else {
                Alert.alert('PDF listo', 'Puedes guardarlo o compartirlo.');
            }
        } finally {
            setExportingPdf(false);
        }
    };

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
                <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                    <Text style={styles.backBtnText}>← Volver</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container} contentContainerStyle={{ padding: 16, paddingBottom: 60 + insets.bottom }}>
            {/* Back + Bookmark header row */}
            <View style={styles.topBar}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.7}>
                    <Ionicons name="chevron-back" size={20} color="#2563eb" />
                    <Text style={styles.backButtonText}>Volver</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.pdfButton}
                    onPress={handleExportPdf}
                    disabled={exportingPdf}
                    activeOpacity={0.75}
                    accessibilityLabel="Exportar trámite a PDF"
                >
                    {exportingPdf ? (
                        <ActivityIndicator size="small" color="#2563eb" />
                    ) : (
                        <Ionicons name="download-outline" size={22} color="#2563eb" />
                    )}
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.bookmarkButton}
                    onPress={toggleFavorite}
                    disabled={favLoading}
                    activeOpacity={0.75}
                    accessibilityLabel={isFavorite ? 'Eliminar de favoritos' : 'Añadir a favoritos'}
                >
                    {favLoading ? (
                        <ActivityIndicator size="small" color="#2563eb" />
                    ) : (
                        <Ionicons
                            name={isFavorite ? 'heart' : 'heart-outline'}
                            size={26}
                            color={isFavorite ? '#ef4444' : '#64748b'}
                        />
                    )}
                </TouchableOpacity>
            </View>

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
                        <Text style={[
                            styles.metaValue,
                            procedure.cost?.toLowerCase().includes('gratuit') && styles.metaValueFree,
                        ]}>
                            {procedure.cost || 'Gratuito'}
                        </Text>
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
                            activeOpacity={0.8}
                        >
                            <Text style={styles.linkButtonText}>{link.title}</Text>
                            <Text style={styles.linkSub}>Abrir en web oficial ↗</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            )}

            {/* Guardar en favoritos banner */}
            <TouchableOpacity
                style={[styles.favBanner, isFavorite && styles.favBannerActive]}
                onPress={toggleFavorite}
                disabled={favLoading}
                activeOpacity={0.8}
            >
                <Ionicons
                    name={isFavorite ? 'heart' : 'heart-outline'}
                    size={20}
                    color={isFavorite ? '#ef4444' : '#2563eb'}
                />
                <Text style={[styles.favBannerText, isFavorite && styles.favBannerTextActive]}>
                    {isFavorite ? 'Guardado en favoritos' : 'Guardar en favoritos'}
                </Text>
            </TouchableOpacity>

            {/* Legal Notice Footer */}
            <View style={styles.legalNotice}>
                <Text style={styles.legalNoticeText}>
                    Servicio de orientación independiente.{' '}
                    {procedure.updated_at &&
                    !isNaN(new Date(procedure.updated_at).getTime())
                        ? `Información actualizada el ${new Date(
                              procedure.updated_at
                          ).toLocaleDateString('es-ES')}.`
                        : 'Información verificada por nuestro equipo editorial.'}
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
        textAlign: 'center',
        marginBottom: 16,
    },
    backBtn: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        backgroundColor: '#eff6ff',
        borderRadius: 8,
    },
    backBtnText: {
        color: '#2563eb',
        fontWeight: '600',
    },
    topBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
        paddingTop: 8,
    },
    backButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    backButtonText: {
        color: '#2563eb',
        fontSize: 15,
        fontWeight: '600',
    },
    bookmarkButton: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#ffffff',
        borderRadius: 22,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 2,
        elevation: 1,
    },
    pdfButton: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#ffffff',
        borderRadius: 22,
        borderWidth: 1,
        borderColor: '#bfdbfe',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 2,
        elevation: 1,
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
        flexWrap: 'wrap',
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
        borderRadius: 6,
        overflow: 'hidden',
    },
    communityBadge: {
        fontSize: 11,
        fontWeight: '600',
        color: '#475569',
        backgroundColor: '#f1f5f9',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        overflow: 'hidden',
        flexShrink: 1,
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#0f172a',
        marginBottom: 8,
        lineHeight: 28,
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
    metaValueFree: {
        color: '#15803d',
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
        width: 30,
        height: 30,
        borderRadius: 15,
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
    favBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        backgroundColor: '#eff6ff',
        borderRadius: 14,
        paddingVertical: 14,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#bfdbfe',
    },
    favBannerActive: {
        backgroundColor: '#fef2f2',
        borderColor: '#fecaca',
    },
    favBannerText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#2563eb',
    },
    favBannerTextActive: {
        color: '#dc2626',
    },
    legalNotice: {
        padding: 16,
        alignItems: 'center',
        marginBottom: 16,
    },
    legalNoticeText: {
        fontSize: 11,
        color: '#94a3b8',
        textAlign: 'center'
    }
});
