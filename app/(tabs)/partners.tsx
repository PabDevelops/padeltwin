import { useState, useRef, useEffect } from 'react';
import { ActivityIndicator, FlatList, Image, Pressable, StyleSheet, Text, View, Animated, Easing, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSession } from '@/lib/useSession';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useCompatiblePlayers, useProfile, usePartnerRequests, useSendPartnerRequest, useFollowing, useFollowPlayer, useUnfollowPlayer, useFollowedProfiles } from '@/lib/queries';
import { usePartnerSlotMachineCandidates, pickSlotMachineWinner, buildSlotMachineReel } from '@/lib/usePartnerSlotMachine';
import type { PartnerRequestWithProfiles, Profile } from '@/types/database';
import { theme, buttonRadius, cardRadius, chipRadius } from '@/constants/theme';
import { LEVEL_LABELS } from '@/constants/levels';
import { ProBadge } from '@/components/ProBadge';
import { CoachBadge } from '@/components/CoachBadge';
import { GlassCard } from '@/components/GlassCard';

const REEL_ITEM_HEIGHT = 120;

function requestWith(requests: PartnerRequestWithProfiles[], userId: string, otherId: string) {
  return requests.find(
    (r) => (r.from_id === userId && r.to_id === otherId) || (r.from_id === otherId && r.to_id === userId)
  );
}

export default function PartnersScreen() {
  const router = useRouter();
  const { session } = useSession();
  const userId = session?.user.id;
  
  // Data Queries
  const { data: profile } = useProfile(userId);
  const { data: players, isLoading } = useCompatiblePlayers(userId, profile);
  const { data: requests } = usePartnerRequests(userId);
  const sendRequest = useSendPartnerRequest();
  const { data: following } = useFollowing(userId);
  const followPlayer = useFollowPlayer();
  const unfollowPlayer = useUnfollowPlayer();
  const queryClient = useQueryClient();
  const { data: followedProfiles, isLoading: followedLoading } = useFollowedProfiles(userId);

  // Slot Machine Hooks
  const { candidates, isLoading: candidatesLoading } = usePartnerSlotMachineCandidates(userId, profile);

  // UI Navigation State
  const [activeTab, setActiveTab] = useState<'grid' | 'spin' | 'followed'>('grid');

  // Slot Machine Animation States
  const [spinState, setSpinState] = useState<'idle' | 'spinning' | 'finished'>('idle');
  const [winner, setWinner] = useState<Profile | null>(null);
  const [reel, setReel] = useState<Profile[]>([]);
  const spinAnim = useRef(new Animated.Value(0)).current;

  // Spin trigger logic
  const handleSpin = () => {
    if (candidates.length === 0) return;
    
    const win = pickSlotMachineWinner(candidates);
    if (!win) return;

    const newReel = buildSlotMachineReel(candidates, win, 24);
    setReel(newReel);
    setWinner(win);
    setSpinState('spinning');
    spinAnim.setValue(0);

    Animated.timing(spinAnim, {
      toValue: 1,
      duration: 3500,
      easing: Easing.bezier(0.12, 0.8, 0.15, 1),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setSpinState('finished');
      }
    });
  };

  const handleSendRequest = () => {
    if (!userId || !winner) return;
    sendRequest.mutate(
      { fromId: userId, toId: winner.id },
      {
        onSuccess: () => {
          // Reset states and clear winner
          setSpinState('idle');
          setWinner(null);
          setReel([]);
        },
      }
    );
  };

  const handleSpinAgain = () => {
    setSpinState('idle');
    setWinner(null);
    setReel([]);
  };

  const isWinnerFollowing = winner ? following?.has(winner.id) : false;
  const followPending = followPlayer.isPending || unfollowPlayer.isPending;

  const handleWinnerFollowPress = () => {
    if (!userId || !winner || followPending) return;
    if (isWinnerFollowing) {
      unfollowPlayer.mutate({ followerId: userId, followedId: winner.id });
    } else {
      followPlayer.mutate({ followerId: userId, followedId: winner.id });
    }
  };

  // Interpolate translate value for reel sliding
  const translateY = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -23 * REEL_ITEM_HEIGHT],
  });

  // Grid list card item renderer
  function renderGridItem({ item }: { item: Profile }) {
    const existing = userId && requests ? requestWith(requests, userId, item.id) : undefined;

    let buttonLabel = 'CONNECT';
    let disabled = false;
    let buttonVariant: 'primary' | 'pending' | 'connected' = 'primary';
    
    if (existing) {
      disabled = true;
      if (existing.status === 'pending') {
        buttonLabel = 'PENDING';
        buttonVariant = 'pending';
      } else if (existing.status === 'accepted') {
        buttonLabel = 'CONNECTED';
        buttonVariant = 'connected';
      } else {
        buttonLabel = 'DECLINED';
        buttonVariant = 'pending';
      }
    }

    const isFollowing = following?.has(item.id);
    const followPending = followPlayer.isPending || unfollowPlayer.isPending;

    const handleFollowPress = () => {
      if (!userId || followPending) return;
      if (isFollowing) {
        unfollowPlayer.mutate({ followerId: userId, followedId: item.id });
      } else {
        followPlayer.mutate({ followerId: userId, followedId: item.id });
      }
    };

    return (
      <GlassCard style={styles.card} contentStyle={{ padding: 12 }}>
        <Pressable 
          style={({ pressed }) => [
            pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] }
          ]}
          onPress={() => router.push(`/player/${item.id}` as any)}
        >
          <View style={styles.avatarBox}>
            {item.avatar_url ? (
              <Image source={{ uri: item.avatar_url }} style={styles.avatarImage} />
            ) : (
              <View style={styles.placeholderContainer}>
                <Text style={styles.avatarPlaceholder}>{(item.full_name ?? '?').slice(0, 2).toUpperCase()}</Text>
              </View>
            )}
            {item.looking_for_partner && (
              <View style={styles.lookingBadge}>
                <Text style={styles.lookingBadgeText}>ACTIVE FINDER</Text>
              </View>
            )}
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={styles.cardTitle} numberOfLines={1}>
              {item.full_name ?? 'Player'}
            </Text>
            {item.is_pro && <ProBadge size="sm" />}
            {item.coach_status === 'approved' && <CoachBadge size="sm" />}
          </View>

          <View style={styles.cardRow}>
            <Text style={styles.levelBadge}>
              {item.level ? LEVEL_LABELS[item.level].toUpperCase() : 'NO LEVEL'}
            </Text>
            <Text style={styles.elo}>{item.elo} <Text style={{ fontSize: 9, color: theme.textMuted }}>PS</Text></Text>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.button,
              buttonVariant === 'primary' && styles.buttonPrimary,
              buttonVariant === 'pending' && styles.buttonPending,
              buttonVariant === 'connected' && styles.buttonConnected,
              pressed && !disabled && { scale: 0.96 } as any
            ]}
            disabled={disabled || sendRequest.isPending}
            onPress={(e) => {
              e.stopPropagation();
              userId && sendRequest.mutate({ fromId: userId, toId: item.id });
            }}>
            <Text style={[
              styles.buttonText,
              buttonVariant === 'primary' && styles.buttonTextPrimary,
              buttonVariant === 'pending' && styles.buttonTextPending,
              buttonVariant === 'connected' && styles.buttonTextConnected,
            ]}>
              {buttonLabel}
            </Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.followBtn,
              isFollowing && styles.followBtnActive,
              pressed && !followPending && { scale: 0.96 } as any
            ]}
            disabled={followPending}
            onPress={(e) => {
              e.stopPropagation();
              handleFollowPress();
            }}>
            <Ionicons 
              name={isFollowing ? "checkmark-circle" : "person-add"} 
              size={11} 
              color={isFollowing ? theme.primary : theme.textMuted} 
              style={{ marginRight: 4 }} 
            />
            <Text style={[styles.followBtnText, isFollowing && styles.followBtnTextActive]}>
              {isFollowing ? 'FOLLOWING' : 'FOLLOW'}
            </Text>
          </Pressable>
        </Pressable>
      </GlassCard>
    );
  }

  // Render Slot Reel items
  const renderReelContent = () => {
    if (reel.length === 0) {
      return (
        <View style={styles.reelItem}>
          <View style={styles.placeholderReelAvatar}>
            <Ionicons name="help" size={24} color={theme.textMuted} />
          </View>
          <Text style={styles.reelPlayerName}>PARTNER LOBBY</Text>
          <Text style={styles.reelPlayerLevel}>SPIN TO MATCH</Text>
        </View>
      );
    }
    
    return reel.map((item, idx) => (
      <View key={idx} style={styles.reelItem}>
        {item.avatar_url ? (
          <Image source={{ uri: item.avatar_url }} style={styles.reelAvatar} />
        ) : (
          <View style={styles.placeholderReelAvatar}>
            <Text style={styles.reelAvatarText}>{(item.full_name ?? '?').slice(0, 2).toUpperCase()}</Text>
          </View>
        )}
        <Text style={styles.reelPlayerName} numberOfLines={1}>
          {(item.full_name ?? 'Player').toUpperCase()}
        </Text>
        <Text style={styles.reelPlayerLevel}>
          {item.level ? LEVEL_LABELS[item.level].toUpperCase() : 'NO LEVEL'}
        </Text>
      </View>
    ));
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.tagline}>PARTNER DISCOVERY</Text>
        <Text style={styles.title}>PARTNERS</Text>
      </View>

      {/* Tab Selectors */}
      <View style={styles.tabSelector}>
        <Pressable 
          style={[styles.tabButton, activeTab === 'grid' && styles.tabButtonActive]}
          onPress={() => setActiveTab('grid')}
        >
          <Ionicons name="grid" size={14} color={activeTab === 'grid' ? '#FFF' : theme.textMuted} />
          <Text style={[styles.tabButtonText, activeTab === 'grid' && styles.tabButtonTextActive]}>DISCOVERY</Text>
        </Pressable>
        <Pressable 
          style={[styles.tabButton, activeTab === 'spin' && styles.tabButtonActive]}
          onPress={() => setActiveTab('spin')}
        >
          <Ionicons name="shuffle" size={14} color={activeTab === 'spin' ? '#FFF' : theme.textMuted} />
          <Text style={[styles.tabButtonText, activeTab === 'spin' && styles.tabButtonTextActive]}>ROULETTE</Text>
        </Pressable>
        <Pressable 
          style={[styles.tabButton, activeTab === 'followed' && styles.tabButtonActive]}
          onPress={() => setActiveTab('followed')}
        >
          <Ionicons name="people" size={14} color={activeTab === 'followed' ? '#FFF' : theme.textMuted} />
          <Text style={[styles.tabButtonText, activeTab === 'followed' && styles.tabButtonTextActive]}>FOLLOWING</Text>
        </Pressable>
      </View>

      {activeTab === 'grid' ? (
        /* Standard Grid View */
        isLoading ? (
          <ActivityIndicator style={{ marginTop: 32 }} color={theme.primary} />
        ) : (
          <FlatList
            key="discovery-grid"
            data={players}
            keyExtractor={(item) => item.id}
            renderItem={renderGridItem}
            numColumns={2}
            columnWrapperStyle={{ gap: 12 }}
            contentContainerStyle={{ gap: 12, paddingVertical: 4, paddingBottom: 110 }}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.empty}>No compatible players yet.</Text>
                <Text style={styles.emptySub}>Please check your Level and City configurations in your profile.</Text>
              </View>
            }
          />
        )
      ) : activeTab === 'spin' ? (
        /* Slot Machine / Roulette Mode */
        <View style={styles.spinContainer}>
          {candidatesLoading ? (
            <ActivityIndicator color={theme.primary} style={{ marginTop: 32 }} />
          ) : candidates.length === 0 ? (
            <View style={styles.emptyCandidatesBox}>
              <Ionicons name="people-outline" size={54} color={theme.textMuted} style={{ marginBottom: 12 }} />
              <Text style={styles.emptyCandidatesTitle}>NO NEW PLAYERS COMPATIBLE</Text>
              <Text style={styles.emptyCandidatesDesc}>
                We couldn't find any new players in your city matching your level with whom you don't already have a pending connection.
              </Text>
            </View>
          ) : (
            <GlassCard style={styles.slotConsole} contentStyle={{ padding: 20, alignItems: 'stretch' }}>
              {/* VS Split Display */}
              <View style={styles.slotVisualRow}>
                {/* Left Side: You */}
                <View style={styles.playerCardSide}>
                  <View style={styles.avatarSideBorder}>
                    {profile?.avatar_url ? (
                      <Image source={{ uri: profile.avatar_url }} style={styles.avatarSide} />
                    ) : (
                      <View style={styles.avatarSidePlaceholder}>
                        <Text style={styles.avatarSidePlaceholderText}>
                          {(profile?.full_name ?? 'ME').slice(0, 2).toUpperCase()}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.sidePlayerName} numberOfLines={1}>
                    {(profile?.full_name ?? 'Player').toUpperCase()}
                  </Text>
                  <View style={styles.sideBadge}>
                    <Text style={styles.sideBadgeText}>YOU</Text>
                  </View>
                </View>

                {/* Center Separator */}
                <View style={styles.vsDividerColumn}>
                  <View style={styles.vsLineSegment} />
                  <View style={styles.vsBadgeCircle}>
                    <Text style={styles.vsBadgeText}>VS</Text>
                  </View>
                  <View style={styles.vsLineSegment} />
                </View>

                {/* Right Side: Slot Machine Reel */}
                <View style={styles.reelViewportOuter}>
                  <View style={styles.reelViewport}>
                    {/* Golden Indicator Pointer Ticks */}
                    <View style={styles.pointerTickLeft} />
                    <View style={styles.pointerTickRight} />
                    
                    <Animated.View style={[styles.reelTrack, { transform: [{ translateY }] }]}>
                      {renderReelContent()}
                    </Animated.View>
                  </View>
                </View>
              </View>

              {/* Action Button */}
              <View style={styles.actionRow}>
                <Pressable
                  style={({ pressed }) => [
                    styles.spinButton,
                    spinState === 'spinning' && styles.spinButtonDisabled,
                    pressed && spinState === 'idle' && { transform: [{ scale: 0.97 }] }
                  ]}
                  disabled={spinState === 'spinning'}
                  onPress={handleSpin}
                >
                  <Ionicons name="play" size={16} color="#08080C" />
                  <Text style={styles.spinButtonText}>
                    {spinState === 'spinning' ? 'SHUFFLING...' : 'SPIN ROULETTE'}
                  </Text>
                </Pressable>
                <Text style={styles.slotFootnote}>
                  CANDIDATES IN POOL: <Text style={{ color: theme.primary, fontWeight: '900' }}>{candidates.length}</Text>
                </Text>
              </View>
            </GlassCard>
          )}

          {/* Winner Reveal Modal Overlay */}
          <Modal
            visible={spinState === 'finished' && winner !== null}
            transparent={true}
            animationType="fade"
          >
            <View style={styles.modalOverlay}>
              <View style={styles.winnerCard}>
                <View style={styles.winnerHeaderGlow} />
                
                <Ionicons name="sparkles" size={32} color={theme.primary} style={{ alignSelf: 'center', marginBottom: 8 }} />
                <Text style={styles.winnerTitle}>PARTNER MATCHED!</Text>
                <Text style={styles.winnerSub}>MATCH QUALITY NOMINAL</Text>

                <View style={styles.winnerDivider} />

                {/* Winner Profile */}
                <View style={styles.winnerProfileBox}>
                  <View style={styles.winnerAvatarBorder}>
                    {winner?.avatar_url ? (
                      <Image source={{ uri: winner.avatar_url }} style={styles.winnerAvatar} />
                    ) : (
                      <View style={styles.winnerAvatarPlaceholder}>
                        <Text style={styles.winnerAvatarPlaceholderText}>
                          {(winner?.full_name ?? '?').slice(0, 2).toUpperCase()}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.winnerName} numberOfLines={1}>
                    {(winner?.full_name ?? 'Player').toUpperCase()}
                  </Text>
                  
                  <View style={styles.winnerStatsRow}>
                    <View style={styles.winnerBadge}>
                      <Text style={styles.winnerBadgeText}>
                        {winner?.level ? LEVEL_LABELS[winner.level].toUpperCase() : 'NO LEVEL'}
                      </Text>
                    </View>
                    <View style={[styles.winnerBadge, { borderColor: theme.secondary }]}>
                      <Text style={[styles.winnerBadgeText, { color: theme.secondary }]}>
                        {winner?.elo} PS
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.winnerLocation}>
                    📍 {winner?.zone ? winner.zone.toUpperCase() : 'UNKNOWN'}
                  </Text>
                </View>

                {/* Actions */}
                <View style={styles.winnerActions}>
                  <Pressable 
                    style={[styles.winnerButton, { backgroundColor: theme.primary }]}
                    onPress={handleSendRequest}
                    disabled={sendRequest.isPending}
                  >
                    {sendRequest.isPending ? (
                      <ActivityIndicator size="small" color={theme.onAccent} />
                    ) : (
                      <>
                        <Ionicons name="people" size={14} color={theme.onAccent} />
                        <Text style={styles.winnerButtonText}>SEND REQUEST</Text>
                      </>
                    )}
                  </Pressable>
                  <Pressable 
                    style={[
                      styles.winnerButton, 
                      { 
                        backgroundColor: 'transparent', 
                        borderWidth: 1, 
                        borderColor: isWinnerFollowing ? theme.primary : theme.border,
                        marginTop: 10 
                      }
                    ]}
                    onPress={handleWinnerFollowPress}
                    disabled={followPending}
                  >
                    <Ionicons 
                      name={isWinnerFollowing ? "checkmark-circle" : "person-add"} 
                      size={14} 
                      color={isWinnerFollowing ? theme.primary : theme.textMuted} 
                      style={{ marginRight: 6 }}
                    />
                    <Text style={[styles.winnerButtonText, { color: isWinnerFollowing ? theme.primary : theme.text }]}>
                      {isWinnerFollowing ? 'FOLLOWING' : 'FOLLOW'}
                    </Text>
                  </Pressable>
                  <Pressable 
                    style={styles.winnerRetryButton}
                    onPress={handleSpinAgain}
                    disabled={sendRequest.isPending}
                  >
                    <Text style={styles.winnerRetryText}>SPIN AGAIN</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </Modal>
        </View>
      ) : (
        /* Following Tab View */
        followedLoading ? (
          <ActivityIndicator style={{ marginTop: 32 }} color={theme.primary} />
        ) : followedProfiles && followedProfiles.length > 0 ? (
          <FlatList
            key="followed-list"
            data={followedProfiles}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ gap: 10, paddingBottom: 110 }}
            renderItem={({ item }) => (
              <GlassCard style={styles.followedRow} contentStyle={{ padding: 12, flexDirection: 'row', alignItems: 'center' }}>
                <Pressable 
                  style={({ pressed }) => [
                    { flex: 1, flexDirection: 'row', alignItems: 'center' },
                    pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] }
                  ]}
                  onPress={() => router.push(`/player/${item.id}` as any)}
                >
                  <View style={styles.followedAvatarContainer}>
                    {item.avatar_url ? (
                      <Image source={{ uri: item.avatar_url }} style={styles.followedAvatar} />
                    ) : (
                      <View style={styles.followedAvatarPlaceholder}>
                        <Text style={styles.followedAvatarText}>
                          {(item.full_name ?? '?').slice(0, 2).toUpperCase()}
                        </Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.followedInfo}>
                    <Text style={styles.followedName} numberOfLines={1}>
                      {item.full_name ?? 'Player'}
                    </Text>
                    <View style={styles.followedMetaRow}>
                      <Text style={styles.followedLevel}>
                        {item.level ? LEVEL_LABELS[item.level].toUpperCase() : 'NO LEVEL'}
                      </Text>
                      <Text style={styles.followedDivider}>•</Text>
                      <Text style={styles.followedElo}>
                        {item.elo} <Text style={{ fontSize: 8, color: theme.textMuted }}>PS</Text>
                      </Text>
                    </View>
                  </View>
                  <Pressable
                    style={({ pressed }) => [
                      styles.unfollowButton,
                      pressed && { opacity: 0.8 }
                    ]}
                    onPress={(e) => {
                      e.stopPropagation();
                      if (!userId) return;
                      unfollowPlayer.mutate({ followerId: userId, followedId: item.id }, {
                        onSuccess: () => {
                          queryClient.invalidateQueries({ queryKey: ["followedProfiles"] });
                        }
                      });
                    }}
                  >
                    <Ionicons name="person-remove-outline" size={12} color={theme.danger} style={{ marginRight: 4 }} />
                    <Text style={styles.unfollowButtonText}>UNFOLLOW</Text>
                  </Pressable>
                </Pressable>
              </GlassCard>
            )}
          />
        ) : (
          <GlassCard style={styles.emptyFollowedContainer} contentStyle={{ padding: 30, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="people-outline" size={48} color={theme.textMuted} style={{ marginBottom: 12 }} />
            <Text style={styles.emptyFollowedTitle}>YOU'RE NOT FOLLOWING ANYONE YET</Text>
            <Text style={styles.emptyFollowedDesc}>
              Follow players from the Discovery Grid to see their active milestones and match results on your home feed.
            </Text>
            <Pressable
              style={({ pressed }) => [
                styles.emptyFollowedBtn,
                pressed && { opacity: 0.8 }
              ]}
              onPress={() => setActiveTab('grid')}
            >
              <Text style={styles.emptyFollowedBtnText}>DISCOVER PLAYERS</Text>
            </Pressable>
          </GlassCard>
        )
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: 'transparent' },
  headerContainer: { marginBottom: 16, marginTop: 12 },
  tagline: { fontSize: 10, fontWeight: '900', color: theme.primary, letterSpacing: 2, marginBottom: 4 },
  title: { fontSize: 28,  color: theme.text, letterSpacing: -0.5 , textTransform: 'uppercase'},
  
  // Tab Selector styles
  tabSelector: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
  },
  tabButtonActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  tabButtonText: {
    color: theme.textMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  tabButtonTextActive: {
    color: '#FFF',
    fontWeight: '900',
  },

  // Grid Card styles
  card: { 
    flex: 1, 
    borderRadius: cardRadius, 
  },
  avatarBox: {
    aspectRatio: 1,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  avatarImage: { width: '100%', height: '100%' },
  placeholderContainer: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent' },
  avatarPlaceholder: { color: theme.textMuted, fontSize: 20, fontWeight: '900', letterSpacing: 1 },
  lookingBadge: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255, 92, 0, 0.9)',
    paddingVertical: 4,
  },
  lookingBadgeText: { color: '#fff', fontSize: 8, fontWeight: '900', textAlign: 'center', letterSpacing: 1 },
  cardTitle: { fontSize: 13,  color: theme.text, textTransform: 'uppercase', letterSpacing: 0.2},
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  levelBadge: { color: theme.textMuted, fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
  elo: { color: theme.text, fontSize: 11, fontWeight: '900' },
  button: { 
    borderRadius: buttonRadius, 
    paddingVertical: 10, 
    alignItems: 'center', 
    marginTop: 12,
    borderWidth: 1,
  },
  buttonPrimary: {
    backgroundColor: theme.primary,
    borderColor: theme.primary,
  },
  buttonPending: {
    backgroundColor: 'transparent',
    borderColor: theme.border,
  },
  buttonConnected: {
    backgroundColor: 'rgba(0, 230, 118, 0.1)',
    borderColor: theme.success,
  },
  buttonText: { fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  buttonTextPrimary: { color: '#08080C' },
  buttonTextPending: { color: theme.textMuted },
  buttonTextConnected: { color: theme.success },

  emptyContainer: { alignItems: 'center', marginTop: 40, paddingHorizontal: 20 },
  empty: { textAlign: 'center', color: theme.text, fontSize: 14, fontWeight: '900' },
  emptySub: { textAlign: 'center', color: theme.textMuted, fontSize: 11, marginTop: 6, lineHeight: 18 },

  // Slot Machine / Spin Styles
  spinContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingBottom: 40,
  },
  emptyCandidatesBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    marginTop: 20,
  },
  emptyCandidatesTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: theme.text,
    letterSpacing: 1,
    marginBottom: 8,
  },
  emptyCandidatesDesc: {
    fontSize: 11,
    color: theme.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
  slotConsole: {
    borderRadius: cardRadius,
  },
  slotVisualRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 180,
  },
  playerCardSide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarSideBorder: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    padding: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginBottom: 8,
  },
  avatarSide: {
    width: '100%',
    height: '100%',
    borderRadius: 35,
  },
  avatarSidePlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 35,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarSidePlaceholderText: {
    color: theme.text,
    fontSize: 18,
    fontWeight: '900',
  },
  sidePlayerName: {
    fontSize: 11,
    
    color: theme.text,
    width: '100%',
    textAlign: 'center',
    marginBottom: 6,
   textTransform: 'uppercase'},
  sideBadge: {
    backgroundColor: 'rgba(46, 157, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(46, 157, 255, 0.3)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  sideBadgeText: {
    color: theme.secondary,
    fontSize: 8,
    fontWeight: '900',
  },

  // VS separator styles
  vsDividerColumn: {
    width: 40,
    alignItems: 'center',
    height: '100%',
    justifyContent: 'center',
  },
  vsLineSegment: {
    width: 1,
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  vsBadgeCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#08080C',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
  },
  vsBadgeText: {
    color: theme.primary,
    fontSize: 9,
    fontWeight: '900',
  },

  // Reel viewport styles
  reelViewportOuter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reelViewport: {
    width: 120,
    height: REEL_ITEM_HEIGHT,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1.5,
    borderColor: theme.primary,
    overflow: 'hidden',
    position: 'relative',
  },
  pointerTickLeft: {
    position: 'absolute',
    left: 0,
    top: REEL_ITEM_HEIGHT / 2 - 1,
    width: 6,
    height: 2,
    backgroundColor: theme.primary,
    zIndex: 2,
  },
  pointerTickRight: {
    position: 'absolute',
    right: 0,
    top: REEL_ITEM_HEIGHT / 2 - 1,
    width: 6,
    height: 2,
    backgroundColor: theme.primary,
    zIndex: 2,
  },
  reelTrack: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  reelItem: {
    height: REEL_ITEM_HEIGHT,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  reelAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginBottom: 6,
  },
  placeholderReelAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  reelAvatarText: {
    color: theme.textMuted,
    fontSize: 14,
    fontWeight: '900',
  },
  reelPlayerName: {
    fontSize: 10,
    
    color: '#FFF',
    width: '90%',
    textAlign: 'center',
   textTransform: 'uppercase'},
  reelPlayerLevel: {
    fontSize: 8,
    color: theme.textMuted,
    fontWeight: '800',
    marginTop: 2,
  },

  actionRow: {
    marginTop: 20,
    alignItems: 'center',
    gap: 8,
  },
  spinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.primary,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    alignSelf: 'center',
  },
  spinButtonDisabled: {
    backgroundColor: '#3E2A20',
  },
  spinButtonText: {
    color: '#08080C',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
  },
  slotFootnote: {
    fontSize: 9,
    fontWeight: '900',
    color: theme.textMuted,
    letterSpacing: 0.5,
  },

  // Modal / Winner styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 6, 8, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  winnerCard: {
    width: '100%',
    maxWidth: 300,
    backgroundColor: 'rgba(21, 22, 31, 0.9)',
    borderRadius: cardRadius,
    borderWidth: 1.5,
    borderColor: '#FF5C00',
    padding: 24,
    alignItems: 'stretch',
    position: 'relative',
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  winnerHeaderGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: theme.primary,
  },
  winnerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFF',
    textAlign: 'center',
    letterSpacing: 1,
  },
  winnerSub: {
    fontSize: 9,
    fontWeight: '900',
    color: theme.primary,
    textAlign: 'center',
    letterSpacing: 1.5,
    marginTop: 2,
  },
  winnerDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 92, 0, 0.25)',
    marginVertical: 16,
  },
  winnerProfileBox: {
    alignItems: 'center',
    marginBottom: 20,
  },
  winnerAvatarBorder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2.5,
    borderColor: theme.primary,
    padding: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginBottom: 12,
  },
  winnerAvatar: {
    width: '100%',
    height: '100%',
    borderRadius: 36,
  },
  winnerAvatarPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 36,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  winnerAvatarPlaceholderText: {
    color: theme.text,
    fontSize: 22,
    fontWeight: '900',
  },
  winnerName: {
    fontSize: 15,
    
    color: '#FFF',
    marginBottom: 8,
   textTransform: 'uppercase'},
  winnerStatsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 6,
  },
  winnerBadge: {
    borderWidth: 1,
    borderColor: theme.primary,
    backgroundColor: 'rgba(255, 92, 0, 0.05)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  winnerBadgeText: {
    color: theme.primary,
    fontSize: 8,
    fontWeight: '900',
  },
  winnerLocation: {
    fontSize: 10,
    color: theme.textMuted,
    fontWeight: '800',
    marginTop: 4,
  },
  winnerActions: {
    gap: 10,
  },
  winnerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.primary,
    paddingVertical: 12,
    borderRadius: 10,
  },
  winnerButtonText: {
    color: theme.onAccent,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  winnerRetryButton: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  winnerRetryText: {
    color: theme.textMuted,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  followBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 92, 0, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 92, 0, 0.15)',
    borderRadius: buttonRadius,
    paddingVertical: 10,
    marginTop: 8,
    width: '100%',
  },
  followBtnActive: {
    backgroundColor: 'transparent',
    borderColor: theme.primary,
  },
  followBtnText: {
    color: theme.textMuted,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  followBtnTextActive: {
    color: theme.primary,
    fontWeight: '900',
  },
  followedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: cardRadius,
  },
  followedAvatarContainer: {
    marginRight: 12,
  },
  followedAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  followedAvatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  followedAvatarText: {
    color: theme.text,
    fontSize: 14,
    fontWeight: '900',
  },
  followedInfo: {
    flex: 1,
    marginRight: 8,
  },
  followedName: {
    color: theme.text,
    fontSize: 14,
    
    textTransform: 'uppercase',
    letterSpacing: 0.2,},
  followedMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  followedLevel: {
    color: theme.primary,
    fontSize: 10,
    fontWeight: '800',
  },
  followedDivider: {
    color: theme.borderActive,
    fontSize: 10,
    fontWeight: '900',
  },
  followedElo: {
    color: theme.text,
    fontSize: 11,
    fontWeight: '700',
  },
  unfollowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(239, 83, 80, 0.3)',
    backgroundColor: 'rgba(239, 83, 80, 0.05)',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  unfollowButtonText: {
    color: theme.danger,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  emptyFollowedContainer: {
    borderRadius: cardRadius,
    marginTop: 20,
  },
  emptyFollowedTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: theme.text,
    letterSpacing: 1,
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyFollowedDesc: {
    fontSize: 11,
    color: theme.textMuted,
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  emptyFollowedBtn: {
    backgroundColor: theme.primary,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  emptyFollowedBtnText: {
    color: theme.onAccent,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
});
