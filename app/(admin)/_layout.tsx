import { ActivityIndicator, Text, View } from 'react-native';
import { Redirect, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSession } from '@/lib/useSession';
import { useProfile } from '@/lib/queries';
import { theme } from '@/constants/theme';

export default function AdminLayout() {
  const insets = useSafeAreaInsets();
  const { session, loading: sessionLoading } = useSession();
  const { data: profile, isLoading: profileLoading } = useProfile(session?.user.id);

  if (sessionLoading || profileLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={theme.accent} />
      </View>
    );
  }

  if (!session) return <Redirect href="/(auth)/login" />;

  if (!profile?.is_admin) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.background, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Text style={{ color: theme.text, fontWeight: '800', fontSize: 16, textAlign: 'center' }}>
          You don't have access to the admin panel.
        </Text>
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: theme.background },
        headerTintColor: theme.text,
        headerTitleStyle: { fontWeight: '800' as any, fontSize: 16 },
        headerShadowVisible: false,
        contentStyle: { paddingBottom: insets.bottom, backgroundColor: theme.background },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'God Mode' }} />
      <Stack.Screen name="coaches" options={{ title: 'Coach Applications' }} />
      <Stack.Screen name="reports" options={{ title: 'Reports' }} />
      <Stack.Screen name="users" options={{ title: 'Accounts' }} />
      <Stack.Screen name="moderation" options={{ title: 'Content Moderation' }} />
      <Stack.Screen name="chats" options={{ title: 'Chat Moderation' }} />
      <Stack.Screen name="tournaments/index" options={{ title: 'Tournaments' }} />
      <Stack.Screen name="tournaments/[id]" options={{ title: 'Tournament' }} />
    </Stack>
  );
}
