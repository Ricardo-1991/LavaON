import { Redirect, Stack } from 'expo-router';

import { useSession } from '@/providers/session-provider';

export default function OnboardingLayout() {
  const { session } = useSession();
  if (!session) return <Redirect href="/(auth)/login" />;
  if (session.activeEstablishmentId) return <Redirect href="/(main)/(tabs)" />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
