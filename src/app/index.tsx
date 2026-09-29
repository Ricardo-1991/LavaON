import { Redirect } from 'expo-router';

import { useSession } from '@/providers/session-provider';

export default function IndexRoute() {
  const { session } = useSession();
  if (!session) return <Redirect href="/(auth)/login" />;
  if (!session.activeEstablishmentId) return <Redirect href="/(onboarding)" />;
  return <Redirect href="/(main)/(tabs)" />;
}
