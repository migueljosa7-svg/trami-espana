import { Text, View, StyleSheet } from 'react-native';
import { TERMS_SECTIONS, sanitizeLegalText, ASSISTANT_DISCLAIMER, LEGAL_DISCLAIMER, LEGAL_PENDING_NOTICE } from '@trami-espana/shared';
import LegalScreen, { LegalSection } from '../../components/LegalScreen';

export default function TermsScreen() {
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

const styles = StyleSheet.create({
    aiBox: {
        backgroundColor: '#fffbeb',
        borderLeftWidth: 4,
        borderLeftColor: '#f59e0b',
        padding: 12,
        marginTop: 4,
        marginBottom: 12,
        borderRadius: 6,
    },
    aiTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: '#78350f',
        marginBottom: 4,
    },
    aiBody: {
        fontSize: 13,
        color: '#78350f',
        lineHeight: 19,
    },
    footer: {
        fontSize: 12,
        color: '#94a3b8',
        lineHeight: 17,
        marginTop: 8,
    },
});
