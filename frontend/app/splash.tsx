import { BrandColors } from '@/constants/theme';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Dimensions, Image, StyleSheet } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming
} from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');

export default function SplashScreen()
{
  const logoOpacity = useSharedValue(0);
  const logoScale = useSharedValue(0.7);
  const taglineOpacity = useSharedValue(0);
  const screenOpacity = useSharedValue(1);

  function NavigateToSignIn()
  {
    router.replace('/signin');
  }

  useEffect(() =>
  {
    // Logo fades + scales in
    logoOpacity.value = withTiming(1, {
      duration: 800,
      easing: Easing.out(Easing.cubic),
    });
    logoScale.value = withTiming(1, {
      duration: 800,
      easing: Easing.out(Easing.back(1.1)),
    });

    // Tagline fades in after logo
    taglineOpacity.value = withDelay(
      700,
      withTiming(1, { duration: 600 })
    );

    // Whole screen fades out, then navigate
    screenOpacity.value = withDelay(
      2200,
      withTiming(0, { duration: 500 }, (finished) =>
      {
        if (finished)
        {
          runOnJS(NavigateToSignIn)();
        }
      })
    );
  }, []);

  const LogoAnimatedStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  const TaglineAnimatedStyle = useAnimatedStyle(() => ({
    opacity: taglineOpacity.value,
  }));

  const ScreenAnimatedStyle = useAnimatedStyle(() => ({
    opacity: screenOpacity.value,
  }));

  return (
    <Animated.View style={[styles.Container, ScreenAnimatedStyle]}>
      <StatusBar style="light" />
      <Animated.View style={[styles.LogoWrapper, LogoAnimatedStyle]}>
        <Image
          source={require('@/assets/images/logo.png')}
          style={styles.Logo}
          resizeMode="contain"
        />
      </Animated.View>
      
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  Container: {
    flex: 1,
    backgroundColor: BrandColors.deepGreen,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
  },
  LogoWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  Logo: {
    width: width * 0.62,
    height: width * 0.62,
  },
  Tagline: {
    color: BrandColors.mintGreen,
    fontSize: 15,
    fontStyle: 'italic',
    letterSpacing: 0.4,
    marginTop: -8,
  },
});
