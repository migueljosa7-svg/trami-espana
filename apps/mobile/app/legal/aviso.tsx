import { useCallback } from 'react';
import { Text, View, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LEGAL_DISCLAIMER, INDEPENDENCE_DISCLAIMER, ASSISTANT_DISCLAIMER } from '@trami-espana/shared';
import LegalScreen from '../../components/LegalScreen';
import { useTheme, createThemedStyles } from '../../constants/theme';
import { OFFICIAL_PORTALS } from '../../src/officialSources';

// v1.5.1 — Fuentes oficiales: solo portales primarios (src/officialSources.ts).
// Las páginas profundas de las sedes cambian a menudo; los portales raíz no.

export default function AvisoScreen() {
    const { colors } = useTheme();
    const styles = getStyles(colors);

    const openSource = useCallback((url: string) => {
        Linking.openURL(url).catch(() => {
            // Sin navegador disponible: degradar silenciosamente.
        });
    }, []);

    return (
        <LegalScreen
            title="Aviso de servicio independiente"
            subtitle="Trami España es un servicio privado e independiente."
            notice={LEGAL_DISCLAIMER}
            sections={[
                {
                    title: 'Qué NO es Trami España',
                    body:
                        'Trami España no forma parte del Gobierno de España, de ningún ministerio, de la ' +
                        'Seguridad Social, de la Agencia Tributaria, de la DGT, del SEPE, de ningún ayuntamiento, ' +
                        'de ninguna comunidad autónoma ni de ninguna Administración Pública.',
                },
                {
                    title: 'Naturaleza del servicio',
                    body:
                        'Somos una aplicación informativa independiente que ayuda a encontrar y entender ' +
                        'trámites administrativos. La información es orientativa y debe comprobarse siempre ' +
                        'en las fuentes oficiales.',
                },
            ]}
        >
            <View style={styles.box}>
                <Text style={styles.boxTitle}>Sobre el asistente</Text>
                <Text style={styles.boxBody}>{ASSISTANT_DISCLAIMER}</Text>
            </View>

            {/* FASE 2 — Fuentes oficiales: dominios completos literales. */}
            <View style={styles.sourcesBox}>
                <View style={styles.sourcesHeader}>
                    <Ionicons name="shield-checkmark-outline" size={18} color={colors.text} />
                    <Text style={styles.sourcesTitle}>Fuentes oficiales</Text>
                </View>
                <Text style={styles.sourcesIntro}>
                    Comprueba siempre cualquier información directamente en los portales oficiales:
                </Text>
                {OFFICIAL_PORTALS.map((source) => (
                    <TouchableOpacity
                        key={source.id}
                        style={styles.sourceRow}
                        onPress={() => openSource(source.url)}
                        accessibilityRole="link"
                        accessibilityLabel={`Abrir ${source.label}: ${source.url}`}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="open-outline" size={15} color={colors.primary} />
                        <View style={styles.sourceTextWrap}>
                            <Text style={styles.sourceLabel}>{source.label}</Text>
                            <Text style={styles.sourceUrl}>{source.url}</Text>
                        </View>
                    </TouchableOpacity>
                ))}
            </View>

            <Text style={styles.footer}>{INDEPENDENCE_DISCLAIMER}</Text>
        </LegalScreen>
    );
}

const getStyles = createThemedStyles((colors) => StyleSheet.create({
    box: {
        backgroundColor: colors.warningBackground,
        borderLeftWidth: 4,
        borderLeftColor: colors.warning,
        padding: 12,
        marginTop: 4,
        marginBottom: 12,
        borderRadius: 6,
    },
    boxTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: colors.warningText,
        marginBottom: 4,
    },
    boxBody: {
        fontSize: 13,
        color: colors.warningText,
        lineHeight: 19,
    },
    // FASE 2 + FASE 4 — Caja de fuentes oficiales (tarjeta tematizada).
    sourcesBox: {
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 16,
        padding: 14,
        marginBottom: 12,
        gap: 8,
    },
    sourcesHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    sourcesTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.text,
    },
    sourcesIntro: {
        fontSize: 12,
        color: colors.textSecondary,
        lineHeight: 17,
        marginBottom: 2,
    },
    sourceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 8,
        paddingHorizontal: 10,
        borderRadius: 12,
        backgroundColor: colors.chip,
    },
    sourceTextWrap: {
        flex: 1,
    },
    sourceLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.text,
    },
    sourceUrl: {
        fontSize: 11,
        color: colors.primary,
        marginTop: 1,
    },
    footer: {
        fontSize: 12,
        color: colors.textMuted,
        lineHeight: 17,
        marginTop: 8,
    },
}));

