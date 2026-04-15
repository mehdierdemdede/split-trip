import { Stack } from 'expo-router';

/** Hides the outer route title; real titles come from trip/[id]/_layout Stack. */
export default function TripStackLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}>
      <Stack.Screen name="new" options={{ headerShown: true, title: 'New trip' }} />
      <Stack.Screen name="[id]" options={{ headerShown: false }} />
    </Stack>
  );
}
