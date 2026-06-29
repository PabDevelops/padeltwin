import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { theme } from '@/constants/theme';

interface GlassCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
}

export function GlassCard({ children, style, contentStyle }: GlassCardProps) {
  return (
    <View style={[styles.container, style]}>
      <View style={[styles.content, contentStyle]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.card,
    borderRadius: 0,
    overflow: 'hidden',
  },
  content: {
    padding: 16,
  },
});
