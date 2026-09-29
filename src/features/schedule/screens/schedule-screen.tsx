import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useEstablishment, useSchedule } from '@/data/query/hooks';
import { getErrorMessage } from '@/domain/errors';
import { getTodayInTimeZone } from '@/domain/rules/reservations';
import { colors, radius, spacing, typography } from '@/shared/theme';
import {
  Button,
  EmptyState,
  ErrorState,
  LoadingState,
  ScreenContainer,
  uiStyles,
} from '@/shared/ui';
import { formatCalendarDate } from '@/shared/utils/format';

export default function ScheduleScreen() {
  const router = useRouter();
  const [days, setDays] = useState(30);
  const establishment = useEstablishment();
  const today = getTodayInTimeZone(establishment.data?.timeZone ?? 'America/Sao_Paulo');
  const query = useSchedule(today, days);
  return (
    <ScreenContainer>
      <View>
        <Text style={uiStyles.title}>Agenda</Text>
        <Text style={uiStyles.muted}>Capacidade diária dos próximos {days} dias.</Text>
      </View>
      {query.isLoading ? (
        <LoadingState />
      ) : query.error ? (
        <ErrorState message={getErrorMessage(query.error)} onRetry={() => void query.refetch()} />
      ) : query.data?.length ? (
        <>
          {query.data.map((day) => (
            <Pressable
              key={day.capacity.date}
              onPress={() => router.push(`/schedule/${day.capacity.date}`)}
              style={styles.day}
            >
              <View style={styles.dayDate}>
                <Text style={styles.dayName}>{formatCalendarDate(day.capacity.date, 'EEEE')}</Text>
                <Text style={styles.date}>{formatCalendarDate(day.capacity.date, 'dd/MM')}</Text>
              </View>
              <View style={styles.numbers}>
                <Text style={styles.available}>
                  {day.capacity.open ? day.capacity.available : '—'}
                </Text>
                <Text style={styles.caption}>{day.capacity.open ? 'vagas livres' : 'fechado'}</Text>
              </View>
              <View style={styles.summary}>
                <Text style={styles.caption}>{day.capacity.confirmed} confirmadas</Text>
                <Text style={styles.caption}>{day.capacity.pending} pendentes</Text>
              </View>
            </Pressable>
          ))}
          <Button
            title="Mostrar mais 30 dias"
            variant="secondary"
            onPress={() => setDays((value) => value + 30)}
          />
        </>
      ) : (
        <EmptyState
          title="Agenda indisponível"
          description="Configure os dias de funcionamento para visualizar a agenda."
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  day: {
    minHeight: 78,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
  },
  dayDate: { width: 92 },
  dayName: { ...typography.label, color: colors.text, textTransform: 'capitalize' },
  date: { ...typography.caption, color: colors.textMuted },
  numbers: { alignItems: 'center', minWidth: 58 },
  available: { fontSize: 23, lineHeight: 27, fontWeight: '700', color: colors.success },
  caption: { ...typography.caption, color: colors.textMuted },
  summary: { flex: 1, alignItems: 'flex-end' },
});
