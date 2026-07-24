/**
 * Tab navigation — Home, Search, Cart, Orders, Account.
 *
 * Each tab is a separate screen accessible from the bottom tab bar.
 * Cart badge shows item count. Touch targets are all ≥44pt.
 */

import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { BottomTabNavigationOptions, createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useCartStore } from '@/store/cart';
import { theme } from '@/lib/theme';

// Import tab screens
import HomeScreen from './index';
import SearchScreen from './search';
import CartScreen from './cart';
import OrdersScreen from './orders';
import AccountScreen from './account';

const Tab = createBottomTabNavigator();

const styles = StyleSheet.create({
  tabBarLabel: {
    fontSize: theme.typography.sizes.xs,
    fontWeight: '600',
    marginTop: 4,
  },
  badge: {
    position: 'absolute',
    right: -4,
    top: -4,
    backgroundColor: theme.colors.rx,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: theme.colors.paper,
    fontSize: 12,
    fontWeight: '700',
  },
});

/**
 * Tab bar badge showing cart item count.
 */
function CartTabBadge(): React.ReactElement | null {
  const cartItems = useCartStore((state) => state.items);
  const itemCount = cartItems.length;

  if (itemCount === 0) {
    return null;
  }

  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{itemCount > 9 ? '9+' : itemCount}</Text>
    </View>
  );
}

/**
 * Shared tab bar options.
 */
const defaultTabOptions: BottomTabNavigationOptions = {
  headerShown: false,
  tabBarActiveTintColor: theme.colors.ink,
  tabBarInactiveTintColor: theme.colors.textTertiary,
  tabBarStyle: {
    backgroundColor: theme.colors.paperCard,
    borderTopColor: theme.colors.border,
    borderTopWidth: 1,
    height: 60 + 24, // 60pt + safe area
    paddingBottom: 12,
    paddingTop: 6,
  },
  tabBarLabelStyle: styles.tabBarLabel,
  tabBarIconStyle: {
    width: 24,
    height: 24,
  },
};

/**
 * Icon components (using simple text for now; replace with proper icon library).
 */
const HomeIcon = ({ focused }: { focused: boolean }): React.ReactElement => (
  <Text style={{ fontSize: 24, opacity: focused ? 1 : 0.5 }}>🏠</Text>
);

const SearchIcon = ({ focused }: { focused: boolean }): React.ReactElement => (
  <Text style={{ fontSize: 24, opacity: focused ? 1 : 0.5 }}>🔍</Text>
);

const CartIcon = ({ focused }: { focused: boolean }): React.ReactElement => (
  <View style={{ position: 'relative' }}>
    <Text style={{ fontSize: 24, opacity: focused ? 1 : 0.5 }}>🛒</Text>
    <CartTabBadge />
  </View>
);

const OrdersIcon = ({ focused }: { focused: boolean }): React.ReactElement => (
  <Text style={{ fontSize: 24, opacity: focused ? 1 : 0.5 }}>📦</Text>
);

const AccountIcon = ({ focused }: { focused: boolean }): React.ReactElement => (
  <Text style={{ fontSize: 24, opacity: focused ? 1 : 0.5 }}>👤</Text>
);

export default function TabsLayout(): React.ReactElement {
  return (
    <Tab.Navigator screenOptions={defaultTabOptions}>
      <Tab.Screen
        name="index"
        component={HomeScreen}
        options={{
          title: 'Home',
          tabBarIcon: HomeIcon,
        }}
      />
      <Tab.Screen
        name="search"
        component={SearchScreen}
        options={{
          title: 'Search',
          tabBarIcon: SearchIcon,
        }}
      />
      <Tab.Screen
        name="cart"
        component={CartScreen}
        options={{
          title: 'Cart',
          tabBarIcon: CartIcon,
        }}
      />
      <Tab.Screen
        name="orders"
        component={OrdersScreen}
        options={{
          title: 'Orders',
          tabBarIcon: OrdersIcon,
        }}
      />
      <Tab.Screen
        name="account"
        component={AccountScreen}
        options={{
          title: 'Account',
          tabBarIcon: AccountIcon,
        }}
      />
    </Tab.Navigator>
  );
}
