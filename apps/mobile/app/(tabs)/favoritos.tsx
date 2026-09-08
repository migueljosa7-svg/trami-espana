import { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, useWindowDimensions } from 'react-native';
import { Link } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { authService, favoriteService, FavoriteWithProcedure } from '@trami-espana/shared';
import { cacheFavorites, readCachedFavorites } from '../../src/localCache';
import { useTheme } from '../../constants/theme';

export default function FavoritesScreen() {
    const { colors } = useTheme();
    const { width } = useWindowDimensions();
    const isTablet = width >= 768;
    const [favorites, setFavorites] = useState<FavoriteWithProcedure[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const loadFavs = useCallback(async () => {
        setIsLoading(true);
        try {
            const currentUser = await authService.getCurrentUser();

            if (!currentUser) {
                // Modo invitado: cargar favoritos locales de AsyncStorage.
                const cached = await readCachedFavorites<FavoriteWithProcedure[]>([]);
                setFavorites(Array.isArray(cached) ? cached : []);
                return;
            }

            const data = await favoriteService.getFavorites();
            if (data) {
                setFavorites(data);
                await cacheFavorites(data);
            } else {
                setFavorites([]);
            }
        } catch {
            // Error controlado: intentar cargar caché local como fallback.
            try {
                const cached = await readCachedFavorites<FavoriteWithProcedure[]>([]);
                setFavorites(Array.isArray(cached) ? cached : []);
            } catch {
                setFavorites([]);
            }
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Carga inicial
    useEffect(() => {
        void loadFavs();
    }, [loadFavs]);

    // Sincronización en tiempo real: recargar al recibir foco la pantalla.
    useFocusEffect(
        useCallback(() => {
            void loadFavs();
        }, [loadFavs])
    );

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Mis Favoritos</Text>
                <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>Trámites guardados para acceso rápido</Text>
            </View>

            {isLoading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : favorites.length === 0 ? (
                <View style={styles.emptyState}>
                    <Text style={styles.emptyIcon}>💙</Text>
                    <Text style={[styles.emptyTitle, { color: colors.text }]}>No tienes trámites guardados</Text>
                    <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                        Guarda tus trámites más consultados para acceder a ellos rápidamente.
                    </Text>
                    <Link href="/(tabs)/buscar" asChild>
                        <TouchableOpacity style={[styles.browseButton, { backgroundColor: colors.primary }]}>
                            <Text style={styles.browseButtonText}>Explorar trámites</Text>
                        </TouchableOpacity>
                    </Link>
                </View>
            ) : (
                <ScrollView style={styles.list} contentContainerStyle={{ padding: isTablet ? 32 : 16 }}>
                    {favorites.map((item) => (
                        <Link key={item.id} href={`/procedure/${item.procedure.slug}`} asChild>
                            <TouchableOpacity style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]} accessibilityLabel={`Favorito: ${item.procedure.title}`}>
                                <View style={styles.cardHeader}>
                                    <Text style={[styles.cardScope, { color: colors.primary, backgroundColor: colors.primarySoft }]}>{item.procedure.scope.toUpperCase()}</Text>
                                    <TouchableOpacity
                                        onPress={() => {
                                            void (async () => {
                                                try {
                                                    const currentUser = await authService.getCurrentUser();
                                                    if (!currentUser) {
                                                        // Modo invitado: eliminar de caché local
                                                        type CachedFav = { procedure?: { id: string }; id: string };
                                                        const cached = await readCachedFavorites<CachedFav[]>([]);
                                                        const favs: CachedFav[] = Array.isArray(cached) ? cached : [];
                                                        const updated = favs.filter((f) => f.procedure?.id !== item.procedure?.id && f.id !== item.procedure?.id);
                                                        await cacheFavorites(updated);
                                                    } else {
                                                        // Usuario autenticado: eliminar de Supabase
                                                        await favoriteService.removeFavorite(item.procedure.id);
                                                    }
                                                    void loadFavs();
                                                } catch {
                                                    // Silencioso
                                                }
                                            })();
                                        }}
                                        style={styles.removeBtn}
                                    >
                                        <Ionicons name="heart" size={20} color={colors.danger} />
                                    </TouchableOpacity>
                                </View>
                                <Text style={[styles.cardTitle, { color: colors.text }]}>{item.procedure.title}</Text>
                                <Text style={[styles.cardDesc, { color: colors.textSecondary }]} numberOfLines={2}>
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
    },
    header: {
        paddingTop: 48,
        paddingHorizontal: 16,
        paddingBottom: 16,
        borderBottomWidth: 1,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    headerSubtitle: {
        fontSize: 12,
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
        marginBottom: 8
    },
    emptySubtitle: {
        fontSize: 13,
        textAlign: 'center',
        marginBottom: 20
    },
    browseButton: {
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
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    cardScope: {
        fontSize: 11,
        fontWeight: '700',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    removeBtn: {
        padding: 4,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    cardDesc: {
        fontSize: 13,
    }
});
