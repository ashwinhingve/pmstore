/**
 * Prescription upload screen.
 *
 * Features:
 * - Take photo or pick from gallery
 * - Compress image before upload (expo-image-manipulator)
 * - Upload to Cloudinary via /api/v1/prescriptions
 * - Display uploaded images
 * - Remove image
 * - Return to previous screen
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  FlatList,
  ListRenderItemInfo,
  Image as RNImage,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import { apiClient } from '@/lib/api/client';
import { Prescription } from '@/lib/api/types';
import { theme } from '@/lib/theme';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.paper,
  },
  header: {
    padding: theme.spacing.lg,
    borderBottomColor: theme.colors.border,
    borderBottomWidth: 1,
    backgroundColor: theme.colors.paperCard,
  },
  title: {
    fontSize: theme.typography.sizes.xl,
    fontWeight: '800',
    color: theme.colors.ink,
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
  },
  content: {
    flex: 1,
    padding: theme.spacing.lg,
  },
  section: {
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: theme.typography.sizes.base,
    fontWeight: '700',
    color: theme.colors.ink,
    marginBottom: theme.spacing.md,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  button: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: theme.touchTargets.small,
  },
  primaryButton: {
    backgroundColor: theme.colors.ink,
  },
  secondaryButton: {
    backgroundColor: theme.colors.foilSoft,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  buttonText: {
    fontSize: theme.typography.sizes.base,
    fontWeight: '700',
  },
  primaryButtonText: {
    color: theme.colors.paper,
  },
  secondaryButtonText: {
    color: theme.colors.ink,
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
  },
  imageContainer: {
    position: 'relative',
    width: '48%',
  },
  imageWrapper: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: theme.radius.md,
    overflow: 'hidden',
    backgroundColor: theme.colors.foilSoft,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  removeButton: {
    position: 'absolute',
    top: theme.spacing.sm,
    right: theme.spacing.sm,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.rx,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButtonText: {
    color: theme.colors.paper,
    fontWeight: '700',
    fontSize: 18,
  },
  emptyState: {
    padding: theme.spacing.lg,
    borderRadius: theme.radius.md,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
  },
  emptyStateText: {
    fontSize: theme.typography.sizes.base,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  footer: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.lg,
    borderTopColor: theme.colors.border,
    borderTopWidth: 1,
    backgroundColor: theme.colors.paperCard,
  },
  continueButton: {
    backgroundColor: theme.colors.mint,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    minHeight: theme.touchTargets.small,
    justifyContent: 'center',
  },
  continueButtonText: {
    fontSize: theme.typography.sizes.base,
    fontWeight: '700',
    color: theme.colors.paper,
  },
});

/**
 * Compress image to reduce file size before upload.
 * TODO: Adjust quality/width based on Cloudinary free tier limits.
 */
async function compressImage(uri: string): Promise<string> {
  try {
    const manipResult = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 1024 } }],
      { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
    );
    return manipResult.uri;
  } catch (error) {
    console.error('Failed to compress image:', error);
    return uri;
  }
}

export default function PrescriptionUploadScreen(): React.ReactElement {
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const uploadMutation = useMutation({
    mutationFn: async (imageUris: string[]): Promise<Prescription> => {
      // TODO: Upload images to Cloudinary and get URLs
      // For now, this is a placeholder that calls the API with image URLs
      return apiClient.post<Prescription>('/prescriptions', {
        imageUrls: imageUris,
      });
    },
    onSuccess: () => {
      Alert.alert('Success', 'Prescription uploaded successfully.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    },
    onError: (error) => {
      Alert.alert('Error', (error as Error).message);
    },
  });

  const handlePickImage = async (source: 'camera' | 'gallery'): Promise<void> => {
    try {
      let result;

      if (source === 'camera') {
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [4, 3],
          quality: 0.8,
        });
      } else {
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [4, 3],
          quality: 0.8,
        });
      }

      if (!result.canceled && result.assets[0]) {
        const compressedUri = await compressImage(result.assets[0].uri);
        setImages([...images, compressedUri]);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const handleRemoveImage = (index: number): void => {
    setImages(images.filter((_, i) => i !== index));
  };

  const handleUpload = (): void => {
    if (images.length === 0) {
      Alert.alert('Upload Image', 'Please add at least one prescription image.');
      return;
    }

    if (images.length > 5) {
      Alert.alert('Too Many Images', 'You can upload a maximum of 5 images.');
      return;
    }

    uploadMutation.mutate(images);
  };

  const renderImage = ({ item, index }: ListRenderItemInfo<string>): React.ReactElement => (
    <View style={styles.imageContainer}>
      <View style={styles.imageWrapper}>
        <RNImage source={{ uri: item }} style={styles.image} />
      </View>
      <TouchableOpacity
        style={styles.removeButton}
        onPress={() => handleRemoveImage(index)}
        activeOpacity={0.7}
      >
        <Text style={styles.removeButtonText}>✕</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Upload Prescription</Text>
        <Text style={styles.subtitle}>Add up to 5 images</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Buttons to add images */}
        <View style={styles.section}>
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.button, styles.primaryButton]}
              onPress={() => handlePickImage('camera')}
              disabled={uploading}
              activeOpacity={0.7}
            >
              <Text style={[styles.buttonText, styles.primaryButtonText]}>📷 Camera</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.secondaryButton]}
              onPress={() => handlePickImage('gallery')}
              disabled={uploading}
              activeOpacity={0.7}
            >
              <Text style={[styles.buttonText, styles.secondaryButtonText]}>🖼️ Gallery</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Images or empty state */}
        {images.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Images ({images.length}/5)
            </Text>
            <View style={styles.imageGrid}>
              <FlatList
                data={images}
                renderItem={renderImage}
                keyExtractor={(_, index) => index.toString()}
                scrollEnabled={false}
                numColumns={2}
                columnWrapperStyle={{ gap: theme.spacing.md }}
              />
            </View>
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              📸 Tap Camera or Gallery to add your prescription
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Upload button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.continueButton}
          onPress={handleUpload}
          disabled={uploading}
          activeOpacity={0.7}
        >
          {uploading ? (
            <ActivityIndicator color={theme.colors.paper} />
          ) : (
            <Text style={styles.continueButtonText}>
              {images.length > 0 ? 'Upload' : 'Skip for Now'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
