import { Redirect, Tabs, useRouter } from 'expo-router';
import { Platform, View, Pressable, StyleSheet } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { theme } from '@/constants/theme';
import { useSession } from '@/lib/useSession';
import { useProfile } from '@/lib/queries';
import { supabase } from '@/lib/supabase';

function CustomTabBar({ state, descriptors, navigation, bottomInset }: any) {
  const router = useRouter();
  const currentRouteName = state.routes[state.index]?.name ?? '';
  const isLeaguesFocused = currentRouteName.startsWith('leagues/') || currentRouteName === 'club-leaderboard';

  function tabBtn(routeName: string, icon: string, iconFocused: string) {
    const route = state.routes.find((r: any) => r.name === routeName);
    if (!route) return null;
    const idx = state.routes.findIndex((r: any) => r.key === route.key);
    const focused = state.index === idx;
    const onPress = () => {
      const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
      if (!focused && !event.defaultPrevented) navigation.navigate(routeName);
    };
    return (
      <Pressable key={routeName} onPress={onPress} style={styles.tabButton}>
        <View style={styles.iconWrapper}>
          <Ionicons name={(focused ? iconFocused : icon) as any} size={22} color={focused ? theme.accent : '#6E707E'} />
        </View>
      </Pressable>
    );
  }

  return (
    <View style={[styles.tabBarWrapper, { paddingBottom: bottomInset }]}>
      <View style={styles.buttonsContainer}>
        {tabBtn('home',     'home-outline',       'home'      )}
        {tabBtn('index',    'tennisball-outline',  'tennisball')}

        {/* Leagues */}
        <Pressable style={styles.tabButton} onPress={() => router.push('/leagues' as any)}>
          <View style={styles.iconWrapper}>
            <MaterialCommunityIcons name="podium" size={22} color={isLeaguesFocused ? theme.accent : '#6E707E'} />
          </View>
        </Pressable>

        {tabBtn('partners', 'people-outline', 'people')}
        {tabBtn('profile',  'person-outline', 'person')}

        {/* Messages — last */}
        {tabBtn('messages', 'chatbubble-outline', 'chatbubble')}
      </View>
    </View>
  );
}

export default function TabLayout() {
  const { session, loading } = useSession();
  const { data: profile, isLoading: profileLoading } = useProfile(session?.user.id);
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, Platform.OS === 'android' ? 16 : 0);

  if (loading || (session && profileLoading)) return null;
  if (!session) return <Redirect href="/(auth)/login" />;
  if (session && !profile) { supabase.auth.signOut(); return null; }
  if (profile?.is_banned) { supabase.auth.signOut(); return null; }
  if (!profile?.onboarding_completed) return <Redirect href={'/(onboarding)' as any} />;

  return (
    <Tabs
      initialRouteName="home"
      tabBar={(props) => <CustomTabBar {...props} bottomInset={bottomInset} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: theme.background } }}
    >
      <Tabs.Screen name="home" />
      <Tabs.Screen name="index" />
      <Tabs.Screen name="create-match" />
      <Tabs.Screen name="partners" />
      <Tabs.Screen name="profile" />
      <Tabs.Screen name="messages" />
      <Tabs.Screen name="leagues/index"    options={{ href: null }} />
      <Tabs.Screen name="leagues/country"  options={{ href: null }} />
      <Tabs.Screen name="club-leaderboard" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarWrapper: {
    position: 'absolute',
    left: 0, right: 0, bottom: 0,
    backgroundColor: theme.nav,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.1, shadowRadius: 4 },
      android: { elevation: 8 },
    }),
  },
  buttonsContainer: {
    flexDirection: 'row', height: 60,
    alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 6,
  },
  tabButton: { flex: 1, alignItems: 'center', justifyContent: 'center', height: '100%' },
  iconWrapper: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});
