import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { BrandColors } from '@/constants/theme';
import { Tabs } from 'expo-router';
import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CatalogProvider } from './CatalogContext';

export default function TabLayout() {
  const insets    = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom, 8);

  return (
    <CatalogProvider>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: BrandColors.deepGreen,
          tabBarInactiveTintColor: BrandColors.muted,
          headerShown: false,
          tabBarButton: HapticTab,
          tabBarStyle: {
            backgroundColor: BrandColors.white,
            borderTopColor: BrandColors.midGreen,
            borderTopWidth: 1.5,
            height: 52 + bottomPad,
            paddingBottom: bottomPad,
            paddingTop: 6,
            shadowColor: BrandColors.midGreen,
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.25,
            shadowRadius: 12,
            elevation: 12,
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '600',
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ color }) => (
              <IconSymbol size={26} name="house.fill" color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="scan"
          options={{
            title: 'Scan',
            tabBarIcon: ({ color, focused }) => (
              <IconSymbol
                size={focused ? 30 : 26}
                name="camera.fill"
                color={focused ? BrandColors.midGreen : color}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="explore"
          options={{
            title: 'Catalog',
            tabBarIcon: ({ color }) => (
              <IconSymbol size={26} name="list.bullet" color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="shop"
          options={{
            title: 'Stores',
            tabBarIcon: ({ color }) => (
              <IconSymbol size={26} name="bag.fill" color={color} />
            ),
          }}
        />
        {/* Hidden — not a tab, just a shared context file */}
        <Tabs.Screen
          name="CatalogContext"
          options={{ href: null }}
        />
      </Tabs>
    </CatalogProvider>
  );
}
