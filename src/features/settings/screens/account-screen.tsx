import { useRouter } from 'expo-router';
import React from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { getErrorMessage } from '@/domain/errors';
import { useSession } from '@/providers/session-provider';
import { colors, spacing, typography } from '@/shared/theme';
import { Button, Card, Input, ScreenContainer, uiStyles } from '@/shared/ui';

export default function AccountScreen() {
  const { session, updateOwnerName, signOut } = useSession();
  const [name, setName] = React.useState(session?.owner.name ?? '');
  const [saving, setSaving] = React.useState(false);
  const router = useRouter();
  const save = async () => {
    try {
      setSaving(true);
      await updateOwnerName(name);
      Alert.alert('Perfil salvo', 'Seu nome foi atualizado.');
    } catch (error) {
      Alert.alert('Não foi possível salvar', getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };
  const logout = () =>
    Alert.alert('Sair da conta', 'Deseja encerrar esta sessão?', [
      { text: 'Voltar', style: 'cancel' },
      {
        text: 'Sair',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          router.replace('/');
        },
      },
    ]);
  return (
    <ScreenContainer>
      <View>
        <Text style={uiStyles.title}>Sua conta</Text>
        <Text style={uiStyles.muted}>Perfil usado para administrar o estabelecimento.</Text>
      </View>
      <Card>
        <Input label="Nome" value={name} onChangeText={setName} />
        <View style={styles.field}>
          <Text style={styles.label}>E-mail</Text>
          <Text style={styles.value}>{session?.owner.email}</Text>
        </View>
        <Button title="Salvar nome" onPress={save} loading={saving} />
      </Card>
      <Card>
        <Text style={uiStyles.heading}>Acesso demonstrativo</Text>
        <Text style={uiStyles.muted}>
          Autenticação e alteração de senha reais serão conectadas ao backend.
        </Text>
        <Button title="Sair da conta" variant="danger" onPress={logout} />
      </Card>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  field: { gap: spacing.xs },
  label: { ...typography.label, color: colors.text },
  value: { ...typography.body, color: colors.textMuted },
});
