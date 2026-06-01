export const colors = {
  surface: '#12131b',
  background: '#12131b',
  primary: '#f2bf50',
  secondary: '#44dbd5',
  tertiary: '#ffb4aa',
  onSurface: '#e3e1ed',
  onSurfaceVariant: '#d2c5b0',
  outline: '#9b8f7c',
  outlineVariant: '#4f4636',
} as const

export const typography = {
  displayLg: { fontSize: '34px', lineHeight: '42px', fontWeight: 700 },
  headlineLg: { fontSize: '24px', lineHeight: '32px', fontWeight: 700 },
  titleMd: { fontSize: '18px', lineHeight: '24px', fontWeight: 600 },
  bodyLg: { fontSize: '16px', lineHeight: '24px', fontWeight: 400 },
  bodyMd: { fontSize: '14px', lineHeight: '20px', fontWeight: 400 },
  labelSm: { fontSize: '12px', lineHeight: '16px', fontWeight: 500 },
} as const

export const spacing = {
  base: '4px',
  xs: '8px',
  sm: '12px',
  md: '16px',
  lg: '24px',
  xl: '32px',
  safeAreaInset: '20px',
} as const
