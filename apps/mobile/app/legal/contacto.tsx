import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { LEGAL_EMAIL_CONTACT, LEGAL_EMAIL_UNVERIFIED_NOTICE, LEGAL_DISCLAIMER } from '@trami-espana/shared';
import LegalScreen from '../../components/LegalScreen';

export default function ContactoScreen() {
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

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
    },
    label: {
        fontSize: 13,
        color: '#64748b',
        marginBottom: 4,
    },
    email: {
        fontSize: 16,
        fontWeight: '600',
        color: '#2563eb',
        textDecorationLine: 'underline',
        marginBottom: 12,
    },
    button: {
        backgroundColor: '#2563eb',
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
        backgroundColor: '#fef3c7',
        borderWidth: 1,
        borderColor: '#fde68a',
        borderRadius: 10,
        padding: 12,
        marginBottom: 16,
    },
    noticeText: {
        fontSize: 12,
        color: '#92400e',
        lineHeight: 17,
    },
    info: {
        fontSize: 13,
        color: '#475569',
        lineHeight: 19,
    },
});
