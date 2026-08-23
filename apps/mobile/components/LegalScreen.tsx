import React from 'react';
import { ScrollView, View, Text, StyleSheet } from 'react-native';

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

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    contentContainer: {
        padding: 20,
        paddingTop: 24,
        paddingBottom: 48,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#0f172a',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 13,
        color: '#64748b',
        marginBottom: 16,
        lineHeight: 18,
    },
    noticeBox: {
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
    section: {
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#0f172a',
        marginBottom: 6,
    },
    sectionBody: {
        fontSize: 14,
        color: '#334155',
        lineHeight: 21,
    },
    footer: {
        fontSize: 12,
        color: '#94a3b8',
        lineHeight: 17,
        marginTop: 12,
    },
});
