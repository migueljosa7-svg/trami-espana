import { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../constants/theme';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: object;
}

export function SkeletonItem({ width = '100%', height = 20, borderRadius = 8, style }: SkeletonProps) {
  const { isDark } = useTheme();
  const animValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(animValue, {
          toValue: 1,
          duration: 800,
          useNativeDriver: false,
        }),
        Animated.timing(animValue, {
          toValue: 0,
          duration: 800,
          useNativeDriver: false,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [animValue]);

  const opacity = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  const baseColor = isDark ? '#1b2740' : '#e2e8f0';
  const highlightColor = isDark ? '#243044' : '#f1f5f9';

  return (
    <Animated.View style={[{ width, height, borderRadius, overflow: 'hidden' }, style, { opacity }]}>
      <LinearGradient
        colors={[baseColor, highlightColor, baseColor]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={StyleSheet.absoluteFill}
      />
    </Animated.View>
  );
}

export function SkeletonCard() {
  return (
    <View style={styles.card}>
      <SkeletonItem width="60%" height={18} borderRadius={6} style={{ marginBottom: 10 }} />
      <SkeletonItem width="90%" height={14} borderRadius={6} style={{ marginBottom: 6 }} />
      <SkeletonItem width="75%" height={14} borderRadius={6} style={{ marginBottom: 6 }} />
      <SkeletonItem width="40%" height={14} borderRadius={6} />
    </View>
  );
}

export function SkeletonProcedureDetail() {
  return (
    <View style={styles.container}>
      <SkeletonItem width="80%" height={24} borderRadius={8} style={{ marginBottom: 16 }} />
      <SkeletonItem width="50%" height={16} borderRadius={6} style={{ marginBottom: 20 }} />
      <SkeletonItem width="100%" height={14} borderRadius={6} style={{ marginBottom: 8 }} />
      <SkeletonItem width="95%" height={14} borderRadius={6} style={{ marginBottom: 8 }} />
      <SkeletonItem width="85%" height={14} borderRadius={6} style={{ marginBottom: 20 }} />
      <SkeletonItem width="100%" height={60} borderRadius={12} style={{ marginBottom: 16 }} />
      <SkeletonItem width="100%" height={60} borderRadius={12} style={{ marginBottom: 16 }} />
      <SkeletonItem width="100%" height={60} borderRadius={12} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    marginBottom: 12,
    borderRadius: 14,
  },
  container: {
    padding: 16,
  },
});
