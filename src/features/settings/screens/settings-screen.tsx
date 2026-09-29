import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useEstablishment } from '@/data/query/hooks';
import { colors, radius, spacing, typography } from '@/shared/theme';
import { LoadingState, ScreenContainer, uiStyles } from '@/shared/ui';

const items = [
  {
    title: 'Dados do estabelecimento',
    description: 'Nome, telefone e endereço',
    icon: 'business-outline' as const,
    route: '/settings/establishment' as const,
  },
  {
    title: 'Funcionamento',
    description: 'Dias e capacidade diária',
    icon: 'time-outline' as const,
    route: '/settings/operating' as const,
  },
  {
    title: 'Serviços',
    description: 'Preços e categorias de veículo',
    icon: 'water-outline' as const,
    route: '/services' as const,
  },
  {
    title: 'Conta',
    description: 'Perfil e acesso',
    icon: 'person-outline' as const,
    route: '/settings/account' as const,
  },
];

export default function SettingsScreen() {
  const router = useRouter();
  const establishment = useEstablishment();
  if (establishment.isLoading) return <LoadingState />;
  return (
    <ScreenContainer>
      <View>
        <Text style={uiStyles.title}>Configurações</Text>
        <Text style={uiStyles.muted}>{establishment.data?.name}</Text>
      </View>
      {items.map((item) => (
        <Pressable
          key={item.title}
          onPress={() => router.push(item.route)}
          style={({ pressed }) => [styles.item, pressed && styles.pressed]}
        >
          <View style={styles.icon}>
            <Ionicons name={item.icon} size={22} color={colors.primary} />
          </View>
          <View style={styles.flex}>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.description}>{item.description}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </Pressable>
      ))}
      <View style={styles.future}>
        <Text style={styles.futureTitle}>Em breve</Text>
        <Text style={styles.description}>
          Notificações, página pública e plano da assinatura serão adicionados em etapas futuras.
        </Text>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
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
    width: 42,
    height: 42,
    borderRadius: radius.md,
    backgroundColor: colors.infoSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flex: { flex: 1 },
  title: { ...typography.heading, color: colors.text },
  description: { ...typography.caption, color: colors.textMuted },
  future: {
    padding: spacing.lg,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    gap: spacing.xs,
  },
  futureTitle: { ...typography.label, color: colors.text },
});
