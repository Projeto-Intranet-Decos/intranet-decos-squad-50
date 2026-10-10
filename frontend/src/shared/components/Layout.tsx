import type { ReactNode } from 'react'
import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../lib/auth/useAuth'
import { usePreferencias } from '../../lib/preferencias/usePreferencias'
import { useRolagemElastica } from '../hooks/useRolagemElastica'
import logoDecos from '../assets/logo-decos.png'
import simboloDecos from '../assets/simbolo.png'
import {
  IconeAjustes,
  IconeArquivos,
  IconeCalendario,
  IconeDuvida,
  IconeHistorico,
  IconeMegafone,
  IconeMenu,
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

// Abaixo de lg o menu lateral vira drawer, aberto pelo botão da barra superior.
const CONSULTA_DESKTOP = '(min-width: 1024px)'

function inscreverDesktop(aoMudar: () => void) {
  const consulta = window.matchMedia(CONSULTA_DESKTOP)
  consulta.addEventListener('change', aoMudar)
  return () => consulta.removeEventListener('change', aoMudar)
}

function useDesktop() {
  return useSyncExternalStore(inscreverDesktop, () => window.matchMedia(CONSULTA_DESKTOP).matches)
}

interface PropriedadesLayout {
  children: ReactNode
}

function Layout({ children }: PropriedadesLayout) {
  const [recolhido, setRecolhido] = useState(false)
  const [menuAberto, setMenuAberto] = useState(false)
  const desktop = useDesktop()
  const { usuario, sair } = useAuth()
  const navegar = useNavigate()
  const menuRef = useRef<HTMLElement>(null)
  const botaoMenuRef = useRef<HTMLButtonElement>(null)
  const conteudoRef = useRef<HTMLDivElement>(null)
  const preferencias = usePreferencias()

  // "Recolher menu" só vale no desktop; o drawer sempre abre inteiro.
  const compacto = recolhido && desktop
  const drawerAberto = menuAberto && !desktop

  useRolagemElastica(conteudoRef, preferencias.rolagemElastica && !preferencias.reduzirAnimacoes && !drawerAberto)

  useEffect(() => {
    if (!drawerAberto) return
    menuRef.current?.querySelector<HTMLElement>('a, button')?.focus()

    function aoTeclar(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setMenuAberto(false)
        botaoMenuRef.current?.focus()
      }
    }
    document.addEventListener('keydown', aoTeclar)
    return () => document.removeEventListener('keydown', aoTeclar)
  }, [drawerAberto])

  function fecharMenu() {
    setMenuAberto(false)
  }

  function aoSair() {
    sair()
    navegar('/login', { replace: true })
  }

  const itemClasse = (ativo: boolean) =>
    `flex min-h-10 items-center gap-2.5 rounded-[10px] py-2.5 text-[13.5px] transition-colors ${
      compacto ? 'justify-center px-0' : 'px-3'
    } ${
      ativo
        ? 'bg-brand-50 font-semibold text-brand-700 shadow-[inset_3px_0_0_var(--color-brand-600)]'
        : 'font-medium text-slate-600 hover:bg-white/60 hover:text-slate-900'
    }`

  return (
    <div className="flex min-h-dvh flex-col lg:flex-row lg:items-start">
      <div className="fundo-app pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
        <div className="absolute -top-40 -left-32 size-[34rem] rounded-full bg-brand-100 opacity-70 blur-3xl" />
        <div className="absolute top-1/4 -right-40 size-[38rem] rounded-full bg-slate-200/80 blur-3xl" />
        <div className="absolute -bottom-48 left-1/4 size-[32rem] rounded-full bg-slate-200 opacity-80 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 size-[20rem] rounded-full bg-brand-50 blur-3xl" />
      </div>

      <header className="glass sticky top-3 z-30 mx-3 mt-3 flex h-14 flex-none items-center gap-2 rounded-2xl px-2 lg:hidden">
        <button
          ref={botaoMenuRef}
          type="button"
          onClick={() => setMenuAberto(true)}
          aria-label="Abrir menu"
          aria-expanded={drawerAberto}
          aria-controls="menu-lateral"
          className="flex size-10 flex-none items-center justify-center rounded-lg text-slate-700 transition-colors hover:bg-white/60"
        >
          <IconeMenu tamanho={20} />
        </button>
        <img src={logoDecos} alt="Hospital Decós" className="hidden h-9 w-auto sm:block" />
        <img src={simboloDecos} alt="Hospital Decós" className="size-9 object-contain sm:hidden" />
      </header>

      {drawerAberto && (
        <div className="fixed inset-0 z-40 bg-slate-900/30 lg:hidden" onClick={fecharMenu} aria-hidden="true" />
      )}

      <aside
        id="menu-lateral"
        ref={menuRef}
        inert={!desktop && !menuAberto}
        className={`glass fixed inset-y-3 left-3 z-50 flex w-[262px] max-w-[calc(100vw-1.5rem)] flex-none flex-col overflow-hidden rounded-2xl transition-[translate,width] duration-200 lg:sticky lg:top-3 lg:z-auto lg:my-3 lg:ml-3 lg:h-[calc(100dvh-1.5rem)] lg:max-w-none lg:translate-x-0 ${
          menuAberto ? 'translate-x-0' : '-translate-x-[calc(100%+1.5rem)]'
        }`}
        style={desktop ? { width: compacto ? '82px' : '262px', padding: compacto ? '24px 11px' : '24px 17px' } : { padding: '24px 17px' }}
      >
        <div className="flex flex-none flex-col items-center gap-2 px-3 pb-5">
          {!compacto && (
            <>
              <img src={logoDecos} alt="Hospital Decós" className="h-9 w-auto max-w-[150px] object-contain" />
              <span className="text-[10px] tracking-[0.16em] text-slate-500">INTRANET</span>
            </>
          )}
          {compacto && <img src={simboloDecos} alt="Hospital Decós" className="size-9 object-contain" />}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <nav className="flex flex-none flex-col gap-1">
            {!compacto && (
              <span className="px-3 pb-2 text-[10px] tracking-[0.12em] text-slate-500">PÁGINAS</span>
            )}
            {NAV_PRINCIPAL.map(({ rota, label, Icone }) => (
              <NavLink key={rota} to={rota} title={label} onClick={fecharMenu} className={({ isActive }) => itemClasse(isActive)}>
                <Icone tamanho={18} className="flex-none" />
                {!compacto && <span className="flex-1 truncate">{label}</span>}
              </NavLink>
            ))}
          </nav>

          {usuario?.role === 'superadmin' && (
            <div className="mt-5 flex flex-col gap-1 border-t border-white/70 pt-4">
              {!compacto && (
                <span className="px-3 pb-2 text-[10px] tracking-[0.12em] text-slate-500">ADMINISTRAÇÃO</span>
              )}
              {NAV_ADMIN.map(({ rota, label, Icone }) => (
                <NavLink key={rota} to={rota} title={label} onClick={fecharMenu} className={({ isActive }) => itemClasse(isActive)}>
                  <Icone tamanho={18} className="flex-none" />
                  {!compacto && <span className="flex-1 truncate">{label}</span>}
                </NavLink>
              ))}
            </div>
          )}

          <div className="mt-5 flex flex-col gap-1 border-t border-white/70 pt-4">
            {!compacto && (
              <span className="px-3 pb-2 text-[10px] tracking-[0.12em] text-slate-500">ACESSO RÁPIDO</span>
            )}
            {ATALHOS.map((link) => (
              <a
                key={link.label}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                title={link.label}
                onClick={fecharMenu}
                className={`flex items-center gap-2.5 rounded-[10px] py-2.5 text-[13.5px] ${compacto ? 'justify-center px-0' : 'px-3'} font-medium text-slate-600 no-underline transition-colors hover:bg-white/60 hover:text-brand-600`}
              >
                <IconeSetaExterna tamanho={16} className="flex-none text-slate-500" />
                {!compacto && <span className="flex-1 truncate">{link.label}</span>}
              </a>
            ))}
          </div>
        </div>

        <NavLink
          to="/configuracoes"
          title="Configurações"
          onClick={fecharMenu}
          className={({ isActive }) => `mt-3 flex-none ${itemClasse(isActive)}`}
        >
          <IconeAjustes tamanho={18} className="flex-none" />
          {!compacto && <span className="flex-1 truncate">Configurações</span>}
        </NavLink>

        <button
          type="button"
          onClick={() => setRecolhido((r) => !r)}
          title={compacto ? 'Expandir menu' : 'Recolher menu'}
          className={`mt-1 hidden flex-none items-center gap-2.5 rounded-lg py-2 lg:flex ${compacto ? 'justify-center px-0' : 'px-3'} text-xs text-slate-500 transition-colors hover:bg-white/60 hover:text-slate-700`}
        >
          {compacto ? <IconeSidebarExpandir tamanho={16} /> : <IconeSidebarRecolher tamanho={16} />}
          {!compacto && <span className="flex-1 text-left">Recolher menu</span>}
        </button>

        <div className={`mt-2 flex flex-none items-center gap-2.5 border-t ${compacto ? 'justify-center' : ''} border-white/70 pt-4`}>
          <span className="flex size-8 flex-none items-center justify-center rounded-full bg-brand-100 text-brand-700">
            <IconeUsuario tamanho={18} />
          </span>
          {!compacto && (
            <>
              <div className="flex min-w-0 flex-1 flex-col leading-tight">
                <span className="truncate text-xs text-slate-600">
                  {usuario ? ROTULO_PAPEL[usuario.role] : ''}
                </span>
              </div>
              <button type="button" title="Notificações" className="flex size-10 flex-none items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-white/60 hover:text-slate-700 lg:size-8">
                <IconeSino tamanho={18} />
              </button>
              <button
                type="button"
                onClick={aoSair}
                title="Sair"
                className="flex size-10 flex-none items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-white/60 hover:text-brand-600 lg:size-8"
              >
                <IconeSair tamanho={18} />
              </button>
            </>
          )}
        </div>
      </aside>

      <main className="min-w-0 flex-1 self-stretch lg:min-h-dvh">
        <div ref={conteudoRef} className="px-4 pt-5 pb-8 sm:px-7 lg:py-6">
          {children}
        </div>
      </main>
    </div>
  )
}

export default Layout
