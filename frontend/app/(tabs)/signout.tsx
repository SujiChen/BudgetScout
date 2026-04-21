import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';

export default function SettingsScreen() {

  function HandleSignOut() {
    router.replace('/signin'); // 👈 this goes back to your sign-in screen
  }

  return (
    <View style={styles.Container}>
      <Text style={styles.Title}>Settings</Text>

      <TouchableOpacity style={styles.SignOutBtn} onPress={HandleSignOut}>
        <Text style={styles.SignOutText}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  Container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },

  Title: {
    color: 'white',
    fontSize: 24,
    marginBottom: 40,
    fontWeight: '700',
  },

  SignOutBtn: {
    backgroundColor: '#ef5350',
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 12,
  },

  SignOutText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
});