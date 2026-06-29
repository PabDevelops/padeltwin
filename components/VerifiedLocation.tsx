import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { theme, chipRadius } from '@/constants/theme';
import { useDetectCity } from '@/lib/useLocation';

// Preferred path is GPS + reverse geocoding, so City/Country League groupings
// stay trustworthy. But GPS isn't always available (denied permission, web
// browser, no signal indoors) — so we also let the player type a nearby
// place name, which gets forward-geocoded and then resolved through the same
// reverse-geocoding step as GPS, so it still lands on a real, normalized city.
// If neither works right now, `onSkip` lets them finish and verify later.
export function VerifiedLocation({
  city,
  country,
  onDetected,
  onSkip,
}: {
  city: string | null;
  country: string | null;
  onDetected: (location: { city: string; country: string }) => void;
  onSkip?: () => void;
}) {
  const { detectLocation, resolveFromText, loading, error } = useDetectCity();
  const [manualOpen, setManualOpen] = useState(false);
  const [manualText, setManualText] = useState('');

  async function handlePress() {
    const result = await detectLocation();
    if (result?.city && result?.country) {
      onDetected({ city: result.city, country: result.country });
    } else {
      setManualOpen(true);
    }
  }

  async function handleManualSubmit() {
    const result = await resolveFromText(manualText);
    if (result?.city && result?.country) {
      onDetected({ city: result.city, country: result.country });
      setManualOpen(false);
      setManualText('');
    }
  }

  return (
    <View>
      {city && country ? (
        <View style={styles.verifiedRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.verifiedText}>📍 {city}, {country}</Text>
            <Text style={styles.verifiedSub}>Verified</Text>
          </View>
          <Pressable style={styles.refreshBtn} onPress={handlePress} disabled={loading}>
            {loading ? <ActivityIndicator size="small" color={theme.accent} /> : <Text style={styles.refreshBtnText}>UPDATE</Text>}
          </Pressable>
        </View>
      ) : (
        <>
          <Pressable style={styles.detectBtn} onPress={handlePress} disabled={loading}>
            {loading ? (
              <ActivityIndicator color={theme.onAccent} />
            ) : (
              <Text style={styles.detectBtnText}>📍 USE MY GPS LOCATION</Text>
            )}
          </Pressable>

          <Pressable onPress={() => setManualOpen((v) => !v)} style={styles.manualToggle}>
            <Text style={styles.manualToggleText}>
              {manualOpen ? 'Hide manual entry' : "GPS not working? Type your city"}
            </Text>
          </Pressable>

          {manualOpen && (
            <View style={styles.manualRow}>
              <TextInput
                style={styles.manualInput}
                placeholder="e.g. Glasgow, or near Glasgow"
                placeholderTextColor={theme.textMuted}
                value={manualText}
                onChangeText={setManualText}
                onSubmitEditing={handleManualSubmit}
              />
              <Pressable style={styles.manualSubmitBtn} onPress={handleManualSubmit} disabled={loading}>
                {loading ? <ActivityIndicator size="small" color={theme.onAccent} /> : <Text style={styles.manualSubmitText}>FIND</Text>}
              </Pressable>
            </View>
          )}

          {onSkip && (
            <Pressable onPress={onSkip} style={styles.skipBtn}>
              <Text style={styles.skipBtnText}>I'll verify my location later</Text>
            </Pressable>
          )}
        </>
      )}
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  detectBtn: { backgroundColor: theme.accent, borderRadius: chipRadius, paddingVertical: 14, alignItems: 'center' },
  detectBtnText: { color: theme.onAccent, fontWeight: '900', fontSize: 13 },
  verifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: chipRadius,
    padding: 14,
  },
  verifiedText: { color: theme.text, fontWeight: '700', fontSize: 14 },
  verifiedSub: { color: theme.success, fontSize: 11, fontWeight: '700', marginTop: 2 },
  refreshBtn: { borderWidth: 1, borderColor: theme.border, borderRadius: chipRadius, paddingVertical: 8, paddingHorizontal: 12 },
  refreshBtnText: { color: theme.textMuted, fontWeight: '800', fontSize: 11 },
  errorText: { color: theme.danger, fontSize: 12, marginTop: 6 },
  manualToggle: { alignItems: 'center', paddingVertical: 10 },
  manualToggleText: { color: theme.textMuted, fontSize: 12, fontWeight: '700', textDecorationLine: 'underline' },
  manualRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  manualInput: {
    flex: 1,
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: chipRadius,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: theme.text,
    fontSize: 13,
  },
  manualSubmitBtn: {
    backgroundColor: theme.accent,
    borderRadius: chipRadius,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  manualSubmitText: { color: theme.onAccent, fontWeight: '900', fontSize: 12 },
  skipBtn: { alignItems: 'center', paddingVertical: 10 },
  skipBtnText: { color: theme.textMuted, fontSize: 12, textDecorationLine: 'underline' },
});
