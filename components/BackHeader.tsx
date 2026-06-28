import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/constants/theme';

export function BackHeader({ title }: { title: string }) {
  const router = useRouter();
  return (
    <View style={styles.row}>
      <Pressable style={styles.backBtn} onPress={() => router.back()}>
        <Ionicons name="chevron-back" size={20} color={theme.text} />
      </Pressable>
      <Text style={styles.title}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingTop: 16 },
  backBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { color: theme.text, fontSize: 13, fontWeight: '900', letterSpacing: 0.5, textTransform: 'uppercase' },
});
