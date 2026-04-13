import { Stack } from 'expo-router';

export default function RootLayout()
{
  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* Splash — first screen user sees */}
      <Stack.Screen name="index" />

      {/* Auth */}
      <Stack.Screen
        name="signin"
        options={{
          animation: 'fade',
        }}
      />

      {/* Main app tabs */}
      <Stack.Screen
        name="(tabs)"
        options={{
          animation: 'fade',
        }}
      />
    </Stack>
  );
}
