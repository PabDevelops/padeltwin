import { Platform, StyleSheet, Text, TextStyle, TouchableOpacity, View, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';

interface GlassButtonProps {
  onPress: () => void;
  title: string;
  variant?: 'primary' | 'secondary';
  style?: ViewStyle | ViewStyle[];
  textStyle?: TextStyle;
  icon?: React.ReactNode;
}

export function GlassButton({ onPress, title, variant = 'primary', style, textStyle, icon }: GlassButtonProps) {
  if (variant === 'primary') {
    return (
      <TouchableOpacity style={[styles.primaryButton, style]} onPress={onPress} activeOpacity={0.8}>
        <View style={styles.content}>
          {icon && <View style={styles.iconContainer}>{icon}</View>}
          <Text style={[styles.primaryText, textStyle]}>{title}</Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity style={[styles.secondaryButton, style]} onPress={onPress} activeOpacity={0.7}>
      {Platform.OS !== 'web' ? <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} /> : null}
      <View style={styles.secondaryGlassOverlay} />
      <View style={[styles.content, { paddingVertical: 14 }]}>
        {icon && <View style={styles.iconContainer}>{icon}</View>}
        <Text style={[styles.secondaryText, textStyle]}>{title}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  content: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  iconContainer: { marginRight: 8 },
  primaryButton: {
    backgroundColor: '#C6FF33',
    borderRadius: 30,
    paddingVertical: 14,
    paddingHorizontal: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#C6FF33',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryText: { color: '#0B0C10', fontSize: 16, fontWeight: 'bold', letterSpacing: 0.5 },
  secondaryButton: {
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      web: { backdropFilter: 'blur(15px)', WebkitBackdropFilter: 'blur(15px)' } as any,
    }),
  },
  secondaryGlassOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255, 255, 255, 0.02)' },
  secondaryText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600', letterSpacing: 0.5 },
});
