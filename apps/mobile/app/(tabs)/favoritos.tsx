import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { authService, favoriteService, FavoriteWithProcedure } from '@trami-espana/shared';

export default function FavoritesScreen() {
    const router = useRouter();
    const [favorites, setFavorites] = useState<FavoriteWithProcedure[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadFavs = async () => {
            setIsLoading(true);
            try {
                const currentUser = await authService.getCurrentUser();

                // Sin usuario: no tocar Supabase ni servicios. Redirigir a login.
                if (!currentUser) {
                    router.replace('/login');
                    return;
                }

                const data = await favoriteService.getFavorites();
                if (data) setFavorites(data);
            } catch {
                // Error controlado.
            } finally {
                setIsLoading(false);
            }
        };
        loadFavs();
    }, []);

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Mis Favoritos</Text>
                <Text style={styles.headerSubtitle}>Trámites guardados para acceso rápido</Text>
            </View>

            {isLoading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#2563eb" />
                </View>
            ) : favorites.length === 0 ? (
                <View style={styles.emptyState}>
                    <Text style={styles.emptyIcon}>💙</Text>
                    <Text style={styles.emptyTitle}>No tienes trámites guardados</Text>
                    <Text style={styles.emptySubtitle}>
                        Guarda tus trámites más consultados para acceder a ellos rápidamente.
                    </Text>
                    <Link href="/(tabs)/buscar" asChild>
                        <TouchableOpacity style={styles.browseButton}>
                            <Text style={styles.browseButtonText}>Explorar trámites</Text>
                        </TouchableOpacity>
                    </Link>
                </View>
            ) : (
                <ScrollView style={styles.list} contentContainerStyle={{ padding: 16 }}>
                    {favorites.map((item) => (
                        <Link key={item.id} href={`/procedure/${item.procedure.slug}`} asChild>
                            <TouchableOpacity style={styles.card} accessibilityLabel={`Favorito: ${item.procedure.title}`}>
                                <Text style={styles.cardScope}>{item.procedure.scope.toUpperCase()}</Text>
                                <Text style={styles.cardTitle}>{item.procedure.title}</Text>
                                <Text style={styles.cardDesc} numberOfLines={2}>
                                    {item.procedure.short_description}
                                </Text>
                            </TouchableOpacity>
                        </Link>
                    ))}
                </ScrollView>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc'
    },
    header: {
        paddingTop: 48,
        paddingHorizontal: 16,
        paddingBottom: 16,
        backgroundColor: '#ffffff',
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0'
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#0f172a'
    },
    headerSubtitle: {
        fontSize: 12,
        color: '#64748b',
        marginTop: 2
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center'
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24
    },
    emptyIcon: {
        fontSize: 48,
        marginBottom: 16,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#0f172a',
        marginBottom: 8
    },
    emptySubtitle: {
        fontSize: 13,
        color: '#64748b',
        textAlign: 'center',
        marginBottom: 20
    },
    browseButton: {
        backgroundColor: '#2563eb',
        borderRadius: 10,
        paddingVertical: 12,
        paddingHorizontal: 20
    },
    browseButtonText: {
        color: '#ffffff',
        fontWeight: '600',
        fontSize: 14
    },
    list: {
        flex: 1
    },
    card: {
        backgroundColor: '#ffffff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#e2e8f0'
    },
    cardScope: {
        fontSize: 11,
        fontWeight: '700',
        color: '#2563eb',
        marginBottom: 4
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#0f172a',
        marginBottom: 4
    },
    cardDesc: {
        fontSize: 13,
        color: '#475569'
    }
});
