// src/App.tsx
import { AppRoutes } from './routes/AppRoutes'
import { ConsentModal } from './components/consent/ConsentModal'
import { DemoEnvironmentBanner } from './components/demo/DemoEnvironmentBanner'

function App() {
  return (
    <>
      <AppRoutes />
      <DemoEnvironmentBanner />
      <ConsentModal />
    </>
  )
}

export default App
