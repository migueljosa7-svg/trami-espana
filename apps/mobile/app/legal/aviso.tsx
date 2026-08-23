import { Text, View, StyleSheet } from 'react-native';
import { LEGAL_DISCLAIMER, INDEPENDENCE_DISCLAIMER, ASSISTANT_DISCLAIMER } from '@trami-espana/shared';
import LegalScreen from '../../components/LegalScreen';

export default function AvisoScreen() {
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
            <Text style={styles.footer}>{INDEPENDENCE_DISCLAIMER}</Text>
        </LegalScreen>
    );
}

const styles = StyleSheet.create({
    box: {
        backgroundColor: '#fffbeb',
        borderLeftWidth: 4,
        borderLeftColor: '#f59e0b',
        padding: 12,
        marginTop: 4,
        marginBottom: 12,
        borderRadius: 6,
    },
    boxTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: '#78350f',
        marginBottom: 4,
    },
    boxBody: {
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
