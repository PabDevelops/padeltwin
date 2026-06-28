import { Redirect, Tabs, useRouter } from 'expo-router';
import React from 'react';
import { Platform, View, Pressable, Text, StyleSheet } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { theme } from '@/constants/theme';
import { useSession } from '@/lib/useSession';
import { useProfile } from '@/lib/queries';
import { supabase } from '@/lib/supabase';

function CustomTabBar({ state, descriptors, navigation, bottomInset }: any) {
  const router = useRouter();

  function renderRouteButton(route: any) {
    const index = state.routes.findIndex((r: any) => r.key === route.key);
    const isFocused = state.index === index;

    const onPress = () => {
      const event = navigation.emit({
        type: 'tabPress',
        target: route.key,
        canPreventDefault: true,
      });

      if (!isFocused && !event.defaultPrevented) {
        navigation.navigate(route.name);
      }
    };

    let iconName = '';
    if (route.name === 'home') {
      iconName = isFocused ? 'home' : 'home-outline';
    } else if (route.name === 'index') {
      iconName = isFocused ? 'tennisball' : 'tennisball-outline';
    } else if (route.name === 'partners') {
      iconName = isFocused ? 'people' : 'people-outline';
    } else if (route.name === 'profile') {
      iconName = isFocused ? 'person' : 'person-outline';
    }

    return (
      <Pressable key={route.key} onPress={onPress} style={styles.tabButton}>
        <View style={[styles.iconWrapper, isFocused && styles.activeIconWrapper]}>
          <Ionicons name={iconName as any} size={22} color={isFocused ? theme.accent : '#6E707E'} />
        </View>
      </Pressable>
    );
  }

  const homeRoute = state.routes.find((r: any) => r.name === 'home');
  const indexRoute = state.routes.find((r: any) => r.name === 'index');
  const partnersRoute = state.routes.find((r: any) => r.name === 'partners');
  const profileRoute = state.routes.find((r: any) => r.name === 'profile');

  return (
    <View style={[styles.tabBarContainer, { paddingBottom: bottomInset }]}>
      {/* Solid background bar */}
      <View style={styles.solidBg} />

      {/* Tab Buttons */}
      <View style={styles.buttonsContainer}>
        {homeRoute && renderRouteButton(homeRoute)}
        {indexRoute && renderRouteButton(indexRoute)}

        <Pressable style={styles.tabButton} onPress={() => router.push('/leagues' as any)}>
          <View style={styles.iconWrapper}>
            <View style={styles.leagueTabBadge}>
              <Text style={styles.leagueTabBadgeText}>1</Text>
            </View>
          </View>
        </Pressable>

        <Pressable style={styles.tabButton} onPress={() => router.push('/club-leaderboard' as any)}>
          <View style={styles.iconWrapper}>
            <MaterialCommunityIcons name="crown" size={22} color="#FFD700" />
          </View>
        </Pressable>

        {partnersRoute && renderRouteButton(partnersRoute)}
        {profileRoute && renderRouteButton(profileRoute)}
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
  if (profile?.is_banned) {
    supabase.auth.signOut();
    return null;
  }
  if (!profile?.onboarding_completed) return <Redirect href={'/(onboarding)' as any} />;

  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} bottomInset={bottomInset} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { 
          paddingTop: insets.top, 
          backgroundColor: theme.background,
          paddingBottom: 68 + bottomInset
        },
      }}
    >
      <Tabs.Screen name="home" />
      <Tabs.Screen name="index" />
      <Tabs.Screen name="create-match" />
      <Tabs.Screen name="partners" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
    elevation: 12,
  },
  solidBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#1E1E28', // matching card background color
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  buttonsContainer: {
    flexDirection: 'row',
    height: 68,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  iconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  activeIconWrapper: {
    borderColor: theme.accent,
  },
  leagueTabBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: '#6E707E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  leagueTabBadgeText: { color: '#6E707E', fontWeight: '900', fontSize: 11 },
});
