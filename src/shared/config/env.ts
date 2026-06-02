const env = import.meta.env

export const appEnv = {
  apiUrl: env.VITE_API_URL ?? 'http://localhost:8080',
  demoEnabled: env.VITE_DEMO_ENABLED === 'true',
  demoSecret: env.VITE_DEMO_SECRET ?? '',
} as const

