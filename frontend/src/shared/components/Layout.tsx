import type { ReactNode } from 'react'
import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../lib/auth/useAuth'
import logoDecos from '../assets/logo-decos.png'
import simboloDecos from '../assets/simbolo.png'
import {
  IconeArquivos,
  IconeCalendario,
  IconeDuvida,
  IconeHistorico,
  IconeMegafone,
  IconeSair,
  IconeSetaExterna,
  IconeSidebarExpandir,
  IconeSidebarRecolher,
  IconeSino,
  IconeTelefone,
  IconeUsuario,
  IconeUsuarios,
} from './icones'

const NAV_PRINCIPAL = [
  { rota: '/mural', label: 'Mural de avisos', Icone: IconeMegafone },
  { rota: '/calendario', label: 'Calendário', Icone: IconeCalendario },
  { rota: '/documentos', label: 'POPs & documentos', Icone: IconeArquivos },
  { rota: '/duvidas', label: 'Central de dúvidas (FAQ)', Icone: IconeDuvida },
  { rota: '/setores', label: 'Setores e ramais', Icone: IconeTelefone },
]

const NAV_ADMIN = [
  { rota: '/usuarios', label: 'Usuários', Icone: IconeUsuarios },
  { rota: '/logs', label: 'Registro de Atividades', Icone: IconeHistorico },
]

const ATALHOS = [
  { label: 'Prontuário eletrônico', url: '#' },
  { label: 'Portal do colaborador', url: '#' },
]

const ROTULO_PAPEL = {
  comum: 'Colaborador',
  admin_setor: 'Administrador de setor',
  superadmin: 'Superadministrador',
}

interface PropriedadesLayout {
  children: ReactNode
}

function Layout({ children }: PropriedadesLayout) {
  const [recolhido, setRecolhido] = useState(false)
  const { usuario, sair } = useAuth()
  const navegar = useNavigate()

  function aoSair() {
    sair()
    navegar('/login', { replace: true })
  }

  const itemClasse = (ativo: boolean) =>
    `flex items-center gap-2.5 rounded-[10px] py-2.5 text-[13.5px] transition-colors ${
      recolhido ? 'justify-center px-0' : 'px-3'
    } ${
      ativo ? 'bg-[#800020] font-semibold text-white' : 'font-medium text-slate-600 hover:bg-slate-100 hover:text-[#800020]'
    }`

  return (
    <div className="flex min-h-screen items-start bg-slate-100">
      <aside
        className="sticky top-0 flex h-screen flex-none flex-col overflow-hidden rounded-r bg-white py-6 transition-[width] duration-200"
        style={{ width: recolhido ? '82px' : '262px', padding: recolhido ? '24px 12px' : '24px 18px' }}
      >
        <div className="flex flex-none flex-col items-center gap-2 px-3 pb-5">
          {!recolhido && (
            <>
              <img src={logoDecos} alt="Hospital Decós" className="h-10 max-w-[150px] object-contain" />
              <span className="text-[10px] tracking-[0.16em] text-slate-400">INTRANET</span>
            </>
          )}
          {recolhido && <img src={simboloDecos} alt="Hospital Decós" className="h-8 w-8 object-contain" />}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <nav className="flex flex-none flex-col gap-1">
            {!recolhido && (
              <span className="px-3 pb-2 text-[10px] tracking-[0.12em] text-slate-400">PÁGINAS</span>
            )}
            {NAV_PRINCIPAL.map(({ rota, label, Icone }) => (
              <NavLink key={rota} to={rota} title={label} className={({ isActive }) => itemClasse(isActive)}>
                <Icone tamanho={17} className="flex-none" />
                {!recolhido && <span className="flex-1 truncate">{label}</span>}
              </NavLink>
            ))}
          </nav>

          {usuario?.role === 'superadmin' && (
            <div className="mt-5 flex flex-col gap-1 border-t border-slate-100 pt-4">
              {!recolhido && (
                <span className="px-3 pb-2 text-[10px] tracking-[0.12em] text-slate-400">ADMINISTRAÇÃO</span>
              )}
              {NAV_ADMIN.map(({ rota, label, Icone }) => (
                <NavLink key={rota} to={rota} title={label} className={({ isActive }) => itemClasse(isActive)}>
                  <Icone tamanho={17} className="flex-none" />
                  {!recolhido && <span className="flex-1 truncate">{label}</span>}
                </NavLink>
              ))}
            </div>
          )}

          <div className="mt-5 flex flex-col gap-1 border-t border-slate-100 pt-4">
            {!recolhido && (
              <span className="px-3 pb-2 text-[10px] tracking-[0.12em] text-slate-400">ACESSO RÁPIDO</span>
            )}
            {ATALHOS.map((link) => (
              <a
                key={link.label}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                title={link.label}
                className={`flex items-center gap-2.5 rounded-[10px] py-2.5 text-[13px] ${recolhido ? 'justify-center px-0' : 'px-3'} font-medium text-slate-600 no-underline hover:bg-slate-100 hover:text-[#800020]`}
              >
                <IconeSetaExterna tamanho={15} className="flex-none text-slate-400" />
                {!recolhido && <span className="flex-1 truncate">{link.label}</span>}
              </a>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setRecolhido((r) => !r)}
          title={recolhido ? 'Expandir menu' : 'Recolher menu'}
          className={`mt-3 flex flex-none items-center gap-2.5 rounded-lg py-2 ${recolhido ? 'justify-center px-0' : 'px-3'} text-[11.5px] text-slate-400 hover:bg-slate-100 hover:text-slate-600`}
        >
          {recolhido ? <IconeSidebarExpandir tamanho={15} /> : <IconeSidebarRecolher tamanho={15} />}
          {!recolhido && <span className="flex-1">Recolher menu</span>}
        </button>

        <div className={`mt-2 flex flex-none items-center gap-2.5 border-t ${recolhido ? 'justify-center' : ''} border-slate-100 pt-4`}>
          <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-slate-300 text-white">
            <IconeUsuario tamanho={18} />
          </span>
          {!recolhido && (
            <>
              <div className="flex min-w-0 flex-1 flex-col leading-tight">
                <span className="truncate text-[11px] text-slate-500">
                  {usuario ? ROTULO_PAPEL[usuario.role] : ''}
                </span>
              </div>
              <button type="button" title="Notificações" className="flex h-8 w-8 flex-none items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                <IconeSino tamanho={17} />
              </button>
              <button
                type="button"
                onClick={aoSair}
                title="Sair"
                className="flex h-8 w-8 flex-none items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-[#800020]"
              >
                <IconeSair tamanho={17} />
              </button>
            </>
          )}
        </div>
      </aside>

      <main className="min-h-screen min-w-0 flex-1 self-stretch bg-slate-50">
        <div className="px-7 py-6">
          {children}
        </div>
      </main>
    </div>
  )
}

export default Layout
