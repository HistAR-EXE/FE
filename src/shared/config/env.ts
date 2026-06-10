const env = import.meta.env

const apiUrl = env.VITE_API_URL ?? 'http://localhost:8080'
const isProdBuild = env.PROD === true

if (isProdBuild && /localhost|127\.0\.0\.1/i.test(apiUrl)) {
  console.warn(
    '[TimeLens] VITE_API_URL trỏ localhost trong build production. Đặt URL HTTPS BE trên Vercel trước khi demo.',
  )
}

export const appEnv = {
  apiUrl,
  isProdBuild,
  demoEnabled: env.VITE_DEMO_ENABLED === 'true',
  demoMode: env.VITE_DEMO_MODE === 'true',
  demoSecret: env.VITE_DEMO_SECRET ?? '',
} as const
