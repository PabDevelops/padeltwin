import { StyleSheet, Text, View } from 'react-native';
import { theme } from '@/constants/theme';

export function ProBadge({ size = 'md' }: { size?: 'sm' | 'md' }) {
  return (
    <View style={[styles.badge, size === 'sm' && styles.badgeSm]}>
      <Text style={[styles.text, size === 'sm' && styles.textSm]}>PRO</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    backgroundColor: theme.accent,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginLeft: 6,
  },
  badgeSm: { paddingHorizontal: 5, paddingVertical: 1.5, marginLeft: 4 },
  text: { color: '#fff', fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
  textSm: { fontSize: 8 },
});
