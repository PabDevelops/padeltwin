import { Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '@/constants/theme';

interface PhotoViewerModalProps {
  visible: boolean;
  photoUrl: string | null;
  caption?: string | null;
  onClose: () => void;
}

export function PhotoViewerModal({ visible, photoUrl, caption, onClose }: PhotoViewerModalProps) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={[styles.closeBtn, { top: insets.top + 12 }]} onPress={onClose}>
          <Ionicons name="close" size={26} color="#FFF" />
        </Pressable>
        {photoUrl && <Image source={{ uri: photoUrl }} style={styles.photo} resizeMode="contain" />}
        {caption ? <Text style={styles.caption}>{caption}</Text> : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', alignItems: 'center', justifyContent: 'center' },
  closeBtn: { position: 'absolute', right: 16, zIndex: 10, padding: 8 },
  photo: { width: '100%', height: '75%' },
  caption: { color: theme.text, fontSize: 13, textAlign: 'center', paddingHorizontal: 24, marginTop: 16 },
});
