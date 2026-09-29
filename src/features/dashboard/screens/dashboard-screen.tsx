import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useDashboard, useEstablishment } from '@/data/query/hooks';
import { getErrorMessage } from '@/domain/errors';
import { getTodayInTimeZone } from '@/domain/rules/reservations';
import { ReservationCard } from '@/features/reservations/components/reservation-card';
import { CapacitySummary } from '@/features/schedule/components/capacity-summary';
import { useSession } from '@/providers/session-provider';
import { colors, radius, spacing, typography } from '@/shared/theme';
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
  ScreenContainer,
  SectionHeader,
  uiStyles,
} from '@/shared/ui';
import { formatCalendarDate } from '@/shared/utils/format';

export default function DashboardScreen() {
  const router = useRouter();
  const { session } = useSession();
  const establishment = useEstablishment();
  const today = getTodayInTimeZone(establishment.data?.timeZone ?? 'America/Sao_Paulo');
  const dashboard = useDashboard(today);
  if (establishment.isLoading || dashboard.isLoading)
    return <LoadingState label="Preparando seu dia…" />;
  if (establishment.error || dashboard.error || !dashboard.data)
    return (
      <ErrorState
        message={getErrorMessage(establishment.error ?? dashboard.error)}
        onRetry={() => {
          void establishment.refetch();
          void dashboard.refetch();
        }}
      />
    );
  const data = dashboard.data;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
  return (
    <ScreenContainer>
      <View style={styles.heading}>
        <Text style={styles.kicker}>{establishment.data?.name}</Text>
        <Text style={uiStyles.title}>
          {greeting}, {session?.owner.name.split(' ')[0]}.
        </Text>
        <Text style={styles.date}>{formatCalendarDate(today)}</Text>
      </View>
      <CapacitySummary capacity={data.capacity} />
      {data.activeServiceCount === 0 ? (
        <Card>
          <Text style={uiStyles.heading}>Cadastre seu primeiro serviço</Text>
          <Text style={uiStyles.muted}>
            Serviços ativos são necessários para receber solicitações quando a página pública for
            conectada.
          </Text>
          <Button title="Cadastrar serviço" onPress={() => router.push('/services/new')} />
        </Card>
      ) : null}
      <View style={styles.shortcuts}>
        <Shortcut
          icon="calendar-outline"
          label="Ver agenda"
          onPress={() => router.push('/schedule')}
        />
        <Shortcut
          icon="car-outline"
          label="Reservas"
          onPress={() => router.push('/reservations')}
        />
        <Shortcut icon="water-outline" label="Serviços" onPress={() => router.push('/services')} />
      </View>
      <SectionHeader
        title={`Aguardando aprovação (${data.pendingReservations.length})`}
        action={
          data.pendingReservations.length ? (
            <Button
              title="Ver todas"
              variant="ghost"
              onPress={() =>
                router.push({ pathname: '/reservations', params: { status: 'PENDING' } })
              }
            />
          ) : undefined
        }
      />
      {data.pendingReservations.length ? (
        data.pendingReservations
          .slice(0, 3)
          .map((reservation) => (
            <ReservationCard
              key={reservation.id}
              reservation={reservation}
              onPress={() => router.push(`/reservations/${reservation.id}`)}
            />
          ))
      ) : (
        <EmptyState
          title="Nenhuma solicitação pendente"
          description="As novas solicitações aparecerão aqui."
          icon="checkmark-circle-outline"
        />
      )}
      <SectionHeader title="Confirmadas para hoje" />
      {data.confirmedReservations.length ? (
        data.confirmedReservations.map((reservation) => (
          <ReservationCard
            key={reservation.id}
            reservation={reservation}
            onPress={() => router.push(`/reservations/${reservation.id}`)}
          />
        ))
      ) : (
        <EmptyState
          title="Agenda livre por enquanto"
          description="Não há reservas confirmadas para hoje."
          icon="calendar-outline"
        />
      )}
      <SectionHeader title="Próximos dias" />
      {data.upcomingReservations.length ? (
        data.upcomingReservations.map((reservation) => (
          <ReservationCard
            key={reservation.id}
            reservation={reservation}
            onPress={() => router.push(`/reservations/${reservation.id}`)}
          />
        ))
      ) : (
        <EmptyState
          title="Sem reservas futuras"
          description="As próximas confirmações serão exibidas aqui."
          icon="calendar-clear-outline"
        />
      )}
    </ScreenContainer>
  );
}

function Shortcut({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.shortcut}>
      <Ionicons name={icon} size={21} color={colors.primary} />
      <Text style={styles.shortcutLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  heading: { gap: spacing.xs, marginTop: spacing.sm },
  kicker: { ...typography.label, color: colors.primary },
  date: { ...typography.body, color: colors.textMuted, textTransform: 'capitalize' },
  shortcuts: { flexDirection: 'row', gap: spacing.sm },
  shortcut: {
    flex: 1,
    minHeight: 78,
    backgroundColor: colors.infoSoft,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    padding: spacing.sm,
  },
  shortcutLabel: { ...typography.label, color: colors.primary, textAlign: 'center' },
});
