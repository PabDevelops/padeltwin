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

  const fabRoute = state.routes.find((r: any) => r.name === 'create-match');
  const fabIndex = state.routes.findIndex((r: any) => r.name === 'create-match');

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
          <Ionicons name={iconName as any} size={18} color={isFocused ? '#FFF' : '#6E707E'} />
        </View>
        {isFocused && <View style={styles.activeIndicator} />}
      </Pressable>
    );
  }

  const homeRoute = state.routes.find((r: any) => r.name === 'home');
  const indexRoute = state.routes.find((r: any) => r.name === 'index');
  const partnersRoute = state.routes.find((r: any) => r.name === 'partners');
  const profileRoute = state.routes.find((r: any) => r.name === 'profile');

  return (
    <View style={[styles.tabBarContainer, { paddingBottom: bottomInset }]}>
      {/* Curved/Dipped background shape */}
      <View style={styles.backgroundContainer}>
        {/* Solid background bar */}
        <View style={styles.solidBg} />
        {/* Circular cutout mask matching screen background color */}
        <View style={styles.circularMask} />
      </View>

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

        <View style={styles.centerButtonWrapper}>
          <Pressable
            onPress={() => {
              const event = navigation.emit({
                type: 'tabPress',
                target: fabRoute.key,
                canPreventDefault: true,
              });
              if (state.index !== fabIndex && !event.defaultPrevented) {
                navigation.navigate(fabRoute.name);
              }
            }}
            style={({ pressed }) => [
              styles.centerButton,
              pressed && { opacity: 0.95, transform: [{ scale: 0.96 }] },
            ]}
          >
            <Ionicons name="add" size={26} color={theme.onAccent} />
          </Pressable>
        </View>

        <Pressable style={styles.tabButton} onPress={() => router.push('/club-leaderboard' as any)}>
          <View style={styles.iconWrapper}>
            <MaterialCommunityIcons name="crown" size={18} color="#FFD700" />
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
  backgroundContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    height: 68,
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
  circularMask: {
    position: 'absolute',
    top: -24,
    left: '50%',
    marginLeft: -36,
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: theme.background, // Match screen background '#0B0C10'
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
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeIconWrapper: {
    backgroundColor: '#15161E', // highlighted container for active icon
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  activeIndicator: {
    position: 'absolute',
    bottom: 4,
    width: 14,
    height: 3,
    backgroundColor: theme.primary, // Orange indicator line at the bottom
    borderRadius: 1.5,
  },
  leagueTabBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: '#6E707E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  leagueTabBadgeText: { color: '#6E707E', fontWeight: '900', fontSize: 10 },
  centerButtonWrapper: {
    width: 64,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  centerButton: {
    position: 'absolute',
    top: -14, // Centered perfectly in the circular mask (sharing center coordinate y=12)
    width: 48,
    height: 48,
    borderRadius: 24, // Perfect circle!
    backgroundColor: theme.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, // softer opacity
    shadowRadius: 12, // more blur/diffusion
    elevation: 4,
  },
});
