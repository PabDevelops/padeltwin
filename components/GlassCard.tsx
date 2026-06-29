import { Platform, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { useVisualTheme } from '@/lib/ThemeContext';
import { theme } from '@/constants/theme';

interface GlassCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
}

export function GlassCard({ children, style, contentStyle }: GlassCardProps) {
  const { visualTheme } = useVisualTheme();

  if (visualTheme === 'brutalist') {
    return (
      <View style={[styles.brutalistShadow, style]}>
        <View style={styles.brutalistCard}>
          <View style={[styles.content, contentStyle]}>{children}</View>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <BlurView intensity={25} tint="dark" style={StyleSheet.absoluteFill} />
      <View style={styles.glassOverlay} />
      <View style={[styles.content, contentStyle]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    overflow: 'hidden',
    backgroundColor: Platform.select({
      ios: 'rgba(255, 255, 255, 0.07)',
      android: 'rgba(255, 255, 255, 0.09)',
      web: 'rgba(255, 255, 255, 0.08)',
      default: 'rgba(255, 255, 255, 0.08)',
    }),
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.15, shadowRadius: 12 },
      android: { elevation: 4 },
      web: { backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.3)' } as any,
    }),
  },
  glassOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255, 255, 255, 0.02)' },
  content: { padding: 18 },
  brutalistShadow: {
    backgroundColor: theme.accent,
    borderRadius: 16,
    marginTop: 4,
    marginRight: 4,
  },
  brutalistCard: {
    backgroundColor: '#16171E',
    borderWidth: 2.5,
    borderColor: theme.accent,
    borderRadius: 16,
    transform: [{ translateX: -4 }, { translateY: -4 }],
  },
});
