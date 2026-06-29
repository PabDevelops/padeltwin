import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, Pressable, Image, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';
import { Profile } from '@/types/database';
import { theme } from '@/constants/theme';
import { GlassCard } from '@/components/GlassCard';
import { CoachBadge } from '@/components/CoachBadge';

export default function SearchScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');

  const { data: results, isLoading } = useQuery({
    queryKey: ['searchUsers', query],
    queryFn: async () => {
      if (!query.trim()) return [];
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .ilike('full_name', `%${query}%`)
        .limit(20);
      if (error) throw error;
      return data as Profile[];
    },
    enabled: query.length > 1,
  });

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color="#FFF" />
        </Pressable>
        <TextInput
          style={styles.searchInput}
          placeholder="Search players..."
          placeholderTextColor="rgba(255,255,255,0.4)"
          value={query}
          onChangeText={setQuery}
          autoFocus
          returnKeyType="search"
        />
      </View>

      {isLoading && query.length > 1 && (
        <ActivityIndicator color={theme.primary} style={{ marginTop: 24 }} />
      )}

      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          query.length > 1 && !isLoading ? (
            <Text style={styles.emptyText}>No players found for "{query}"</Text>
          ) : null
        }
        renderItem={({ item }) => (
          <Pressable onPress={() => router.push(`/player/${item.id}` as any)}>
            {({ pressed }) => (
              <GlassCard style={[styles.userCard, pressed && { opacity: 0.8 }]} contentStyle={styles.userCardContent}>
                {item.avatar_url ? (
                  <Image source={{ uri: item.avatar_url }} style={styles.avatar} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Ionicons name="person" size={24} color="#FFF" />
                  </View>
                )}
                
                <View style={styles.userInfo}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={styles.userName}>{item.full_name || 'Unknown Player'}</Text>
                    {item.is_coach && <CoachBadge size="sm" />}
                  </View>
                  <Text style={styles.userZone}>{item.zone || 'No zone set'} • Level: {item.level || 'Unknown'}</Text>
                </View>

                <View style={styles.eloBadge}>
                  <Text style={styles.eloText}>PS {item.elo || 1200}</Text>
                </View>
              </GlassCard>
            )}
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
    backgroundColor: theme.nav,
  },
  backButton: {
    paddingRight: 12,
  },
  searchInput: {
    flex: 1,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 8,
    paddingHorizontal: 16,
    color: '#FFF',
    fontSize: 16,
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  emptyText: {
    color: theme.textMuted,
    textAlign: 'center',
    marginTop: 32,
    fontSize: 16,
  },
  userCard: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    borderRadius: 8,
  },
  userCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
  },
  userName: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  userZone: {
    color: theme.textMuted,
    fontSize: 12,
    marginTop: 4,
  },
  eloBadge: {
    backgroundColor: 'rgba(198, 255, 51, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  eloText: {
    color: theme.accent,
    fontSize: 12,
    fontWeight: '800',
  },
});
