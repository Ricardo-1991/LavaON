export const colors = {
  background: '#F5F7FB',
  surface: '#FFFFFF',
  surfaceMuted: '#EEF2F7',
  text: '#14213D',
  textMuted: '#65718A',
  primary: '#0B5FFF',
  primaryDark: '#0647C9',
  border: '#DCE2EA',
  success: '#157F4B',
  successSoft: '#E5F6ED',
  warning: '#A65D00',
  warningSoft: '#FFF3DC',
  danger: '#C53232',
  dangerSoft: '#FDE8E8',
  info: '#155BCB',
  infoSoft: '#E7F0FF',
  white: '#FFFFFF',
} as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 } as const;
export const radius = { sm: 8, md: 12, lg: 18, pill: 999 } as const;
export const typography = {
  display: { fontSize: 30, lineHeight: 36, fontWeight: '700' as const },
  title: { fontSize: 22, lineHeight: 28, fontWeight: '700' as const },
  heading: { fontSize: 17, lineHeight: 22, fontWeight: '700' as const },
  body: { fontSize: 15, lineHeight: 21, fontWeight: '400' as const },
  label: { fontSize: 13, lineHeight: 18, fontWeight: '600' as const },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '400' as const },
} as const;
