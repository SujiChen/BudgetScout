import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

export default function RootLayout()
{
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }}>
        {/* Splash — first screen user sees */}
        <Stack.Screen name="index" />

        {/* Auth */}
        <Stack.Screen
          name="signin"
          options={{ animation: 'fade' }}
        />

        {/* Main app tabs */}
        <Stack.Screen
          name="(tabs)"
          options={{ animation: 'fade' }}
        />
      </Stack>
    </GestureHandlerRootView>
  );
}
