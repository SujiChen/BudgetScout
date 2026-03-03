import { BrandColors } from '@/constants/theme';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Image,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import Animated, {
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from 'react-native-reanimated';

const { width } = Dimensions.get('window');

// ─── Placeholder auth functions ────────────────────────────────────────────────
// TODO: Replace with real database calls (e.g. Supabase / Firebase)

async function SignInUser(Username: string, Password: string): Promise<void>
{
  return new Promise((resolve, reject) =>
  {
    setTimeout(() =>
    {
      if (Username && Password.length >= 6)
      {
        resolve();
      }
      else
      {
        reject(new Error('Invalid credentials'));
      }
    }, 1000);
  });
}

async function CreateAccount(
  Username: string,
  Email: string,
  Password: string
): Promise<void>
{
  return new Promise((resolve, reject) =>
  {
    setTimeout(() =>
    {
      if (Username && Email.includes('@') && Password.length >= 6)
      {
        resolve();
      }
      else
      {
        reject(new Error('Please fill in all fields correctly'));
      }
    }, 1200);
  });
}
// ───────────────────────────────────────────────────────────────────────────────

export default function SignInScreen()
{
  const [IsSignIn, SetIsSignIn] = useState(true);
  const [Username, SetUsername] = useState('');
  const [Email, SetEmail] = useState('');
  const [Password, SetPassword] = useState('');
  const [ConfirmPassword, SetConfirmPassword] = useState('');
  const [IsLoading, SetIsLoading] = useState(false);
  const [ShowPassword, SetShowPassword] = useState(false);

  // Animated slide for toggling sign in / create account
  const SlideX = useSharedValue(0);

  const CardStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: SlideX.value }],
  }));

  function ToggleMode()
  {
    const ToRight = IsSignIn ? width : -width;
    SlideX.value = withTiming(ToRight, { duration: 120, easing: Easing.in(Easing.quad) }, () =>
    {
      SlideX.value = -ToRight;
      SlideX.value = withTiming(0, { duration: 200, easing: Easing.out(Easing.quad) });
    });
    SetIsSignIn(!IsSignIn);
    SetUsername('');
    SetEmail('');
    SetPassword('');
    SetConfirmPassword('');
  }

  async function HandleSubmit()
  {
    if (!Username || !Password)
    {
      Alert.alert('Missing fields', 'Please fill in all required fields.');
      return;
    }
    if (!IsSignIn && Password !== ConfirmPassword)
    {
      Alert.alert('Password mismatch', 'Passwords do not match.');
      return;
    }
    if (!IsSignIn && Password.length < 6)
    {
      Alert.alert('Weak password', 'Password must be at least 6 characters.');
      return;
    }

    SetIsLoading(true);
    try
    {
      if (IsSignIn)
      {
        await SignInUser(Username, Password);
      }
      else
      {
        await CreateAccount(Username, Email, Password);
      }
      router.replace('/(tabs)');
    }
    catch (Error_: unknown)
    {
      const Message = Error_ instanceof Error ? Error_.message : 'Something went wrong';
      Alert.alert('Error', Message);
    }
    finally
    {
      SetIsLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.Container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar style="light" />

      {/* Top green header with logo */}
      <View style={styles.Header}>
        <Image
          source={require('@/assets/images/logo.png')}
          style={styles.HeaderLogo}
          resizeMode="contain"
        />
        <Text style={styles.HeaderTitle}>BudgetScout</Text>
        <Text style={styles.HeaderSubtitle}>
          {IsSignIn ? 'Welcome back, Scout!' : 'Join the hunt for deals!'}
        </Text>
      </View>

      {/* Card */}
      <ScrollView
        contentContainerStyle={styles.ScrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={[styles.Card, CardStyle]}>

          <Text style={styles.CardTitle}>
            {IsSignIn ? 'Sign In' : 'Create Account'}
          </Text>

          {/* Username */}
          <View style={styles.InputGroup}>
            <Text style={styles.Label}>Username</Text>
            <TextInput
              style={styles.Input}
              placeholder="e.g. scout_shopper"
              placeholderTextColor={BrandColors.muted}
              value={Username}
              onChangeText={SetUsername}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* Email — only on create account */}
          {!IsSignIn && (
            <View style={styles.InputGroup}>
              <Text style={styles.Label}>Email</Text>
              <TextInput
                style={styles.Input}
                placeholder="you@example.com"
                placeholderTextColor={BrandColors.muted}
                value={Email}
                onChangeText={SetEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          )}

          {/* Password */}
          <View style={styles.InputGroup}>
            <Text style={styles.Label}>Password</Text>
            <View style={styles.PasswordRow}>
              <TextInput
                style={[styles.Input, styles.PasswordInput]}
                placeholder="Min. 6 characters"
                placeholderTextColor={BrandColors.muted}
                value={Password}
                onChangeText={SetPassword}
                secureTextEntry={!ShowPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                onPress={() => SetShowPassword(!ShowPassword)}
                style={styles.EyeBtn}
              >
                <Text style={styles.EyeIcon}>{ShowPassword ? '🙈' : '👁️'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Confirm password — only on create account */}
          {!IsSignIn && (
            <View style={styles.InputGroup}>
              <Text style={styles.Label}>Confirm Password</Text>
              <TextInput
                style={styles.Input}
                placeholder="Re-enter password"
                placeholderTextColor={BrandColors.muted}
                value={ConfirmPassword}
                onChangeText={SetConfirmPassword}
                secureTextEntry={!ShowPassword}
                autoCapitalize="none"
              />
            </View>
          )}

          {/* Submit button */}
          <TouchableOpacity
            style={[styles.SubmitBtn, IsLoading && styles.SubmitBtnDisabled]}
            onPress={HandleSubmit}
            disabled={IsLoading}
            activeOpacity={0.85}
          >
            {IsLoading
              ? <ActivityIndicator color={BrandColors.white} />
              : <Text style={styles.SubmitText}>
                  {IsSignIn ? 'Sign In →' : 'Create Account →'}
                </Text>
            }
          </TouchableOpacity>

          {/* Toggle */}
          <View style={styles.ToggleRow}>
            <Text style={styles.TogglePrompt}>
              {IsSignIn ? "Don't have an account? " : 'Already have an account? '}
            </Text>
            <TouchableOpacity onPress={ToggleMode}>
              <Text style={styles.ToggleLink}>
                {IsSignIn ? 'Sign Up' : 'Sign In'}
              </Text>
            </TouchableOpacity>
          </View>

        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  Container: {
    flex: 1,
    backgroundColor: BrandColors.deepGreen,
  },
  Header: {
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 28,
    paddingHorizontal: 24,
  },
  HeaderLogo: {
    width: 72,
    height: 72,
    marginBottom: 8,
  },
  HeaderTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: BrandColors.white,
    letterSpacing: 0.5,
  },
  HeaderSubtitle: {
    fontSize: 14,
    color: BrandColors.mintGreen,
    marginTop: 4,
    fontStyle: 'italic',
  },
  ScrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  Card: {
    backgroundColor: BrandColors.white,
    borderRadius: 28,
    padding: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 10,
  },
  CardTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: BrandColors.deepGreen,
    marginBottom: 22,
  },
  InputGroup: {
    marginBottom: 16,
  },
  Label: {
    fontSize: 13,
    fontWeight: '600',
    color: BrandColors.deepGreen,
    marginBottom: 6,
    letterSpacing: 0.2,
  },
  Input: {
    backgroundColor: '#f4faf4',
    borderWidth: 1.5,
    borderColor: '#d0ead2',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: BrandColors.darkText,
  },
  PasswordRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  PasswordInput: {
    flex: 1,
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
    borderRightWidth: 0,
  },
  EyeBtn: {
    backgroundColor: '#f4faf4',
    borderWidth: 1.5,
    borderColor: '#d0ead2',
    borderLeftWidth: 0,
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  EyeIcon: {
    fontSize: 16,
  },
  SubmitBtn: {
    backgroundColor: BrandColors.midGreen,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: BrandColors.midGreen,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  SubmitBtnDisabled: {
    opacity: 0.7,
  },
  SubmitText: {
    color: BrandColors.white,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  ToggleRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  TogglePrompt: {
    color: BrandColors.muted,
    fontSize: 14,
  },
  ToggleLink: {
    color: BrandColors.midGreen,
    fontSize: 14,
    fontWeight: '700',
  },
});
