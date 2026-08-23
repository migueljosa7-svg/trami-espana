import { View, Text, StyleSheet } from 'react-native';
import { APP_NAME, COOKIE_TECHNOLOGIES } from '@trami-espana/shared';
import LegalScreen from '../../components/LegalScreen';

export default function CookiesScreen() {
    return (
        <LegalScreen
            title="Política de cookies y tecnologías"
            subtitle="Tecnologías de almacenamiento que utiliza la aplicación."
            sections={[
                {
                    title: '1. ¿Qué usamos?',
                    body:
                        `${APP_NAME} no utiliza cookies de marketing, publicidad ni trackers de terceros. ` +
                        'Solo empleamos tecnologías técnicas necesarias para el funcionamiento del servicio ' +
                        '(sesión y preferencias), mediante almacenamiento local (localStorage en web / almacenamiento propio en la app móvil).',
                },
            ]}
        >
            <View style={styles.list}>
                {COOKIE_TECHNOLOGIES.map((t) => (
                    <View key={t.type} style={styles.item}>
                        <Text style={styles.itemType}>
                            {t.type}
                            {t.essential ? '  ·  Esencial' : t.tracker ? '  ·  No esencial' : '  ·  No utilizado'}
                        </Text>
                        <Text style={styles.itemDesc}>{t.described}</Text>
                    </View>
                ))}
            </View>

            <View style={styles.notice}>
                <Text style={styles.noticeText}>
                    Dado que no hay análisis, publicidad ni tracking de terceros, no se muestra un banner
                    de consentimiento de cookies. Puedes borrar el almacenamiento local desde los ajustes
                    de tu navegador o dispositivo.
                </Text>
            </View>
        </LegalScreen>
    );
}

const styles = StyleSheet.create({
    list: {
        marginBottom: 16,
    },
    item: {
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 10,
        padding: 12,
        marginBottom: 8,
    },
    itemType: {
        fontSize: 13,
        fontWeight: '600',
        color: '#0f172a',
        marginBottom: 4,
    },
    itemDesc: {
        fontSize: 13,
        color: '#475569',
        lineHeight: 18,
    },
    notice: {
        backgroundColor: '#ecfdf5',
        borderWidth: 1,
        borderColor: '#a7f3d0',
        borderRadius: 10,
        padding: 12,
    },
    noticeText: {
        fontSize: 13,
        color: '#065f46',
        lineHeight: 18,
    },
});
