// src/App.tsx
import { AppRoutes } from './routes/AppRoutes'
import { ConsentModal } from './components/consent/ConsentModal'
import { DemoEnvironmentBanner } from './components/demo/DemoEnvironmentBanner'
import { DemoActivityHeartbeat } from './components/demo/DemoActivityHeartbeat'

function App() {
  return (
    <>
      <AppRoutes />
      <DemoEnvironmentBanner />
      <DemoActivityHeartbeat />
      <ConsentModal />
    </>
  )
}

export default App
