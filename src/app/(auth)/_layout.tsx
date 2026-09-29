import { Redirect, Stack } from 'expo-router';

import { useSession } from '@/providers/session-provider';

export default function AuthLayout() {
  const { session } = useSession();
  if (session) return <Redirect href="/" />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
