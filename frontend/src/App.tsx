import { Navigate, Route, Routes } from 'react-router-dom'
import PaginaCalendario from './features/murais/components/PaginaCalendario'
import PaginaDocumentos from './features/documentos/components/PaginaDocumentos'
import PaginaDuvidas from './features/duvidas/components/PaginaDuvidas'
import PaginaLogs from './features/logs/components/PaginaLogs'
import PaginaMural from './features/murais/components/PaginaMural'
import PaginaSetores from './features/setores/components/PaginaSetores'
import PaginaUsuarios from './features/usuarios/components/PaginaUsuarios'
import PaginaLogin from './lib/auth/PaginaLogin'
import RotaProtegida from './lib/auth/RotaProtegida'
import Layout from './shared/components/Layout'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/mural" replace />} />
      <Route path="/login" element={<PaginaLogin />} />
      <Route path="/nao-autorizado" element={<div>Acesso não autorizado</div>} />
      <Route
        path="/mural"
        element={
          <RotaProtegida>
            <Layout>
              <PaginaMural />
            </Layout>
          </RotaProtegida>
        }
      />
      <Route
        path="/calendario"
        element={
          <RotaProtegida>
            <Layout>
              <PaginaCalendario />
            </Layout>
          </RotaProtegida>
        }
      />
      <Route
        path="/documentos"
        element={
          <RotaProtegida>
            <Layout>
              <PaginaDocumentos />
            </Layout>
          </RotaProtegida>
        }
      />
      <Route
        path="/duvidas"
        element={
          <RotaProtegida>
            <Layout>
              <PaginaDuvidas />
            </Layout>
          </RotaProtegida>
        }
      />
      <Route
        path="/setores"
        element={
          <RotaProtegida>
            <Layout>
              <PaginaSetores />
            </Layout>
          </RotaProtegida>
        }
      />
      <Route
        path="/usuarios"
        element={
          <RotaProtegida papeisPermitidos={['superadmin']}>
            <Layout>
              <PaginaUsuarios />
            </Layout>
          </RotaProtegida>
        }
      />
      <Route
        path="/logs"
        element={
          <RotaProtegida papeisPermitidos={['superadmin']}>
            <Layout>
              <PaginaLogs />
            </Layout>
          </RotaProtegida>
        }
      />
    </Routes>
  )
}

export default App
