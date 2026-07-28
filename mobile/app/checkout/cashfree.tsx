/**
 * Cashfree hosted checkout in a WebView.
 *
 * We get a paymentSessionId from POST /api/v1/payment/initiate, then load
 * Cashfree's v3 web SDK and call checkout(). After payment, Cashfree redirects
 * to CASHFREE_RETURN_URL (our /api/payment/callback), which verifies the payment
 * server-side and marks the order. We detect that redirect, then send the user
 * to the order screen (its status reflects the real outcome).
 *
 * Mode comes from EXPO_PUBLIC_CASHFREE_MODE (sandbox | production), default
 * sandbox — must match the server's CASHFREE_ENV.
 */

import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { WebView, WebViewNavigation } from 'react-native-webview';
import { useLocalSearchParams, router } from 'expo-router';
import { useCartStore } from '@/store/cart';
import { theme } from '@/lib/theme';

const MODE = process.env.EXPO_PUBLIC_CASHFREE_MODE === 'production' ? 'production' : 'sandbox';

export default function CashfreeCheckoutScreen(): React.ReactElement {
  const { paymentSessionId, orderId } = useLocalSearchParams<{
    paymentSessionId: string;
    orderId: string;
  }>();
  const clearCart = useCartStore((s) => s.clearCart);
  const [loading, setLoading] = useState(true);
  const done = useRef(false);

  const html = `<!doctype html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
<script src="https://sdk.cashfree.com/js/v3/cashfree.js"></script>
</head>
<body style="margin:0;font-family:sans-serif">
<script>
  try {
    var cashfree = Cashfree({ mode: "${MODE}" });
    cashfree.checkout({ paymentSessionId: ${JSON.stringify(paymentSessionId)}, redirectTarget: "_self" });
  } catch (e) {
    document.body.innerText = "Could not start payment.";
  }
</script>
</body>
</html>`;

  // When the WebView reaches our payment callback, the transaction is complete
  // (server verifies it). Send the user to the order and clear the cart once.
  const onNav = (nav: WebViewNavigation) => {
    if (done.current) return;
    if (nav.url.includes('/api/payment/callback') || nav.url.includes('/orders/')) {
      done.current = true;
      clearCart();
      router.replace(`/orders/${orderId}`);
    }
  };

  return (
    <View style={styles.container}>
      <WebView
        source={{ html, baseUrl: 'https://sdk.cashfree.com' }}
        onNavigationStateChange={onNav}
        onLoadEnd={() => setLoading(false)}
        javaScriptEnabled
        domStorageEnabled
        startInLoadingState
      />
      {loading ? (
        <View style={styles.overlay}>
          <ActivityIndicator color={theme.colors.ink} size="large" />
          <Text style={styles.overlayText}>Opening secure checkout…</Text>
        </View>
      ) : null}
      <TouchableOpacity style={styles.cancel} onPress={() => router.replace(`/orders/${orderId}`)}>
        <Text style={styles.cancelText}>Cancel payment</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.paper },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.md,
    backgroundColor: theme.colors.paper,
  },
  overlayText: { color: theme.colors.textSecondary, fontSize: theme.typography.sizes.base },
  cancel: {
    padding: theme.spacing.md,
    alignItems: 'center',
    borderTopColor: theme.colors.border,
    borderTopWidth: 1,
    backgroundColor: theme.colors.paperCard,
  },
  cancelText: { color: theme.colors.textSecondary, fontSize: theme.typography.sizes.sm },
});
