import { Stack } from 'expo-router';

/** Avoids raw route title; screen sets its own header. */
export default function ExpenseStackLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}>
      <Stack.Screen name="new" options={{ headerShown: true, title: 'Add expense' }} />
      <Stack.Screen name="[id]" options={{ headerShown: false }} />
    </Stack>
  );
}
