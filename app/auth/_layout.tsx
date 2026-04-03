import { Stack } from 'expo-router';
import { Colors } from '../../src/constants/theme';

// Auth stack: sign-in, sign-up, forgot-password.
// No bottom tab bar — clean, focused authentication flow.
export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.background },
        animation: 'slide_from_right',
      }}
    />
  );
}
