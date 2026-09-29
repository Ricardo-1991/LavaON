import { Redirect, Stack } from 'expo-router';

import { useSession } from '@/providers/session-provider';

export default function MainLayout() {
  const { session } = useSession();
  if (!session) return <Redirect href="/(auth)/login" />;
  if (!session.activeEstablishmentId) return <Redirect href="/(onboarding)" />;
  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="reservations/[id]" options={{ title: 'Detalhes da reserva' }} />
      <Stack.Screen name="schedule/[date]" options={{ title: 'Agenda do dia' }} />
      <Stack.Screen name="services/index" options={{ title: 'Serviços' }} />
      <Stack.Screen name="services/new" options={{ title: 'Novo serviço' }} />
      <Stack.Screen name="services/[id]" options={{ title: 'Editar serviço' }} />
      <Stack.Screen name="settings/establishment" options={{ title: 'Estabelecimento' }} />
      <Stack.Screen name="settings/operating" options={{ title: 'Funcionamento' }} />
      <Stack.Screen name="settings/account" options={{ title: 'Conta' }} />
    </Stack>
  );
}
