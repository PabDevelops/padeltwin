import { Redirect } from 'expo-router';
import { useSession } from '@/lib/useSession';
import { useProfile } from '@/lib/queries';

export default function Index() {
  const { session, loading } = useSession();
  const { data: profile, isLoading: profileLoading } = useProfile(session?.user.id);

  if (loading || (session && profileLoading)) return null;
  if (!session) return <Redirect href="/(auth)/login" />;
  if (!profile?.onboarding_completed) return <Redirect href={'/(onboarding)' as any} />;
  return <Redirect href="/(tabs)" />;
}
