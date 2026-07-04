// src/data/mock/tokens.ts
export const colors = {
  surface: '#f7f9fc',
  background: '#ffffff',
  primary: '#1a79e5',
  secondary: '#388cf1',
  tertiary: '#fe951c',
  accent: '#fdb438',
  onSurface: '#0f172a',
  onSurfaceVariant: '#475569',
  outline: '#cbd5e1',
  outlineVariant: '#e2e8f0',
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
