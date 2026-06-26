import { Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function OnboardingLayout() {
  const insets = useSafeAreaInsets();
  return (
    <Stack
      screenOptions={{
        contentStyle: { paddingTop: insets.top, paddingBottom: insets.bottom },
      }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
    </Stack>
  );
}
