import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { LEGAL_EMAIL_CONTACT, LEGAL_EMAIL_UNVERIFIED_NOTICE, LEGAL_DISCLAIMER } from '@trami-espana/shared';
import LegalScreen from '../../components/LegalScreen';
import { useTheme, ThemeColors } from '../../constants/theme';

export default function ContactoScreen() {
    const { colors } = useTheme();
    const styles = getStyles(colors);
    const openMail = () => {
        Linking.openURL(`mailto:${LEGAL_EMAIL_CONTACT}`).catch(() => {});
    };

    return (
        <LegalScreen
            title="Contacto"
            subtitle="Preguntas, sugerencias o ejercicio de tus derechos."
            footer={LEGAL_DISCLAIMER}
        >
            <View style={styles.card}>
                <Text style={styles.label}>Correo de contacto</Text>
                <TouchableOpacity onPress={openMail} accessibilityRole="link">
                    <Text style={styles.email}>{LEGAL_EMAIL_CONTACT}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.button} onPress={openMail} accessibilityRole="button">
                    <Text style={styles.buttonText}>Enviar correo</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.notice}>
                <Text style={styles.noticeText}>{LEGAL_EMAIL_UNVERIFIED_NOTICE}</Text>
            </View>

            <Text style={styles.info}>
                Para ejercer tus derechos de acceso, rectificación, supresión, oposición, limitación y
                portabilidad, escribe al correo de contacto indicando tu solicitud.
            </Text>
        </LegalScreen>
    );
}

const getStyles = (colors: ThemeColors) => StyleSheet.create({
    card: {
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
    },
    label: {
        fontSize: 13,
        color: colors.textSecondary,
        marginBottom: 4,
    },
    email: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.primary,
        textDecorationLine: 'underline',
        marginBottom: 12,
    },
    button: {
        backgroundColor: colors.primary,
        borderRadius: 10,
        paddingVertical: 12,
        alignItems: 'center',
    },
    buttonText: {
        color: '#ffffff',
        fontWeight: '600',
        fontSize: 14,
    },
    notice: {
        backgroundColor: colors.warningBackground,
        borderWidth: 1,
        borderColor: colors.warningBorder,
        borderRadius: 10,
        padding: 12,
        marginBottom: 16,
    },
    noticeText: {
        fontSize: 12,
        color: colors.warningText,
        lineHeight: 17,
    },
    info: {
        fontSize: 13,
        color: colors.textSecondary,
        lineHeight: 19,
    },
});
