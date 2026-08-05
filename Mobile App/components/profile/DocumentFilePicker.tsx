import { Ionicons } from '@expo/vector-icons';
import { File } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';

import Colors from '@/constants/Colors';
import { uploadVehicleDocument } from '@/lib/upload-vehicle-document';

type Props = {
  colors: (typeof Colors)['light'];
  value: string;
  onChange: (url: string) => void;
  disabled?: boolean;
};

function isPdfUrl(url: string): boolean {
  const lower = url.toLowerCase();
  return lower.includes('.pdf') || lower.includes('application/pdf');
}

export function DocumentFilePicker({ colors, value, onChange, disabled }: Props) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileLabel, setFileLabel] = useState<string | null>(null);

  const hasFile = Boolean(value.trim());
  const isPdf = useMemo(() => (hasFile ? isPdfUrl(value) : fileLabel?.toLowerCase().endsWith('.pdf')), [fileLabel, hasFile, value]);

  const uploadLocalFile = async (localUri: string, mimeType: string, label?: string) => {
    setUploading(true);
    setError(null);
    try {
      const url = await uploadVehicleDocument(localUri, mimeType);
      if (label) setFileLabel(label);
      onChange(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const pickImage = async (mode: 'library' | 'camera') => {
    if (disabled || uploading) return;
    setError(null);

    if (mode === 'library') {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission needed', 'Allow photo library access to add a document photo.');
        return;
      }
    } else {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission needed', 'Allow camera access to photograph a document.');
        return;
      }
    }

    const result =
      mode === 'library'
        ? await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            quality: 0.9,
          })
        : await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            quality: 0.9,
          });

    if (result.canceled || !result.assets[0]?.uri) return;

    const asset = result.assets[0];
    await uploadLocalFile(asset.uri, asset.mimeType ?? 'image/jpeg', asset.fileName ?? 'document.jpg');
  };

  const pickPdf = async () => {
    if (disabled || uploading) return;
    setError(null);

    const result = await File.pickFileAsync({
      mimeTypes: ['application/pdf'],
    });

    if (result.canceled || !result.result) return;

    const picked = result.result;
    await uploadLocalFile(picked.uri, 'application/pdf', picked.name);
  };

  const clearFile = () => {
    onChange('');
    setFileLabel(null);
    setError(null);
  };

  return (
    <View style={styles.wrap}>
      <Text style={[styles.label, { color: colors.textMuted }]}>Document file</Text>

      <View
        style={[
          styles.preview,
          {
            borderColor: colors.border,
            backgroundColor: colors.card,
          },
        ]}>
        {uploading ? (
          <View style={styles.centered}>
            <ActivityIndicator color={colors.primary} />
            <Text style={[styles.hint, { color: colors.textMuted }]}>Uploading…</Text>
          </View>
        ) : hasFile && !isPdf ? (
          <Image source={{ uri: value }} style={styles.image} resizeMode="cover" />
        ) : hasFile && isPdf ? (
          <View style={styles.centered}>
            <Ionicons name="document-text-outline" size={36} color={colors.primary} />
            <Text style={[styles.title, { color: colors.text }]}>{fileLabel || 'PDF document'}</Text>
            <Text style={[styles.hint, { color: colors.textMuted }]}>Uploaded successfully</Text>
          </View>
        ) : (
          <View style={styles.centered}>
            <Ionicons name="cloud-upload-outline" size={32} color={colors.textMuted} />
            <Text style={[styles.title, { color: colors.text }]}>Add a document</Text>
            <Text style={[styles.hint, { color: colors.textMuted }]}>Photo or PDF · up to 10 MB</Text>
          </View>
        )}
      </View>

      <View style={styles.actions}>
        <Pressable
          disabled={disabled || uploading}
          onPress={() => void pickImage('library')}
          style={({ pressed }) => [
            styles.actionBtn,
            { borderColor: colors.border, backgroundColor: colors.card, opacity: pressed ? 0.9 : 1 },
          ]}>
          <Ionicons name="images-outline" size={16} color={colors.primary} />
          <Text style={[styles.actionText, { color: colors.text }]}>Choose photo</Text>
        </Pressable>
        <Pressable
          disabled={disabled || uploading}
          onPress={() => void pickImage('camera')}
          style={({ pressed }) => [
            styles.actionBtn,
            { borderColor: colors.border, backgroundColor: colors.card, opacity: pressed ? 0.9 : 1 },
          ]}>
          <Ionicons name="camera-outline" size={16} color={colors.primary} />
          <Text style={[styles.actionText, { color: colors.text }]}>Take photo</Text>
        </Pressable>
        <Pressable
          disabled={disabled || uploading}
          onPress={() => void pickPdf()}
          style={({ pressed }) => [
            styles.actionBtn,
            { borderColor: colors.border, backgroundColor: colors.card, opacity: pressed ? 0.9 : 1 },
          ]}>
          <Ionicons name="document-outline" size={16} color={colors.primary} />
          <Text style={[styles.actionText, { color: colors.text }]}>Choose PDF</Text>
        </Pressable>
        {hasFile ? (
          <Pressable
            disabled={disabled || uploading}
            onPress={clearFile}
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
  wrap: { gap: 8 },
  label: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4 },
  preview: {
    borderWidth: 1,
    borderRadius: 14,
    minHeight: 140,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: { width: '100%', height: 180 },
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
