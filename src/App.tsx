import { useEffect } from 'react'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import CampaignPage from './pages/CampaignPage'
import MyNumbers from './pages/MyNumbers'
import Winners from './pages/Winners'
import Result from './pages/Result'
import Admin from './pages/Admin'
import { runAutoDraws } from './lib/store'

export default function App() {
  useEffect(() => {
    void runAutoDraws()
  }, [])

  return (
    // HashRouter para funcionar no GitHub Pages sem configuração de servidor
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="sorteio/:id" element={<CampaignPage />} />
          <Route path="resultado/:id" element={<Result />} />
          <Route path="meus-numeros" element={<MyNumbers />} />
          <Route path="ganhadores" element={<Winners />} />
          <Route path="admin" element={<Admin />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
