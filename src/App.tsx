import { useEffect, useRef } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useApp } from './lib/store'
import { getBackendConfig } from './lib/api'
import { Shell } from './components/layout/Shell'
import { Inicio } from './views/Inicio'
import { Tareas } from './views/Tareas'
import { Proyectos } from './views/Proyectos'
import { Universidad } from './views/Universidad'
import { Freelance } from './views/Freelance'
import { Emprendimiento } from './views/Emprendimiento'
import { Documentos } from './views/Documentos'
import { Calendario } from './views/Calendario'
import { Personal } from './views/Personal'
import { Pomodoro } from './views/Pomodoro'
import { Configuracion } from './views/Configuracion'

export default function App() {
  const theme = useApp((s) => s.theme)
  const db = useApp((s) => s.db)
  const runRollover = useApp((s) => s.runRollover)
  const syncDesdeNube = useApp((s) => s.syncDesdeNube)
  const syncANube = useApp((s) => s.syncANube)
  const primeraCarga = useRef(true)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  // Rollover: tareas vencidas sin hacer pasan a hoy marcadas como "pendiente de ayer"
  useEffect(() => {
    runRollover()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Carga inicial desde la nube: si hay backend configurado, los datos reales
  // vienen de D1 (la app NO muestra datos estáticos del seed como si fueran reales).
  useEffect(() => {
    const cfg = getBackendConfig()
    if (cfg && cfg.url) {
      syncDesdeNube().then(() => {
        primeraCarga.current = false
      })
    } else {
      primeraCarga.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Polling: cada 60s descarga la nube para ver cambios hechos desde otro equipo.
  // (No interviene mientras está subiendo/descargando.)
  useEffect(() => {
    const cfg = getBackendConfig()
    if (!cfg || !cfg.url) return
    const iv = setInterval(() => {
      const st = useApp.getState()
      if (st.syncStatus !== 'subiendo' && st.syncStatus !== 'descargando') {
        st.syncDesdeNube()
      }
    }, 60000)
    return () => clearInterval(iv)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Auto-sync a la nube: los cambios del usuario se suben solos tras un debounce
  // de 4s (se omite la primera subida tras la descarga inicial para no re-subir lo mismo).
  useEffect(() => {
    if (primeraCarga.current) return
    const cfg = getBackendConfig()
    if (!cfg || !cfg.url) return
    const t = setTimeout(() => {
      syncANube()
    }, 4000)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db])

  return (
    <Shell>
      <Routes>
        <Route path="/" element={<Inicio />} />
        <Route path="/tareas" element={<Tareas />} />
        <Route path="/proyectos" element={<Proyectos />} />
        <Route path="/universidad" element={<Universidad />} />
        <Route path="/freelance" element={<Freelance />} />
        <Route path="/emprendimiento" element={<Emprendimiento />} />
        <Route path="/personal" element={<Personal />} />
        <Route path="/documentos" element={<Documentos />} />
        <Route path="/calendario" element={<Calendario />} />
        <Route path="/pomodoro" element={<Pomodoro />} />
        <Route path="/configuracion" element={<Configuracion />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Shell>
  )
}