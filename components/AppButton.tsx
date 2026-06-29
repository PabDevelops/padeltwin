import { StyleSheet, Text, TextStyle, TouchableOpacity, View, ViewStyle } from 'react-native';
import { useVisualTheme } from '@/lib/ThemeContext';
import { theme } from '@/constants/theme';

interface AppButtonProps {
  onPress: () => void;
  title: string;
  variant?: 'primary' | 'secondary';
  style?: ViewStyle | ViewStyle[];
  textStyle?: TextStyle;
  icon?: React.ReactNode;
}

export function AppButton({ onPress, title, variant = 'primary', style, textStyle, icon }: AppButtonProps) {
  const { visualTheme } = useVisualTheme();

  if (visualTheme === 'brutalist') {
    if (variant === 'primary') {
      return (
        <TouchableOpacity style={[styles.brutalistPrimaryShadow, style]} onPress={onPress} activeOpacity={0.9}>
          <View style={styles.brutalistPrimaryButton}>
            <View style={styles.content}>
              {icon && <View style={styles.iconContainer}>{icon}</View>}
              <Text style={[styles.primaryText, textStyle]}>{title}</Text>
            </View>
          </View>
        </TouchableOpacity>
      );
    }

    return (
      <TouchableOpacity style={[styles.brutalistSecondaryShadow, style]} onPress={onPress} activeOpacity={0.9}>
        <View style={styles.brutalistSecondaryButton}>
          <View style={styles.content}>
            {icon && <View style={styles.iconContainer}>{icon}</View>}
            <Text style={[styles.secondaryText, textStyle]}>{title}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

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
  primaryText: { fontFamily: 'Anton_400Regular', color: '#0B0C10', fontSize: 16, letterSpacing: 0.5 },
  secondaryButton: {
    borderRadius: 30,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: { fontFamily: 'Anton_400Regular', color: '#FFFFFF', fontSize: 16, letterSpacing: 0.5 },
  brutalistPrimaryShadow: {
    backgroundColor: '#000000',
    borderRadius: 12,
    marginTop: 4,
    marginRight: 4,
  },
  brutalistPrimaryButton: {
    backgroundColor: '#C6FF33',
    borderWidth: 2.5,
    borderColor: '#000000',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 28,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ translateX: -4 }, { translateY: -4 }],
  },
  brutalistSecondaryShadow: {
    backgroundColor: '#000000',
    borderRadius: 12,
    marginTop: 4,
    marginRight: 4,
  },
  brutalistSecondaryButton: {
    backgroundColor: '#16171E',
    borderWidth: 2.5,
    borderColor: '#C6FF33',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 28,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ translateX: -4 }, { translateY: -4 }],
  },
});
