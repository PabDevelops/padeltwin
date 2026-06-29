import { Dimensions, Platform, StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';

const { height } = Dimensions.get('window');

export function AuroraBackground({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.container}>
      <View style={styles.blobContainer}>
        <View style={[styles.blob, styles.violetBlob, { top: -50, left: -50, width: 280, height: 280, borderRadius: 140 }]} />
        <View style={[styles.blob, styles.limeBlob, { top: height * 0.35, right: -60, width: 240, height: 240, borderRadius: 120 }]} />
        <View style={[styles.blob, styles.limeBlob, { top: 40, right: -20, width: 160, height: 160, borderRadius: 80, opacity: 0.15 }]} />
      </View>

      <BlurView intensity={Platform.OS === 'ios' ? 90 : 75} tint="dark" style={StyleSheet.absoluteFill} />
      <View style={styles.darkOverlay} />

      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0C10' },
  blobContainer: { ...StyleSheet.absoluteFillObject, overflow: 'hidden' },
  blob: { position: 'absolute', opacity: 0.25 },
  violetBlob: { backgroundColor: '#7D39EB' },
  limeBlob: { backgroundColor: '#C6FF33' },
  darkOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(11, 12, 16, 0.45)' },
  content: { flex: 1 },
});
