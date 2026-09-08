import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Link } from 'expo-router';
import { PROCEDURE_CATEGORIES } from '@trami-espana/shared';

export default function HomeScreen() {
    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
            <View style={styles.content}>
                {/* Banner Disclaimer */}
                <View style={styles.disclaimerBanner}>
                    <Text style={styles.disclaimerText}>
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
                    <Text style={styles.sectionTitle}>Categorías principales</Text>
                    <View style={styles.categoriesGrid}>
                        {PROCEDURE_CATEGORIES.slice(0, 6).map((category) => (
                            <Link
                                key={category.id}
                                href={`/(tabs)/buscar?categoria=${category.slug}`}
                                asChild
                            >
                                <TouchableOpacity style={styles.categoryCard} activeOpacity={0.7}>
                                    <Text style={styles.categoryIcon}>{category.icon}</Text>
                                    <Text style={styles.categoryName}>
                                        {category.name}
                                    </Text>
                                </TouchableOpacity>
                            </Link>
                        ))}
                    </View>
                </View>

                {/* Quick Assistant Callout */}
                <View style={styles.assistantCallout}>
                    <Text style={styles.assistantCalloutTitle}>🤖 ¿Dudas con un trámite?</Text>
                    <Text style={styles.assistantCalloutDesc}>
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
        backgroundColor: '#f8fafc'
    },
    scrollContent: {
        flexGrow: 1,
    },
    content: {
        padding: 16,
        paddingTop: 48,
        paddingBottom: 80,
    },
    disclaimerBanner: {
        backgroundColor: '#fef3c7',
        borderWidth: 1,
        borderColor: '#fde68a',
        borderRadius: 10,
        padding: 10,
        marginBottom: 16
    },
    disclaimerText: {
        fontSize: 12,
        color: '#92400e',
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
        color: '#0f172a',
        marginBottom: 12
    },
    categoriesGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10
    },
    categoryCard: {
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 16,
        padding: 16,
        width: '48%',
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
        color: '#334155',
        lineHeight: 18,
        textAlign: 'center',
        flexWrap: 'wrap',
    },
    assistantCallout: {
        backgroundColor: '#eff6ff',
        borderRadius: 16,
        padding: 18,
        borderWidth: 1,
        borderColor: '#bfdbfe',
        marginBottom: 24
    },
    assistantCalloutTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1e40af',
        marginBottom: 6
    },
    assistantCalloutDesc: {
        fontSize: 13,
        color: '#3b82f6',
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
