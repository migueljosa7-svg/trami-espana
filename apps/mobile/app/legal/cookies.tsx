import { View, Text, StyleSheet } from 'react-native';
import { APP_NAME, COOKIE_TECHNOLOGIES } from '@trami-espana/shared';
import LegalScreen from '../../components/LegalScreen';
import { useTheme, ThemeColors } from '../../constants/theme';

export default function CookiesScreen() {
    const { colors } = useTheme();
    const styles = getStyles(colors);
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

const getStyles = (colors: ThemeColors) => StyleSheet.create({
    list: {
        marginBottom: 16,
    },
    item: {
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 10,
        padding: 12,
        marginBottom: 8,
    },
    itemType: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 4,
    },
    itemDesc: {
        fontSize: 13,
        color: colors.textSecondary,
        lineHeight: 18,
    },
    notice: {
        backgroundColor: colors.successBackground,
        borderWidth: 1,
        borderColor: colors.successBorder,
        borderRadius: 10,
        padding: 12,
    },
    noticeText: {
        fontSize: 13,
        color: colors.successText,
        lineHeight: 18,
    },
});
