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

// ─── Placeholder auth ──────────────────────
async function SignInUser(Username: string, Password: string): Promise<void> {
  return new Promise((resolve, reject) =>
    setTimeout(() =>
      Username && Password.length >= 6
        ? resolve()
        : reject(new Error('Invalid credentials')),
    1000)
  );
}

async function CreateAccount(
  Username: string,
  Email: string,
  Password: string
): Promise<void> {
  return new Promise((resolve, reject) =>
    setTimeout(() =>
      Username && Email.includes('@') && Password.length >= 6
        ? resolve()
        : reject(new Error('Please fill in all fields correctly')),
    1200)
  );
}
// ──────────────────────────────────────────────────────────────────────────────

function GetPasswordStrength(Password: string): {
  Score: number;
  Label: string;
  Color: string;
} {
  if (!Password) return { Score: 0, Label: '', Color: 'transparent' };
  let Score = 0;
  if (Password.length >= 6)             Score++;
  if (Password.length >= 10)            Score++;
  if (/[A-Z]/.test(Password))           Score++;
  if (/[0-9!@#$%^&*]/.test(Password))  Score++;
  const Map = [
    { Label: 'Too short', Color: '#ef5350' },
    { Label: 'Weak',      Color: '#ff7043' },
    { Label: 'Fair',      Color: '#f9a825' },
    { Label: 'Good',      Color: BrandColors.midGreen },
    { Label: 'Strong',    Color: BrandColors.deepGreen },
  ];
  return { Score, ...Map[Score] };
}

export default function SignInScreen() {
  const [IsSignIn, SetIsSignIn]               = useState(true);
  const [Username, SetUsername]               = useState('');
  const [Email, SetEmail]                     = useState('');
  const [Password, SetPassword]               = useState('');
  const [ConfirmPassword, SetConfirmPassword] = useState('');
  const [IsLoading, SetIsLoading]             = useState(false);
  const [ShowPassword, SetShowPassword]       = useState(false);

  const PasswordStrength = GetPasswordStrength(Password);
  const StrengthBarWidth = Password.length === 0
    ? 0
    : (PasswordStrength.Score / 4) * (width - 48 - 32);

  // Pill slide
  const TabWidth = (width - 48 - 8) / 2;
  const PillX    = useSharedValue(0);
  const PillStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: PillX.value }],
  }));

  // Card height animates between sign in and sign up sizes
  const CardH = useSharedValue(420);
  const CardStyle = useAnimatedStyle(() => ({
    height: CardH.value,
  }));

  function ToggleMode() {
    const GoingToSignUp = IsSignIn;
    PillX.value = withTiming(GoingToSignUp ? TabWidth : 0, {
      duration: 250,
      easing: Easing.out(Easing.quad),
    });
    CardH.value = withTiming(GoingToSignUp ? 580 : 420, {
      duration: 300,
      easing: Easing.out(Easing.quad),
    });
    SetIsSignIn(!IsSignIn);
    SetUsername(''); SetEmail(''); SetPassword(''); SetConfirmPassword('');
  }

  async function HandleSubmit() {
    if (!Username || !Password)
    { Alert.alert('Missing fields', 'Please fill in all required fields.'); return; }
    if (!IsSignIn && Password !== ConfirmPassword)
    { Alert.alert('Password mismatch', 'Passwords do not match.'); return; }
    if (!IsSignIn && Password.length < 6)
    { Alert.alert('Weak password', 'Password must be at least 6 characters.'); return; }

    SetIsLoading(true);
    try {
      if (IsSignIn) await SignInUser(Username, Password);
      else          await CreateAccount(Username, Email, Password);
      router.replace('/(tabs)');
    }
    catch (Err: unknown)
    { Alert.alert('Error', Err instanceof Error ? Err.message : 'Something went wrong'); }
    finally
    { SetIsLoading(false); }
  }

  return (
    <KeyboardAvoidingView
      style={styles.Container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar style="light" />

      {/* ── Green top ── */}
      <View style={styles.GreenTop}>
        <Image
          source={require('@/assets/images/logo.png')}
          style={styles.Logo}
          resizeMode="contain"
        />
        <Text style={styles.AppName}>BudgetScout</Text>
      </View>

      {/* ── White card — height animates on toggle ── */}
      <Animated.View style={[styles.CardWrapper, CardStyle]}>
        <ScrollView
          contentContainerStyle={styles.CardScroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View style={styles.DragHandle} />

          {/* Pill tab switcher */}
          <View style={styles.TabPill}>
            <Animated.View style={[styles.TabIndicator, PillStyle]} />
            <TouchableOpacity
              style={styles.TabBtn}
              onPress={() => !IsSignIn && ToggleMode()}
              activeOpacity={0.8}
            >
              <Text style={[
                styles.TabBtnText,
                IsSignIn
                  ? { color: BrandColors.deepGreen, fontWeight: '800' }
                  : { color: '#bbb', fontWeight: '600' },
              ]}>Sign In</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.TabBtn}
              onPress={() => IsSignIn && ToggleMode()}
              activeOpacity={0.8}
            >
              <Text style={[
                styles.TabBtnText,
                !IsSignIn
                  ? { color: BrandColors.deepGreen, fontWeight: '800' }
                  : { color: '#bbb', fontWeight: '600' },
              ]}>Sign Up</Text>
            </TouchableOpacity>
          </View>

          {/* Username */}
          <View style={styles.Field}>
            <Text style={styles.FieldLabel}>USERNAME</Text>
            <TextInput
              style={styles.Input}
              placeholderTextColor={BrandColors.muted}
              value={Username}
              onChangeText={SetUsername}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* Email — sign up only */}
          {!IsSignIn && (
            <View style={styles.Field}>
              <Text style={styles.FieldLabel}>EMAIL</Text>
              <TextInput
                style={styles.Input}
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
          <View style={styles.Field}>
            <Text style={styles.FieldLabel}>PASSWORD</Text>
            <View style={styles.PasswordRow}>
              <TextInput
                style={[styles.Input, styles.PasswordInput]}
                placeholderTextColor={BrandColors.muted}
                value={Password}
                onChangeText={SetPassword}
                secureTextEntry={!ShowPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={styles.EyeBtn}
                onPress={() => SetShowPassword(!ShowPassword)}
              >
                <Text style={{ fontSize: 13, color: BrandColors.muted }}>
                  {ShowPassword ? 'HIDE' : 'SHOW'}
                </Text>
              </TouchableOpacity>
            </View>
            {Password.length > 0 && (
              <View style={styles.StrengthRow}>
                <View style={styles.StrengthTrack}>
                  <View style={[
                    styles.StrengthFill,
                    { width: StrengthBarWidth, backgroundColor: PasswordStrength.Color },
                  ]} />
                </View>
                <Text style={[styles.StrengthLabel, { color: PasswordStrength.Color }]}>
                  {PasswordStrength.Label}
                </Text>
              </View>
            )}
          </View>

          {/* Confirm password — sign up only */}
          {!IsSignIn && (
            <View style={styles.Field}>
              <Text style={styles.FieldLabel}>CONFIRM PASSWORD</Text>
              <TextInput
                style={styles.Input}
                placeholderTextColor={BrandColors.muted}
                value={ConfirmPassword}
                onChangeText={SetConfirmPassword}
                secureTextEntry={!ShowPassword}
                autoCapitalize="none"
              />
            </View>
          )}

          {/* Submit */}
          <TouchableOpacity
            style={[styles.SubmitBtn, IsLoading && { opacity: 0.7 }]}
            onPress={HandleSubmit}
            disabled={IsLoading}
            activeOpacity={0.88}
          >
            {IsLoading
              ? <ActivityIndicator color={BrandColors.white} />
              : <Text style={styles.SubmitText}>
                  {IsSignIn ? 'Sign In' : 'Create Account'}
                </Text>
            }
          </TouchableOpacity>

        </ScrollView>
      </Animated.View>

    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  Container: {
    flex: 1,
    backgroundColor: BrandColors.deepGreen,
    justifyContent: 'flex-end',
  },

  // ── Green top ──
  GreenTop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 40,
  },
  Logo: {
    width: 150,
    height: 150,
    marginBottom: 12,
  },
  AppName: {
    fontSize: 30,
    fontWeight: '800',
    color: BrandColors.white,
    letterSpacing: 0.4,
  },

  // ── White card ──
  CardWrapper: {
    backgroundColor: BrandColors.white,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 20,
    overflow: 'hidden',
  },
  CardScroll: {
    padding: 24,
    paddingBottom: 40,
  },

  DragHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#d4ead6',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 24,
  },

  // ── Pill tab ──
  TabPill: {
    flexDirection: 'row',
    backgroundColor: '#f0f7f0',
    borderRadius: 14,
    padding: 4,
    marginBottom: 20,
    position: 'relative',
  },
  TabIndicator: {
    position: 'absolute',
    top: 4,
    left: 4,
    width: '50%',
    bottom: 4,
    backgroundColor: BrandColors.white,
    borderRadius: 11,
    shadowColor: BrandColors.deepGreen,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  TabBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    zIndex: 1,
  },
  TabBtnText: {
    fontSize: 14,
  },

  // ── Inputs ──
  Field: {
    marginBottom: 14,
  },
  FieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: BrandColors.muted,
    letterSpacing: 0.8,
    marginBottom: 7,
  },
  Input: {
    backgroundColor: '#f7fbf7',
    borderWidth: 1.5,
    borderColor: '#d4ead6',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 15,
    color: BrandColors.darkText,
  },
  PasswordRow: {
    flexDirection: 'row',
  },
  PasswordInput: {
    flex: 1,
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
    borderRightWidth: 0,
  },
  EyeBtn: {
    backgroundColor: '#f7fbf7',
    borderWidth: 1.5,
    borderColor: '#d4ead6',
    borderLeftWidth: 0,
    borderTopRightRadius: 14,
    borderBottomRightRadius: 14,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },

  // ── Password strength ──
  StrengthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  StrengthTrack: {
    flex: 1,
    height: 4,
    backgroundColor: '#e8f5e9',
    borderRadius: 4,
    overflow: 'hidden',
  },
  StrengthFill: {
    height: 4,
    borderRadius: 4,
  },
  StrengthLabel: {
    fontSize: 11,
    fontWeight: '600',
    width: 52,
  },

  // ── Submit ──
  SubmitBtn: {
    backgroundColor: BrandColors.midGreen,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 20,
    shadowColor: BrandColors.midGreen,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  SubmitText: {
    color: BrandColors.white,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
