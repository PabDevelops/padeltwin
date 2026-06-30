import { StyleSheet, Text, TextStyle, TouchableOpacity, View, ViewStyle } from 'react-native';
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
    backgroundColor: theme.primary,
    borderRadius: 30,
    paddingVertical: 14,
    paddingHorizontal: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryText: { fontFamily: 'Anton_400Regular', color: theme.onAccent, fontSize: 16, letterSpacing: 0.5 },
  secondaryButton: {
    borderRadius: 30,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: { fontFamily: 'Anton_400Regular', color: theme.text, fontSize: 16, letterSpacing: 0.5 },
});
