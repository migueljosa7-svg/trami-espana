import { View, Text, ScrollView, TouchableOpacity, StyleSheet, useWindowDimensions } from 'react-native';
import { Link } from 'expo-router';
import { PROCEDURE_CATEGORIES } from '@trami-espana/shared';
import { useTheme } from '../../constants/theme';

export default function HomeScreen() {
    const { colors } = useTheme();
    const { width } = useWindowDimensions();
    const isTablet = width >= 768;
    const cardWidth = isTablet ? '31%' : '48%';

    return (
        <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.scrollContent}>
            <View style={[styles.content, { paddingHorizontal: isTablet ? 32 : 16 }]}>
                {/* Banner Disclaimer */}
                <View style={[styles.disclaimerBanner, { backgroundColor: colors.warningBackground, borderColor: colors.warningBorder }]}>
                    <Text style={[styles.disclaimerText, { color: colors.warningText }]}>
                        ⚠️ Trami España es un servicio independiente y no está afiliado ni respaldado por el Gobierno de España.
                    </Text>
                </View>

                {/* Hero Section */}
                <View style={styles.hero}>
                    <Text style={styles.heroTitle}>
                        Encuentra trámites{'\n'}administrativos
                    </Text>
                    <Text style={styles.heroSubtitle}>
                        Guía clara y sencilla para entender trámites con la administración pública española
                    </Text>
                    <Link href="/(tabs)/buscar" asChild>
                        <TouchableOpacity style={styles.heroButton} activeOpacity={0.8}>
                            <Text style={styles.heroButtonText}>
                                Buscar trámites
                            </Text>
                        </TouchableOpacity>
                    </Link>
                </View>

                {/* Categories Section */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Categorías principales</Text>
                    <View style={styles.categoriesGrid}>
                        {PROCEDURE_CATEGORIES.slice(0, 6).map((category) => (
                            <Link
                                key={category.id}
                                href={`/(tabs)/buscar?categoria=${category.slug}`}
                                asChild
                            >
                                <TouchableOpacity style={[styles.categoryCard, { backgroundColor: colors.card, borderColor: colors.border, width: cardWidth }]} activeOpacity={0.7}>
                                    <Text style={styles.categoryIcon}>{category.icon}</Text>
                                    <Text style={[styles.categoryName, { color: colors.textSecondary }]}>
                                        {category.name}
                                    </Text>
                                </TouchableOpacity>
                            </Link>
                        ))}
                    </View>
                </View>

                {/* Quick Assistant Callout */}
                <View style={[styles.assistantCallout, { backgroundColor: colors.primarySoft, borderColor: colors.primary }]}>
                    <Text style={[styles.assistantCalloutTitle, { color: colors.primary }]}>🤖 ¿Dudas con un trámite?</Text>
                    <Text style={[styles.assistantCalloutDesc, { color: colors.primary }]}>
                        Pregunta a nuestro Asistente de IA. Orientación rápida con información oficial validada.
                    </Text>
                    <Link href="/(tabs)/asistente" asChild>
                        <TouchableOpacity style={styles.assistantButton} activeOpacity={0.8}>
                            <Text style={styles.assistantButtonText}>Abrir Asistente</Text>
                        </TouchableOpacity>
                    </Link>
                </View>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
    },
    content: {
        paddingTop: 48,
        paddingBottom: 80,
    },
    disclaimerBanner: {
        borderWidth: 1,
        borderRadius: 10,
        padding: 10,
        marginBottom: 16
    },
    disclaimerText: {
        fontSize: 12,
        lineHeight: 16
    },
    hero: {
        backgroundColor: '#2563eb',
        borderRadius: 16,
        padding: 20,
        marginBottom: 20
    },
    heroTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#ffffff',
        marginBottom: 8
    },
    heroSubtitle: {
        fontSize: 14,
        color: '#dbeafe',
        marginBottom: 16,
        lineHeight: 20
    },
    heroButton: {
        backgroundColor: '#ffffff',
        borderRadius: 10,
        paddingVertical: 12,
        paddingHorizontal: 20,
        alignSelf: 'flex-start'
    },
    heroButtonText: {
        color: '#2563eb',
        fontWeight: '600',
        fontSize: 14
    },
    section: {
        marginBottom: 20
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 12
    },
    categoriesGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10
    },
    categoryCard: {
        borderWidth: 1,
        borderRadius: 16,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 2,
        minHeight: 100,
        justifyContent: 'center',
    },
    categoryIcon: {
        fontSize: 24,
        marginBottom: 6
    },
    categoryName: {
        fontSize: 13,
        fontWeight: '600',
        lineHeight: 18,
        textAlign: 'center',
        flexWrap: 'wrap',
    },
    assistantCallout: {
        borderRadius: 16,
        padding: 18,
        borderWidth: 1,
        marginBottom: 24
    },
    assistantCalloutTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 6
    },
    assistantCalloutDesc: {
        fontSize: 13,
        marginBottom: 12,
        lineHeight: 18
    },
    assistantButton: {
        backgroundColor: '#2563eb',
        borderRadius: 8,
        paddingVertical: 10,
        paddingHorizontal: 16,
        alignSelf: 'flex-start'
    },
    assistantButtonText: {
        color: '#ffffff',
        fontWeight: '600',
        fontSize: 13
    }
});
