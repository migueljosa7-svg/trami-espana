import React from 'react';
import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { useTheme, ThemeColors } from '../constants/theme';

export interface LegalSection {
    title: string;
    body: string;
}

interface LegalScreenProps {
    title: string;
    subtitle?: string;
    sections?: LegalSection[];
    notice?: string;
    footer?: string;
    children?: React.ReactNode;
}

/**
 * Componente genérico para las pantallas legales de la app móvil.
 * Renderiza contenido de forma accesible, con headings y texto legible,
 * reutilizando el mismo contenido compartido que la web (packages/shared).
 */
export default function LegalScreen({
    title,
    subtitle,
    sections = [],
    notice,
    footer,
    children,
}: LegalScreenProps) {
    const { colors } = useTheme();
    const styles = getStyles(colors);
    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.contentContainer}
            accessibilityLabel={title}
        >
            <Text style={styles.title}>{title}</Text>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}

            {notice ? (
                <View style={styles.noticeBox}>
                    <Text style={styles.noticeText}>{notice}</Text>
                </View>
            ) : null}

            {sections.map((section) => (
                <View key={section.title} style={styles.section}>
                    <Text style={styles.sectionTitle}>{section.title}</Text>
                    <Text style={styles.sectionBody}>{section.body}</Text>
                </View>
            ))}

            {children}

            {footer ? <Text style={styles.footer}>{footer}</Text> : null}
        </ScrollView>
    );
}

const getStyles = (colors: ThemeColors) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    contentContainer: {
        padding: 20,
        paddingTop: 24,
        paddingBottom: 48,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: colors.text,
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 13,
        color: colors.textSecondary,
        marginBottom: 16,
        lineHeight: 18,
    },
    noticeBox: {
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
    section: {
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 6,
    },
    sectionBody: {
        fontSize: 14,
        color: colors.textSecondary,
        lineHeight: 21,
    },
    footer: {
        fontSize: 12,
        color: colors.textMuted,
        lineHeight: 17,
        marginTop: 12,
    },
});
