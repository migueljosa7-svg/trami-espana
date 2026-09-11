import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Linking, Alert, Modal } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { procedureService, favoriteService, ProcedureWithDetails } from '@trami-espana/shared';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { generateProcedurePdf, sharePdf } from '../../src/utils/exportPdf';
import { readCachedFavorites } from '../../src/localCache';
import { useTheme, ThemeColors } from '../../constants/theme';
import { useAuth } from '../../src/context/AuthContext';

export default function ProcedureDetailScreen() {
    const { slug } = useLocalSearchParams<{ slug: string }>();
    const router = useRouter();
    const { colors, isDark } = useTheme();
    const styles = getStyles(colors, isDark);
    const { user, isLoading: authLoading } = useAuth();
    const [procedure, setProcedure] = useState<ProcedureWithDetails | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isFavorite, setIsFavorite] = useState(false);
    const [favLoading, setFavLoading] = useState(false);
    const [exportingPdf, setExportingPdf] = useState(false);
    const [pdfUri, setPdfUri] = useState<string | null>(null);
    const [showPdfPreview, setShowPdfPreview] = useState(false);
    const insets = useSafeAreaInsets();

    // Determinar si el usuario es invitado (no autenticado)
    const isGuest = !user && !authLoading;

    useEffect(() => {
        const fetchProcedure = async () => {
            if (!slug) return;
            setIsLoading(true);
            try {
                const data = await procedureService.getProcedureBySlug(slug);
                setProcedure(data);

                // Check favorite status usando el estado del AuthContext
                if (data) {
                    if (isGuest) {
                        // Modo invitado: verificar en caché local
                        type CachedFav = { procedure?: { id: string }; id: string };
                        const cached = await readCachedFavorites<CachedFav[]>([]);
                        setIsFavorite(Array.isArray(cached) ? cached.some((f) => f.procedure?.id === data.id || f.id === data.id) : false);
                    } else {
                        // Usuario autenticado: verificar en Supabase
                        try {
                            const favs = await favoriteService.getFavorites();
                            setIsFavorite(favs.some((f) => f.procedure?.id === data.id));
                        } catch {
                            // Error silencioso
                        }
                    }
                }
            } catch {
                // Error controlado.
            } finally {
                setIsLoading(false);
            }
        };
        fetchProcedure();
    }, [slug, isGuest]);

    // ============================================================
    // FUNCIÓN UNIFICADA PARA TOGGLE DE FAVORITOS
    // Valida autenticación ANTES de hacer cualquier petición
    // ============================================================
    const handleToggleFavorite = async (proc: ProcedureWithDetails) => {
        console.log('[FAVORITES] Intento de toggle favorito:', proc.slug, 'Estado previo:', isFavorite, 'isGuest:', isGuest);

        // Validar autenticación ANTES de proceder
        if (isGuest || !user) {
            console.log('[FAVORITES] Usuario no autenticado - bloqueando acción');
            Alert.alert(
                'Inicio de sesión obligatorio',
                'Es obligatorio iniciar sesión para añadir o actualizar trámites en tus favoritos.'
            );
            return;
        }

        if (favLoading) return;
        setFavLoading(true);

        const wasFavorite = isFavorite;

        // Optimistic UI update: invertir el estado inmediatamente
        setIsFavorite(!wasFavorite);

        try {
            // Usuario autenticado: usar Supabase
            if (wasFavorite) {
                console.log('[FAVORITES] Eliminando de favoritos en Supabase...');
                const result = await favoriteService.removeFavorite(proc.id);
                if (!result.success) {
                    throw new Error(result.error?.message || 'No se pudo eliminar de favoritos');
                }
                console.log('[FAVORITES] Eliminado correctamente');
                Alert.alert('Eliminado', 'Trámite eliminado de tus favoritos.');
            } else {
                console.log('[FAVORITES] Añadiendo a favoritos en Supabase...');
                const result = await favoriteService.addFavorite(proc.id);
                if (!result.success) {
                    throw new Error(result.error?.message || 'No se pudo añadir a favoritos');
                }
                console.log('[FAVORITES] Añadido correctamente');
                Alert.alert('¡Guardado! 💙', 'Trámite añadido a tus favoritos.');
            }
        } catch (error) {
            // Revertir el cambio optimista en caso de error
            setIsFavorite(wasFavorite);
            const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
            console.error('[FAVORITES] Error al actualizar favoritos:', errorMessage);
            Alert.alert('Error', 'No se pudo actualizar favoritos. Inténtalo de nuevo.');
        } finally {
            setFavLoading(false);
        }
    };

    /** Genera el PDF y muestra la vista previa con opciones de descargar/compartir */
    const handleExportPdf = async () => {
        if (!procedure || exportingPdf) return;
        setExportingPdf(true);
        try {
            const uri = await generateProcedurePdf({
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
            if (uri) {
                setPdfUri(uri);
                setShowPdfPreview(true);
            } else {
                Alert.alert('Error', 'No se pudo generar el PDF. Inténtalo de nuevo.');
            }
        } catch {
            Alert.alert('Error', 'No se pudo generar el PDF. Inténtalo de nuevo.');
        } finally {
            setExportingPdf(false);
        }
    };

    /** Comparte el PDF desde la vista previa */
    const handleSharePdf = async () => {
        if (!pdfUri) return;
        try {
            await sharePdf(pdfUri);
            setShowPdfPreview(false);
        } catch {
            Alert.alert('Error', 'No se pudo compartir el PDF.');
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
        <>
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
                    onPress={() => handleToggleFavorite(procedure)}
                    disabled={favLoading}
                    activeOpacity={0.75}
                    accessibilityLabel={isFavorite ? 'Eliminar de favoritos' : 'Añadir a favoritos'}
                >
                    <Ionicons
                        name={isFavorite ? 'heart' : 'heart-outline'}
                        size={26}
                        color={isFavorite ? '#ef4444' : '#64748b'}
                    />
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
                onPress={() => handleToggleFavorite(procedure)}
                disabled={favLoading}
                activeOpacity={0.8}
            >
                {favLoading ? (
                    <ActivityIndicator size="small" color={isFavorite ? '#ef4444' : '#2563eb'} />
                ) : (
                    <Ionicons
                        name={isFavorite ? 'heart' : 'heart-outline'}
                        size={20}
                        color={isFavorite ? '#ef4444' : '#2563eb'}
                    />
                )}
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

        {/* PDF Preview Modal */}
        <Modal
            visible={showPdfPreview}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={() => setShowPdfPreview(false)}
        >
            <View style={styles.pdfModalContainer}>
                <View style={styles.pdfModalHeader}>
                    <Text style={styles.pdfModalTitle}>Vista previa del PDF</Text>
                    <TouchableOpacity onPress={() => setShowPdfPreview(false)} style={styles.pdfCloseButton}>
                        <Ionicons name="close" size={24} color="#64748b" />
                    </TouchableOpacity>
                </View>
                <View style={styles.pdfPreviewPlaceholder}>
                    <Ionicons name="document-text" size={64} color="#2563eb" />
                    <Text style={styles.pdfPreviewText}>PDF generado correctamente</Text>
                    <Text style={styles.pdfPreviewSubtext}>Usa los botones para guardar o compartir</Text>
                </View>
                <View style={styles.pdfModalActions}>
                    <TouchableOpacity style={styles.pdfShareButton} onPress={handleSharePdf}>
                        <Ionicons name="share-outline" size={20} color="#ffffff" />
                        <Text style={styles.pdfShareButtonText}>Compartir</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.pdfDownloadButton} onPress={handleSharePdf}>
                        <Ionicons name="download-outline" size={20} color="#2563eb" />
                        <Text style={styles.pdfDownloadButtonText}>Guardar</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    </>
    );
}

const getStyles = (colors: ThemeColors, isDark: boolean) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
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
        color: colors.textSecondary,
    },
    errorText: {
        fontSize: 15,
        textAlign: 'center',
        marginBottom: 16,
        color: colors.text,
    },
    backBtn: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 8,
        backgroundColor: colors.primary,
    },
    backBtnText: {
        fontWeight: '600',
        color: '#ffffff',
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
        fontSize: 15,
        fontWeight: '600',
        color: colors.primary,
    },
    bookmarkButton: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 22,
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 2,
        elevation: 1,
        backgroundColor: colors.card,
        borderColor: colors.border,
    },
    pdfButton: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 22,
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 2,
        elevation: 1,
        backgroundColor: colors.card,
        borderColor: colors.border,
    },
    headerCard: {
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        borderWidth: 1,
        backgroundColor: colors.card,
        borderColor: colors.border,
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
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        overflow: 'hidden',
        backgroundColor: colors.chip,
        color: colors.textSecondary,
    },
    communityBadge: {
        fontSize: 11,
        fontWeight: '600',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        overflow: 'hidden',
        flexShrink: 1,
        backgroundColor: colors.chip,
        color: colors.textSecondary,
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 8,
        lineHeight: 28,
        color: colors.text,
    },
    shortDesc: {
        fontSize: 14,
        lineHeight: 20,
        marginBottom: 16,
        color: colors.textSecondary,
    },
    metaGrid: {
        flexDirection: 'row',
        borderTopWidth: 1,
        paddingTop: 12,
        gap: 16,
        borderTopColor: colors.border,
    },
    metaItem: {
        flex: 1
    },
    metaLabel: {
        fontSize: 11,
        fontWeight: '600',
        textTransform: 'uppercase',
        color: colors.textMuted,
    },
    metaValue: {
        fontSize: 13,
        fontWeight: '600',
        marginTop: 2,
        color: colors.text,
    },
    metaValueFree: {
        color: colors.successText,
    },
    section: {
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        borderWidth: 1,
        backgroundColor: colors.card,
        borderColor: colors.border,
    },
    sectionTitle: {
        fontSize: 17,
        fontWeight: 'bold',
        marginBottom: 12,
        color: colors.text,
    },
    listItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
        marginBottom: 10
    },
    bullet: {
        fontSize: 14,
        color: colors.primary,
    },
    listText: {
        fontSize: 14,
        flex: 1,
        lineHeight: 20,
        color: colors.text,
    },
    listTextBold: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.text,
    },
    listSubtext: {
        fontSize: 12,
        marginTop: 2,
        color: colors.textSecondary,
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
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.primary,
    },
    stepNumberText: {
        fontSize: 13,
        fontWeight: 'bold',
        color: '#ffffff',
    },
    stepTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: colors.text,
    },
    stepDesc: {
        fontSize: 13,
        marginTop: 2,
        lineHeight: 18,
        color: colors.textSecondary,
    },
    linkButton: {
        borderRadius: 12,
        padding: 14,
        marginBottom: 8,
        borderWidth: 1,
        backgroundColor: colors.primarySoft,
        borderColor: isDark ? '#1e3a5f' : '#bfdbfe',
    },
    linkButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.primary,
    },
    linkSub: {
        fontSize: 12,
        marginTop: 2,
        color: colors.textSecondary,
    },
    favBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        borderRadius: 14,
        paddingVertical: 14,
        marginBottom: 16,
        borderWidth: 1,
        backgroundColor: colors.card,
        borderColor: colors.border,
    },
    favBannerActive: {
        backgroundColor: colors.errorBackground,
        borderColor: colors.errorBorder,
    },
    favBannerText: {
        fontSize: 15,
        fontWeight: '600',
        color: colors.text,
    },
    favBannerTextActive: {
        color: colors.danger,
    },
    legalNotice: {
        padding: 16,
        alignItems: 'center',
        marginBottom: 16,
    },
    legalNoticeText: {
        fontSize: 11,
        textAlign: 'center',
        color: colors.textMuted,
    },
    // PDF Modal styles
    pdfModalContainer: {
        flex: 1,
        backgroundColor: colors.background,
    },
    pdfModalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        paddingTop: 48,
        backgroundColor: colors.card,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    pdfModalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.text,
    },
    pdfCloseButton: {
        padding: 4,
    },
    pdfPreviewPlaceholder: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 32,
    },
    pdfPreviewText: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
        marginTop: 16,
    },
    pdfPreviewSubtext: {
        fontSize: 13,
        color: colors.textSecondary,
        marginTop: 4,
    },
    pdfModalActions: {
        flexDirection: 'row',
        gap: 12,
        padding: 16,
        paddingBottom: 32,
        backgroundColor: colors.card,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    pdfShareButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: colors.primary,
        borderRadius: 12,
        paddingVertical: 14,
    },
    pdfShareButtonText: {
        color: '#ffffff',
        fontWeight: '600',
        fontSize: 15,
    },
    pdfDownloadButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: colors.primarySoft,
        borderRadius: 12,
        paddingVertical: 14,
        borderWidth: 1,
        borderColor: isDark ? '#1e3a5f' : '#bfdbfe',
    },
    pdfDownloadButtonText: {
        color: colors.primary,
        fontWeight: '600',
        fontSize: 15,
    },
});
