# Arquitetura do aplicativo Lava On

O aplicativo do proprietário usa React Native, Expo 57, TypeScript e Expo Router. A implementação é organizada em três níveis: telas e componentes, hooks de aplicação e contratos de repositório. Regras de reserva e capacidade ficam no domínio e não dependem de React Native.

Os repositórios atuais usam um banco mock persistido no AsyncStorage. Cada operação comercial recebe o identificador do estabelecimento e valida o vínculo antes de ler ou alterar dados. Uma futura implementação HTTP poderá cumprir os mesmos contratos sem mudar as telas.

## Decisões do MVP

- Uma reserva representa um veículo, um serviço e uma unidade de capacidade diária.
- Pendentes, confirmadas e concluídas consomem capacidade; canceladas, recusadas e faltas não consomem.
- Reservas futuras não podem ser concluídas nem marcadas como falta.
- Pendências antigas não podem ser aceitas.
- Alterações de funcionamento não podem invalidar reservas que ainda consomem capacidade.
- Valores monetários são armazenados em centavos e datas de atendimento como `YYYY-MM-DD`.
- O fuso padrão do estabelecimento é `America/Sao_Paulo`.

## Limites desta etapa

Não há backend, banco SQL, autenticação real, página pública, pagamentos, horários, funcionários, boxes ou notificações. O armazenamento contém somente dados demonstrativos.
