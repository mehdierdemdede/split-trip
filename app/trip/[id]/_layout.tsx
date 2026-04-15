import { Stack } from 'expo-router';

export default function TripDetailLayout() {
  return (
    <Stack screenOptions={{ headerShown: true }}>
      <Stack.Screen name="index" options={{ title: '' }} />
      <Stack.Screen name="edit" options={{ title: 'Trip settings' }} />
      <Stack.Screen name="add-participant" options={{ title: 'Add participant' }} />
      <Stack.Screen name="summary" options={{ title: 'Summary' }} />
      <Stack.Screen name="backup" options={{ title: 'Backup' }} />
    </Stack>
  );
}
