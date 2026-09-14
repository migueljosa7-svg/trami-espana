import { useState, useEffect, useMemo, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Linking, Alert, Modal } from 'react-native';
import { useLocalSearchParams, useRouter, useNavigation, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { procedureService, favoriteService, ProcedureWithDetails } from '@trami-espana/shared';
import { generateProcedurePdf, sharePdf } from '../../src/utils/exportPdf';
import { readCachedFavorites } from '../../src/localCache';
import { useTheme, ThemeColors } from '../../constants/theme';
import { useAuth } from '../../src/context/AuthContext';
import { useChecklist } from '../../src/hooks/useChecklist';

export default function ProcedureDetailScreen() {
    const { slug } = useLocalSearchParams<{ slug: string }>();
    const router = useRouter();
    const navigation = useNavigation();
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
    // Modal de confirmación al salir / volver atrás.
    const [showExitConfirm, setShowExitConfirm] = useState(false);
    const pendingExitAction = useRef<unknown>(null);
    const insets = useSafeAreaInsets();

    // IDs de checklist: requisitos + documentos + pasos. Reactivo con useChecklist.
    const checklistIds = useMemo(() => {
        if (!procedure) return [] as string[];
        const ids: string[] = [];
        (procedure.requirements ?? []).forEach((r, i) => ids.push(`req-${r.id || i}`));
        (procedure.documents ?? []).forEach((d, i) => ids.push(`doc-${d.id || i}`));
        (procedure.steps ?? []).forEach((s, i) => ids.push(`step-${s.id || i}`));
        return ids;
    }, [procedure]);
    const {
        checkedItems,
        toggleItem,
        totalItems: checklistTotal,
        checkedCount: checklistCompleted,
        progressPercent: checklistProgressPercent,
    } = useChecklist(slug ?? '', checklistIds);
    // Cabecera adaptada al tema: fondo dinámico (blanco en claro, oscuro en dark)
    // para que el SafeArea/Header no quede en #FFFFFF con el modo oscuro activo.
    const topBackground = isDark ? '#0F172A' : '#FFFFFF';

    // Determinar si el usuario es invitado (no autenticado)
    const isGuest = !user && !authLoading;

    // ============================================================
    // Modal de confirmaciÃ³n al salir / volver atrÃ¡s (Item 4)
    // Intercepta la eliminaciÃ³n de la pantalla: botÃ³n atrÃ¡s del header
    // nativo, gesto iOS, router.back() y botÃ³n fÃ­sico de Android.
    // ============================================================
    useEffect(() => {
        if (!procedure) return undefined;
        const unsubscribe = navigation.addListener('beforeRemove', (e) => {
            // Bloquear la salida y pedir confirmaciÃ³n.
            e.preventDefault();
            pendingExitAction.current = e.data?.action ?? null;
            setShowExitConfirm(true);
        });
        return unsubscribe;
    }, [navigation, procedure]);

    const handleExitConfirm = () => {
        setShowExitConfirm(false);
        const action = pendingExitAction.current;
        pendingExitAction.current = null;
        if (action) {
            // Re-enviar la acciÃ³n pendiente (el usuario confirmÃ³ salir).
            navigation.dispatch(action as never);
        } else {
            router.back();
        }
    };

    const handleExitCancel = () => {
        setShowExitConfirm(false);
        pendingExitAction.current = null;
    };

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
        <SafeAreaView style={[styles.safeArea, { backgroundColor: topBackground }]} edges={['top', 'bottom']}>
            {/* Cabecera del Stack tematizada desde la propia pantalla: en
                modo oscuro la franja superior ("Detalle del trámite") queda
                #0F172A con texto claro, nunca blanca. Estas opciones
                dinámicas sobreescriben/garantizan las del _layout raíz. */}
            <Stack.Screen
                options={{
                    headerShown: true,
                    title: 'Detalle del trámite',
                    headerBackTitle: 'Atrás',
                    headerStyle: { backgroundColor: isDark ? '#0F172A' : '#FFFFFF' },
                    headerTintColor: isDark ? '#FFFFFF' : '#0F172A',
                    headerTitleStyle: { color: isDark ? '#FFFFFF' : '#0F172A' },
                    headerShadowVisible: false,
                }}
            />
            {/* StatusBar aplicada de forma uniforme en esta vista: con
                backgroundColor enlazado al tema para que la franja superior
                no aparezca en blanco en modo oscuro (Android). */}
            <StatusBar style={isDark ? 'light' : 'dark'} backgroundColor={topBackground} />
            <ScrollView style={styles.container} contentContainerStyle={{ padding: 16, paddingBottom: 60 + insets.bottom, backgroundColor: colors.background }}>
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

                {/* Barra de progreso del trámite (reactiva con useChecklist) */}
                {checklistTotal > 0 && (
                    <View
                        style={[
                            styles.progressCard,
                            checklistProgressPercent >= 100 && styles.progressCardComplete,
                        ]}
                        accessibilityLabel={`Progreso del trámite: ${checklistCompleted} de ${checklistTotal} (${checklistProgressPercent}%)`}
                    >
                        <View style={styles.progressHeader}>
                            <Text style={styles.progressLabel}>
                                Progreso: {checklistCompleted}/{checklistTotal} completados - {checklistProgressPercent}%
                            </Text>
                            {checklistProgressPercent >= 100 && (
                                <View style={styles.progressDoneBadge}>
                                    <Ionicons name="checkmark-circle" size={18} color={colors.success} />
                                    <Text style={styles.progressDoneText}>Completado</Text>
                                </View>
                            )}
                        </View>
                        <View style={styles.progressTrack}>
                            <View
                                style={[
                                    styles.progressFill,
                                    checklistProgressPercent >= 100 && styles.progressFillComplete,
                                    { width: `${checklistProgressPercent}%` },
                                ]}
                            />
                        </View>
                    </View>
                )}

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
                    {procedure.requirements.map((req, idx) => {
                        const id = `req-${req.id || idx}`;
                        const done = !!checkedItems[id];
                        return (
                            <TouchableOpacity
                                key={req.id || idx}
                                style={[styles.listItem, done && styles.listItemDone]}
                                onPress={() => toggleItem(id)}
                                activeOpacity={0.7}
                                accessibilityRole="checkbox"
                                accessibilityState={{ checked: done }}
                                accessibilityLabel={`Requisito: ${req.title}`}
                            >
                                <Ionicons
                                    name={done ? 'checkmark-circle' : 'ellipse-outline'}
                                    size={20}
                                    color={done ? colors.success : colors.textMuted}
                                />
                                <Text style={[styles.listText, done && styles.listTextDone]}>{req.title}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            )}

            {/* Documentación */}
            {procedure.documents && procedure.documents.length > 0 && (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Documentación necesaria</Text>
                    {procedure.documents.map((doc, idx) => {
                        const id = `doc-${doc.id || idx}`;
                        const done = !!checkedItems[id];
                        return (
                            <TouchableOpacity
                                key={doc.id || idx}
                                style={[styles.listItem, done && styles.listItemDone]}
                                onPress={() => toggleItem(id)}
                                activeOpacity={0.7}
                                accessibilityRole="checkbox"
                                accessibilityState={{ checked: done }}
                                accessibilityLabel={`Documento: ${doc.name}`}
                            >
                                <Ionicons
                                    name={done ? 'checkmark-circle' : 'ellipse-outline'}
                                    size={20}
                                    color={done ? colors.success : colors.textMuted}
                                />
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.listTextBold, done && styles.listTextDone]}>{doc.name}</Text>
                                    {doc.description && <Text style={styles.listSubtext}>{doc.description}</Text>}
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            )}

            {/* Pasos */}
            {procedure.steps && procedure.steps.length > 0 && (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Pasos a seguir</Text>
                    {procedure.steps.map((step, idx) => {
                        const id = `step-${step.id || idx}`;
                        const done = !!checkedItems[id];
                        return (
                            <TouchableOpacity
                                key={step.id || idx}
                                style={[styles.stepItem, done && styles.listItemDone]}
                                onPress={() => toggleItem(id)}
                                activeOpacity={0.7}
                                accessibilityRole="checkbox"
                                accessibilityState={{ checked: done }}
                                accessibilityLabel={`Paso: ${step.title}`}
                            >
                                <View style={[styles.stepNumber, done && styles.stepNumberDone]}>
                                    {done ? (
                                        <Ionicons name="checkmark" size={16} color="#ffffff" />
                                    ) : (
                                        <Text style={styles.stepNumberText}>{step.order_index || idx + 1}</Text>
                                    )}
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.stepTitle, done && styles.listTextDone]}>{step.title}</Text>
                                    <Text style={styles.stepDesc}>{step.description}</Text>
                                </View>
                            </TouchableOpacity>
                        );
                    })}
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

        {/* Modal de confirmación al salir / volver atrás */}
        <Modal
            visible={showExitConfirm}
            transparent
            animationType="fade"
            onRequestClose={handleExitCancel}
        >
            <View style={styles.exitOverlay}>
                <View style={styles.exitCard}>
                    <View style={styles.exitIconWrap}>
                        <Ionicons name="exit-outline" size={34} color={colors.warning} />
                    </View>
                    <Text style={styles.exitTitle}>¿Salir del trámite?</Text>
                    <Text style={styles.exitMessage}>
                        Tu checklist y favoritos se guardan automáticamente. Podrás
                        continuar este trámite cuando vuelvas a abrirlo.
                    </Text>
                    <View style={styles.exitActions}>
                        <TouchableOpacity
                            style={styles.exitCancelBtn}
                            onPress={handleExitCancel}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.exitCancelText}>Continuar aquí</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.exitConfirmBtn}
                            onPress={handleExitConfirm}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.exitConfirmText}>Salir</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
        </SafeAreaView>
    );
}

const getStyles = (colors: ThemeColors, isDark: boolean) => StyleSheet.create({
    safeArea: {
        flex: 1,
    },
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
    progressCard: {
        borderRadius: 12,
        padding: 14,
        marginBottom: 14,
        borderWidth: 1,
        backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
        borderColor: colors.border,
    },
    progressHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    progressLabel: {
        flex: 1,
        fontSize: 13,
        fontWeight: '700',
        color: colors.text,
        marginRight: 8,
    },
    progressTrack: {
        height: 10,
        borderRadius: 5,
        overflow: 'hidden',
        backgroundColor: isDark ? '#334155' : '#E2E8F0',
    },
    progressFill: {
        height: '100%',
        borderRadius: 5,
        backgroundColor: colors.success,
    },
    // Trámite 100% completado: refuerza el color e indica éxito visual.
    progressCardComplete: {
        backgroundColor: isDark ? '#0D2818' : '#F0FDF4',
        borderColor: isDark ? '#1A4A2E' : '#BBF7D0',
    },
    progressFillComplete: {
        backgroundColor: isDark ? '#34D399' : '#059669',
    },
    progressDoneBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: colors.successBackground,
        borderWidth: 1,
        borderColor: colors.successBorder,
        borderRadius: 999,
        paddingHorizontal: 8,
        paddingVertical: 3,
    },
    progressDoneText: {
        fontSize: 11,
        fontWeight: '700',
        color: colors.successText,
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
    listTextDone: {
        textDecorationLine: 'line-through',
        opacity: 0.6,
    },
    listItemDone: {
        opacity: 0.85,
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
    stepNumberDone: {
        backgroundColor: colors.success,
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
    // Modal de confirmación al salir
    exitOverlay: {
        flex: 1,
        backgroundColor: colors.overlay,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    exitCard: {
        width: '100%',
        maxWidth: 360,
        backgroundColor: colors.card,
        borderRadius: 20,
        padding: 24,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border,
    },
    exitIconWrap: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: colors.warningBackground,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 14,
    },
    exitTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: colors.text,
        textAlign: 'center',
        marginBottom: 8,
    },
    exitMessage: {
        fontSize: 14,
        lineHeight: 20,
        color: colors.textSecondary,
        textAlign: 'center',
        marginBottom: 20,
    },
    exitActions: {
        flexDirection: 'row',
        gap: 10,
        width: '100%',
    },
    exitCancelBtn: {
        flex: 1,
        paddingVertical: 13,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: 'center',
        backgroundColor: colors.background,
    },
    exitCancelText: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    exitConfirmBtn: {
        flex: 1,
        paddingVertical: 13,
        borderRadius: 12,
        backgroundColor: colors.primary,
        alignItems: 'center',
    },
    exitConfirmText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#ffffff',
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
