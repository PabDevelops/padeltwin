import { Redirect, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSession } from '@/lib/useSession';
import { useProfile } from '@/lib/queries';

export default function AuthLayout() {
  const { session, loading } = useSession();
  const { data: profile, isLoading: profileLoading } = useProfile(session?.user.id);
  const insets = useSafeAreaInsets();

  if (loading || (session && profileLoading)) return null;
  if (session) {
    return <Redirect href={profile?.onboarding_completed ? '/(tabs)' : '/(onboarding)' as any} />;
  }

  return (
    <Stack screenOptions={{ contentStyle: { paddingBottom: insets.bottom } }}>
      <Stack.Screen name="login" options={{ title: 'Log in' }} />
      <Stack.Screen name="register" options={{ title: 'Sign up' }} />
    </Stack>
  );
}
