import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Alert, Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { useServices, useToggleService } from '@/data/query/hooks';
import { getErrorMessage } from '@/domain/errors';
import { colors, radius, spacing, typography } from '@/shared/theme';
import {
  Button,
  EmptyState,
  ErrorState,
  LoadingState,
  ScreenContainer,
  uiStyles,
} from '@/shared/ui';
import { categoryLabel, formatCurrency } from '@/shared/utils/format';

export default function ServicesScreen() {
  const router = useRouter();
  const query = useServices();
  const toggle = useToggleService();
  return (
    <ScreenContainer>
      <View style={styles.heading}>
        <View style={styles.flex}>
          <Text style={uiStyles.title}>Serviços</Text>
          <Text style={uiStyles.muted}>Cada categoria e preço formam uma oferta.</Text>
        </View>
        <Button title="Novo" icon="add" onPress={() => router.push('/services/new')} />
      </View>
      {query.isLoading ? (
        <LoadingState />
      ) : query.error ? (
        <ErrorState message={getErrorMessage(query.error)} onRetry={() => void query.refetch()} />
      ) : query.data?.length ? (
        query.data.map((service) => (
          <Pressable
            key={service.id}
            onPress={() => router.push(`/services/${service.id}`)}
            style={({ pressed }) => [styles.item, pressed && styles.pressed]}
          >
            <View style={styles.icon}>
              <Ionicons name="water-outline" size={21} color={colors.primary} />
            </View>
            <View style={styles.flex}>
              <Text style={styles.name}>{service.name}</Text>
              <Text style={styles.meta}>
                {categoryLabel(service.vehicleCategory)} · {formatCurrency(service.priceInCents)}
              </Text>
            </View>
            <Switch
              accessibilityLabel={`${service.active ? 'Desativar' : 'Ativar'} ${service.name}`}
              value={service.active}
              disabled={toggle.isPending}
              onValueChange={(active) =>
                toggle.mutate(
                  { serviceId: service.id, active },
                  {
                    onError: (error) =>
                      Alert.alert('Não foi possível alterar', getErrorMessage(error)),
                  },
                )
              }
              trackColor={{ true: colors.primary }}
            />
          </Pressable>
        ))
      ) : (
        <EmptyState
          title="Nenhum serviço cadastrado"
          description="Crie as opções que seus clientes poderão reservar."
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  heading: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  flex: { flex: 1 },
  item: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  pressed: { opacity: 0.75 },
  icon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.infoSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { ...typography.heading, color: colors.text },
  meta: { ...typography.caption, color: colors.textMuted },
});
