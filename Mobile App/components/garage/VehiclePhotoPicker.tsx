import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';

import Colors from '@/constants/Colors';
import { uploadVehicleImage } from '@/lib/upload-vehicle-image';

type Props = {
  colors: (typeof Colors)['light'];
  value: string;
  onChange: (url: string) => void;
  disabled?: boolean;
};

export function VehiclePhotoPicker({ colors, value, onChange, disabled }: Props) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pickAndUpload = async (mode: 'library' | 'camera') => {
    if (disabled || uploading) return;
    setError(null);

    if (mode === 'library') {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission needed', 'Allow photo library access to add a vehicle image.');
        return;
      }
    } else {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission needed', 'Allow camera access to take a vehicle photo.');
        return;
      }
    }

    const result =
      mode === 'library'
        ? await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.85,
          })
        : await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.85,
          });

    if (result.canceled || !result.assets[0]?.uri) return;

    const asset = result.assets[0];
    setUploading(true);
    try {
      const url = await uploadVehicleImage(asset.uri, asset.mimeType ?? 'image/jpeg');
      onChange(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const hasImage = Boolean(value.trim());

  return (
    <View style={styles.wrap}>
      <Pressable
        disabled={disabled || uploading}
        onPress={() => void pickAndUpload('library')}
        style={({ pressed }) => [
          styles.preview,
          {
            borderColor: colors.border,
            backgroundColor: colors.card,
            opacity: pressed && !uploading ? 0.94 : 1,
          },
        ]}>
        {uploading ? (
          <View style={styles.centered}>
            <ActivityIndicator color={colors.primary} />
            <Text style={[styles.hint, { color: colors.textMuted }]}>Uploading…</Text>
          </View>
        ) : hasImage ? (
          <Image source={{ uri: value }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={styles.centered}>
            <Ionicons name="image-outline" size={32} color={colors.textMuted} />
            <Text style={[styles.title, { color: colors.text }]}>Add a photo</Text>
            <Text style={[styles.hint, { color: colors.textMuted }]}>JPEG, PNG, WebP · up to 5 MB</Text>
          </View>
        )}
      </Pressable>

      <View style={styles.actions}>
        <Pressable
          disabled={disabled || uploading}
          onPress={() => void pickAndUpload('library')}
          style={({ pressed }) => [
            styles.actionBtn,
            { borderColor: colors.border, backgroundColor: colors.card, opacity: pressed ? 0.9 : 1 },
          ]}>
          <Ionicons name="images-outline" size={16} color={colors.primary} />
          <Text style={[styles.actionText, { color: colors.text }]}>{hasImage ? 'Replace' : 'Choose photo'}</Text>
        </Pressable>
        <Pressable
          disabled={disabled || uploading}
          onPress={() => void pickAndUpload('camera')}
          style={({ pressed }) => [
            styles.actionBtn,
            { borderColor: colors.border, backgroundColor: colors.card, opacity: pressed ? 0.9 : 1 },
          ]}>
          <Ionicons name="camera-outline" size={16} color={colors.primary} />
          <Text style={[styles.actionText, { color: colors.text }]}>Take photo</Text>
        </Pressable>
        {hasImage ? (
          <Pressable
            disabled={disabled || uploading}
            onPress={() => onChange('')}
            style={({ pressed }) => [
              styles.actionBtn,
              { borderColor: colors.border, backgroundColor: colors.card, opacity: pressed ? 0.9 : 1 },
            ]}>
            <Ionicons name="trash-outline" size={16} color={colors.destructive} />
            <Text style={[styles.actionText, { color: colors.destructive }]}>Remove</Text>
          </Pressable>
        ) : null}
      </View>

      {error ? <Text style={[styles.error, { color: colors.destructive }]}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  preview: {
    borderWidth: 1,
    borderRadius: 14,
    minHeight: 168,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: { width: '100%', height: 200 },
  centered: { alignItems: 'center', gap: 6, padding: 20 },
  title: { fontSize: 15, fontWeight: '700' },
  hint: { fontSize: 12, textAlign: 'center' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  actionText: { fontSize: 13, fontWeight: '600' },
  error: { fontSize: 12, fontWeight: '600' },
});
