import { Navigate, Route, Routes } from 'react-router-dom'
import PaginaCalendario from './features/murais/components/PaginaCalendario'
import PaginaDocumentos from './features/documentos/components/PaginaDocumentos'
import PaginaDuvidas from './features/duvidas/components/PaginaDuvidas'
import PaginaLogs from './features/logs/components/PaginaLogs'
import PaginaMural from './features/murais/components/PaginaMural'
import PaginaSetores from './features/setores/components/PaginaSetores'
import PaginaUsuarios from './features/usuarios/components/PaginaUsuarios'
import PaginaAtivarConta from './lib/auth/PaginaAtivarConta'
import PaginaEsqueciSenha from './lib/auth/PaginaEsqueciSenha'
import PaginaLogin from './lib/auth/PaginaLogin'
import PaginaNaoAutorizado from './lib/auth/PaginaNaoAutorizado'
import PaginaRedefinirSenha from './lib/auth/PaginaRedefinirSenha'
import RotaProtegida from './lib/auth/RotaProtegida'
import { PAPEIS_ADMINISTRACAO } from './lib/permissions'
import PaginaConfiguracoes from './lib/preferencias/PaginaConfiguracoes'
import Layout from './shared/components/Layout'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/mural" replace />} />
      <Route path="/login" element={<PaginaLogin />} />
      <Route path="/ativar-conta" element={<PaginaAtivarConta />} />
      <Route path="/esqueci-senha" element={<PaginaEsqueciSenha />} />
      <Route path="/redefinir-senha" element={<PaginaRedefinirSenha />} />
      <Route
        path="/nao-autorizado"
        element={
          <RotaProtegida>
            <Layout>
              <PaginaNaoAutorizado />
            </Layout>
          </RotaProtegida>
        }
      />
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
        path="/configuracoes"
        element={
          <RotaProtegida>
            <Layout>
              <PaginaConfiguracoes />
            </Layout>
          </RotaProtegida>
        }
      />
      <Route
        path="/usuarios"
        element={
          <RotaProtegida papeisPermitidos={PAPEIS_ADMINISTRACAO}>
            <Layout>
              <PaginaUsuarios />
            </Layout>
          </RotaProtegida>
        }
      />
      <Route
        path="/logs"
        element={
          <RotaProtegida papeisPermitidos={PAPEIS_ADMINISTRACAO}>
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
