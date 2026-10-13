import { useState } from 'react'
import { Landing } from './pages/Landing'
import { Home } from './pages/Home'
import { Analytics } from '@vercel/analytics/react'

export default function App() {
  const [started, setStarted] = useState(false)

  return (
    <>
      {!started ? (
        <Landing onStart={() => setStarted(true)} />
      ) : (
        <Home onBack={() => setStarted(false)} />
      )}
      <Analytics />
    </>
  )
}