import { useState } from 'react'
import { Landing } from './pages/Landing'
import { Home } from './pages/Home'

export default function App() {
  const [started, setStarted] = useState(false)

  if (!started) {
    return <Landing onStart={() => setStarted(true)} />
  }

  return <Home onBack={() => setStarted(false)} />
}