import React from 'react';
import {
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../constants/theme';

export interface ExitConfirmationModalProps {
    visible: boolean;
    onCancel: () => void;
    onConfirm: () => void;
}

/**
 * Modal accesible y tematizado de confirmación de salida de la aplicación.
 * Implementa soporte statusBarTranslucent respetando los insets del dispositivo
 * (muescas, notch y barras de navegación por gestos).
 */
export const ExitConfirmationModal: React.FC<ExitConfirmationModalProps> = ({
    visible,
    onCancel,
    onConfirm,
}) => {
    const { t } = useTranslation();
    const { colors } = useTheme();
    const insets = useSafeAreaInsets();

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            statusBarTranslucent
            onRequestClose={onCancel}
        >
            <View
                style={[
                    styles.overlay,
                    {
                        backgroundColor: colors.overlay,
                        paddingTop: insets.top,
                        paddingBottom: insets.bottom,
                    },
                ]}
            >
                <View
                    style={[
                        styles.card,
                        {
                            backgroundColor: colors.card,
                            borderColor: colors.border,
                        },
                    ]}
                >
                    <View
                        style={[
                            styles.iconWrap,
                            { backgroundColor: colors.primarySoft },
                        ]}
                    >
                        <Ionicons name="log-out-outline" size={30} color={colors.primary} />
                    </View>

                    <Text style={[styles.title, { color: colors.text }]}>
                        {t('exitApp.title')}
                    </Text>

                    <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                        {t('exitApp.subtitle')}
                    </Text>

                    <View style={styles.actions}>
                        <TouchableOpacity
                            style={[
                                styles.button,
                                styles.cancelButton,
                                { backgroundColor: colors.chip },
                            ]}
                            onPress={onCancel}
                            activeOpacity={0.8}
                            accessibilityRole="button"
                            accessibilityLabel={t('exitApp.cancel')}
                        >
                            <Text style={[styles.cancelText, { color: colors.text }]}>
                                {t('exitApp.cancel')}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                styles.button,
                                styles.exitButton,
                                { backgroundColor: colors.danger },
                            ]}
                            onPress={onConfirm}
                            activeOpacity={0.8}
                            accessibilityRole="button"
                            accessibilityLabel={t('exitApp.exit')}
                        >
                            <Ionicons name="exit-outline" size={16} color="#ffffff" />
                            <Text style={styles.exitText}>
                                {t('exitApp.exit')}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
        overlay: {
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 32,
        },
        card: {
            width: '100%',
            maxWidth: 400,
            borderRadius: 22,
            borderWidth: 1,
            paddingHorizontal: 22,
            paddingTop: 24,
            paddingBottom: 20,
            alignItems: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.25,
            shadowRadius: 16,
            elevation: 12,
        },
        iconWrap: {
            width: 60,
            height: 60,
            borderRadius: 30,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 14,
        },
        title: {
            fontSize: 17,
            fontWeight: '700',
            textAlign: 'center',
            lineHeight: 24,
        },
        subtitle: {
            fontSize: 14,
            textAlign: 'center',
            lineHeight: 20,
            marginTop: 6,
            marginBottom: 20,
        },
        actions: {
            flexDirection: 'row',
            width: '100%',
            gap: 10,
        },
        button: {
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            paddingVertical: 12,
            borderRadius: 12,
        },
        cancelButton: {},
        exitButton: {},
        cancelText: {
            fontSize: 15,
            fontWeight: '600',
        },
        exitText: {
            fontSize: 15,
            fontWeight: '700',
            color: '#ffffff',
        },
    });

export default ExitConfirmationModal;
