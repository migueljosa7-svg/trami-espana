import { Text, View, StyleSheet } from 'react-native';
import { TERMS_SECTIONS, sanitizeLegalText, ASSISTANT_DISCLAIMER, LEGAL_DISCLAIMER, LEGAL_PENDING_NOTICE } from '@trami-espana/shared';
import LegalScreen, { LegalSection } from '../../components/LegalScreen';
import { useTheme, createThemedStyles } from '../../constants/theme';

export default function TermsScreen() {
    // FASE 4 — Tematización estricta: la caja del asistente usa los
    // tokens `warning*` del design system (antes `#fffbeb` fijo rompía
    // el modo oscuro con un salto cromático claro sobre fondo oscuro).
    const { colors } = useTheme();
    const styles = getStyles(colors);

    const sections: LegalSection[] = TERMS_SECTIONS.map((s) => ({
        title: s.title,
        body: sanitizeLegalText(s.body),
    }));

    return (
        <LegalScreen
            title="Términos y condiciones"
            subtitle="Condiciones de uso del servicio Trami España."
            notice={LEGAL_PENDING_NOTICE}
            sections={sections}
        >
            <View style={styles.aiBox}>
                <Text style={styles.aiTitle}>Sobre el asistente de IA</Text>
                <Text style={styles.aiBody}>{ASSISTANT_DISCLAIMER}</Text>
            </View>
            <Text style={styles.footer}>{LEGAL_DISCLAIMER}</Text>
        </LegalScreen>
    );
}

const getStyles = createThemedStyles((colors) => StyleSheet.create({
    aiBox: {
        backgroundColor: colors.warningBackground,
        borderLeftWidth: 4,
        borderLeftColor: colors.warning,
        padding: 12,
        marginTop: 4,
        marginBottom: 12,
        borderRadius: 6,
    },
    aiTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: colors.warningText,
        marginBottom: 4,
    },
    aiBody: {
        fontSize: 13,
        color: colors.warningText,
        lineHeight: 19,
    },
    footer: {
        fontSize: 12,
        color: colors.textMuted,
        lineHeight: 17,
        marginTop: 8,
    },
}));
