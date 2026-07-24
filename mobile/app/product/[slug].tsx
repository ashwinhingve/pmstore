/**
 * Product detail screen with the Strip (horizontal scrollable list of alternatives).
 *
 * Features:
 * - Main product image
 * - Product info (name, manufacturer, form)
 * - Composition (salts + strengths in mono)
 * - The Strip — same-composition alternatives sorted by unitPrice
 * - Out-of-stock alternatives dimmed and sorted last
 * - Add to cart
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  ListRenderItemInfo,
  Alert,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Image } from 'expo-image';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { useCartStore } from '@/store/cart';
import { ProductCard } from '@/lib/api/types';
import { theme } from '@/lib/theme';

const SCREEN_WIDTH = Dimensions.get('window').width;
const PRODUCT_CARD_WIDTH = SCREEN_WIDTH - theme.spacing.lg * 2;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.paper,
  },
  header: {
    height: 300,
    backgroundColor: theme.colors.paperCard,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  backButton: {
    position: 'absolute',
    top: theme.spacing.lg,
    left: theme.spacing.lg,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.paperCard,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  image: {
    width: 200,
    height: 200,
    borderRadius: theme.radius.md,
  },
  content: {
    padding: theme.spacing.lg,
  },
  title: {
    fontSize: theme.typography.sizes.xl,
    fontWeight: '800',
    color: theme.colors.ink,
    marginBottom: theme.spacing.sm,
  },
  manufacturer: {
    fontSize: theme.typography.sizes.base,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.lg,
  },
  priceBlock: {
    marginBottom: theme.spacing.lg,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.mintSoft,
    borderRadius: theme.radius.md,
  },
  priceLabel: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  unitPrice: {
    fontSize: theme.typography.sizes['2xl'],
    fontWeight: '700',
    color: theme.colors.mint,
    fontFamily: theme.typography.families.mono,
    marginBottom: 8,
  },
  packSize: {
    fontSize: theme.typography.sizes.base,
    color: theme.colors.textSecondary,
    fontFamily: theme.typography.families.mono,
  },
  stock: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: '600',
    marginTop: 8,
  },
  stockInStock: {
    color: theme.colors.mint,
  },
  stockOutOfStock: {
    color: theme.colors.error,
  },
  section: {
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: '700',
    color: theme.colors.ink,
    marginBottom: theme.spacing.md,
  },
  composition: {
    padding: theme.spacing.md,
    backgroundColor: theme.colors.foilSoft,
    borderRadius: theme.radius.md,
    fontFamily: theme.typography.families.mono,
  },
  compositionText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.ink,
    lineHeight: 20,
  },
  rxBadge: {
    backgroundColor: theme.colors.rxSoft,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.sm,
    marginBottom: theme.spacing.lg,
    alignSelf: 'flex-start',
  },
  rxBadgeText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.rx,
    fontWeight: '700',
  },
  stripTitle: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: '700',
    color: theme.colors.ink,
    marginBottom: theme.spacing.md,
  },
  stripContainer: {
    height: 280,
    marginBottom: theme.spacing.lg,
  },
  alternativeCard: {
    width: PRODUCT_CARD_WIDTH - 20,
    marginHorizontal: 10,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.paperCard,
    borderRadius: theme.radius.md,
    borderWidth: 2,
    borderColor: theme.colors.border,
    justifyContent: 'space-between',
  },
  alternativeCardActive: {
    borderColor: theme.colors.mint,
    backgroundColor: theme.colors.mintSoft,
  },
  alternativeCardOutOfStock: {
    opacity: 0.5,
  },
  alternativeName: {
    fontSize: theme.typography.sizes.base,
    fontWeight: '700',
    color: theme.colors.ink,
    marginBottom: 4,
  },
  alternativeManufacturer: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  alternativePrice: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: '700',
    color: theme.colors.ink,
    fontFamily: theme.typography.families.mono,
    marginBottom: 4,
  },
  alternativePackSize: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textSecondary,
    fontFamily: theme.typography.families.mono,
    marginBottom: theme.spacing.md,
  },
  selectButton: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.ink,
    borderRadius: theme.radius.sm,
    alignItems: 'center',
  },
  selectButtonText: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: '700',
    color: theme.colors.paper,
  },
  addToCartButton: {
    backgroundColor: theme.colors.mint,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    minHeight: theme.touchTargets.small,
    justifyContent: 'center',
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
  },
  addToCartButtonText: {
    fontSize: theme.typography.sizes.base,
    fontWeight: '700',
    color: theme.colors.paper,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

interface AlternativeWithBadges extends ProductCard {
  isCheapest?: boolean;
  isTopRated?: boolean;
}

export default function ProductDetailScreen(): React.ReactElement {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [selectedProduct, setSelectedProduct] = useState<ProductCard | null>(null);
  const stripRef = useRef<FlatList>(null);

  const { data: product, isLoading: productLoading } = useQuery({
    queryKey: ['product', slug],
    queryFn: async (): Promise<ProductCard> => {
      return apiClient.get<ProductCard>(`/products/${slug}`);
    },
    enabled: !!slug,
  });

  const { data: alternatives = [], isLoading: altLoading } = useQuery({
    queryKey: ['alternatives', product?._id],
    queryFn: async (): Promise<ProductCard[]> => {
      return apiClient.get<ProductCard[]>(
        `/products/${slug}/alternatives`
      );
    },
    enabled: !!product,
  });

  const { addItem } = useCartStore();

  useEffect(() => {
    if (product) {
      setSelectedProduct(product);
    }
  }, [product]);

  const handleAddToCart = (): void => {
    if (!selectedProduct) return;

    if (selectedProduct.stock === 0) {
      Alert.alert('Out of Stock', 'This product is currently out of stock.');
      return;
    }

    addItem({
      productId: selectedProduct._id,
      slug: selectedProduct.slug,
      name: selectedProduct.name,
      quantity: 1,
      unitPrice: selectedProduct.unitPrice,
      price: selectedProduct.price,
      prescriptionRequired: selectedProduct.prescriptionRequired,
      scheduleClass: selectedProduct.scheduleClass,
    });

    Alert.alert('Added to Cart', `${selectedProduct.name} added to your cart.`, [
      { text: 'Continue Shopping', onPress: () => {} },
      { text: 'Go to Cart', onPress: () => router.push('/(tabs)/cart') },
    ]);
  };

  const renderAlternative = (
    { item, index }: ListRenderItemInfo<ProductCard>,
    selected: ProductCard | null
  ): React.ReactElement => {
    const isSelected = selected?._id === item._id;
    const isOutOfStock = item.stock === 0;

    return (
      <TouchableOpacity
        onPress={() => setSelectedProduct(item)}
        activeOpacity={0.7}
      >
        <View
          style={[
            styles.alternativeCard,
            isSelected && styles.alternativeCardActive,
            isOutOfStock && styles.alternativeCardOutOfStock,
          ]}
        >
          <View>
            <Text style={styles.alternativeName}>{item.name}</Text>
            <Text style={styles.alternativeManufacturer}>{item.manufacturer}</Text>
            <Text style={styles.alternativePrice}>₹{item.unitPrice.toFixed(2)}</Text>
            <Text style={styles.alternativePackSize}>
              {item.packSize} {item.packUnit}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.selectButton}
            onPress={() => setSelectedProduct(item)}
            activeOpacity={0.7}
          >
            <Text style={styles.selectButtonText}>
              {isSelected ? 'Selected' : 'Select'}
            </Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  if (productLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator color={theme.colors.ink} size="large" />
      </View>
    );
  }

  if (!product) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <Text>Product not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header with image */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Text>←</Text>
        </TouchableOpacity>

        {product.images[0] ? (
          <Image
            source={{ uri: product.images[0].url }}
            style={styles.image}
            contentFit="contain"
          />
        ) : (
          <View style={[styles.image, { backgroundColor: theme.colors.foilSoft }]} />
        )}
      </View>

      {/* Product info */}
      <View style={styles.content}>
        <Text style={styles.title}>{product.name}</Text>
        <Text style={styles.manufacturer}>{product.manufacturer}</Text>

        {/* Rx badge if needed */}
        {product.prescriptionRequired ? (
          <View style={styles.rxBadge}>
            <Text style={styles.rxBadgeText}>🔴 Prescription Required ({product.scheduleClass})</Text>
          </View>
        ) : null}

        {/* Price block */}
        <View style={styles.priceBlock}>
          <Text style={styles.priceLabel}>Price per {product.packUnit.toLowerCase()}</Text>
          <Text style={styles.unitPrice}>₹{selectedProduct?.unitPrice.toFixed(2)}</Text>
          <Text style={styles.packSize}>
            Pack: {selectedProduct?.packSize} {selectedProduct?.packUnit}
          </Text>
          <Text
            style={[
              styles.stock,
              selectedProduct?.stock! > 0 ? styles.stockInStock : styles.stockOutOfStock,
            ]}
          >
            {selectedProduct?.stock! > 0 ? `${selectedProduct?.stock} in stock` : 'Out of stock'}
          </Text>
        </View>

        {/* Composition */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Composition</Text>
          <View style={styles.composition}>
            <Text style={styles.compositionText}>
              {product.salts.map((s) => `${s.name} ${s.strength}${s.unit}`).join('\n')}
            </Text>
          </View>
        </View>

        {/* The Strip — alternatives */}
        {altLoading ? (
          <ActivityIndicator color={theme.colors.ink} />
        ) : alternatives.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.stripTitle}>
              Other {product.form}s ({alternatives.length})
            </Text>
            <View style={styles.stripContainer}>
              <FlatList
                ref={stripRef}
                data={alternatives}
                renderItem={(info) => renderAlternative(info, selectedProduct)}
                keyExtractor={(item) => item._id}
                horizontal
                snapToInterval={PRODUCT_CARD_WIDTH}
                decelerationRate="fast"
                scrollEnabled
                showsHorizontalScrollIndicator={false}
              />
            </View>
          </View>
        ) : null}

        {/* Add to cart */}
        <TouchableOpacity
          style={styles.addToCartButton}
          onPress={handleAddToCart}
          disabled={selectedProduct?.stock === 0}
          activeOpacity={0.7}
        >
          <Text style={styles.addToCartButtonText}>
            {selectedProduct?.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
