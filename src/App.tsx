// src/App.tsx
import { AppRoutes } from './routes/AppRoutes'
import { ConsentModal } from './components/consent/ConsentModal'

function App() {
  return (
    <>
      <AppRoutes />
      <ConsentModal />
    </>
  )
}

export default App