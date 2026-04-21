import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { BrandColors } from '@/constants/theme';
import { Tabs, router } from 'expo-router';
import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CatalogProvider } from './CatalogContext';
import { Alert } from 'react-native';

// fix TS warning
type TabIconProps = {
  color: string;
  focused: boolean;
};

export default function TabLayout() {
  const insets = useSafeAreaInsets();
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
        {/* HOME */}
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ color }: { color: string }) => (
              <IconSymbol size={26} name="house.fill" color={color} />
            ),
          }}
        />

        {/* SCAN */}
        <Tabs.Screen
          name="scan"
          options={{
            title: 'Scan',
            tabBarIcon: ({ color, focused }: TabIconProps) => (
              <IconSymbol
                size={focused ? 30 : 26}
                name="camera.fill"
                color={focused ? BrandColors.midGreen : color}
              />
            ),
          }}
        />

        {/* CATALOG */}
        <Tabs.Screen
          name="explore"
          options={{
            title: 'Catalog',
            tabBarIcon: ({ color }: { color: string }) => (
              <IconSymbol size={26} name="list.bullet" color={color} />
            ),
          }}
        />

        {/* STORES */}
        <Tabs.Screen
          name="shop"
          options={{
            title: 'Stores',
            tabBarIcon: ({ color }: { color: string }) => (
              <IconSymbol size={26} name="bag.fill" color={color} />
            ),
          }}
        />

        {/* HIDDEN FILE */}
        <Tabs.Screen
          name="CatalogContext"
          options={{ href: null }}
        />

        {/* 🔥 SIGN OUT TAB */}
        <Tabs.Screen
          name="signout"
          options={{
            title: 'Sign Out',
            tabBarIcon: ({ color }: { color: string }) => (
              <IconSymbol
                size={26}
                name="arrow.right.square.fill"
                color={color}
              />
            ),
          }}
          listeners={{
            tabPress: (e) => {
              e.preventDefault();

              Alert.alert(
                'Sign Out',
                'Are you sure you want to sign out?',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Sign Out',
                    style: 'destructive',
                    onPress: () => router.replace('/signin'),
                  },
                ]
              );
            },
          }}
        />
      </Tabs>
    </CatalogProvider>
  );
}