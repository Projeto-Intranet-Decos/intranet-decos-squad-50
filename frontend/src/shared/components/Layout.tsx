import type { ComponentType, ReactNode } from 'react'
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
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
const CONSULTA_MENOS_MOVIMENTO = '(prefers-reduced-motion: reduce)'

function useConsultaDeMidia(consulta: string) {
  const inscrever = useCallback(
    (aoMudar: () => void) => {
      const lista = window.matchMedia(consulta)
      lista.addEventListener('change', aoMudar)
      return () => lista.removeEventListener('change', aoMudar)
    },
    [consulta],
  )
  return useSyncExternalStore(inscrever, () => window.matchMedia(consulta).matches)
}

interface PropriedadesItemMenu {
  rota: string
  label: string
  Icone: ComponentType<{ tamanho?: number; className?: string }>
  compacto: boolean
  aoNavegar: () => void
  className?: string
}

function ItemMenu({ rota, label, Icone, compacto, aoNavegar, className }: PropriedadesItemMenu) {
  return (
    <NavLink
      to={rota}
      title={label}
      onClick={aoNavegar}
      className={({ isActive }) =>
        `relative flex min-h-10 flex-none items-center gap-2.5 rounded-[10px] py-2.5 text-[13.5px] transition-[color,background-color,scale] ios:rounded-full ios:text-[15px] ios:active:scale-[0.98] ${
          compacto ? 'justify-center px-0' : 'px-3 ios:px-3.5'
        } ${
          isActive
            ? 'font-semibold text-brand-600 ios:text-brand-700 ios:[&_svg]:stroke-2 ios:[&_svg]:text-brand-600'
            : 'font-medium text-slate-600 hover:bg-white/60 hover:text-slate-900 ios:text-slate-700 ios:hover:bg-white/50'
        } ${className ?? ''}`
      }
    >
      {({ isActive }) => (
        <>
          {/* Um só indicador para o menu todo: o layoutId faz ele deslizar do item antigo ao novo. */}
          {isActive && (
            <motion.span
              layoutId="indicador-do-menu"
              transition={{ type: 'spring', stiffness: 520, damping: 42 }}
              className="item-ativo absolute inset-0 rounded-[10px] ios:rounded-full"
            />
          )}
          <Icone tamanho={18} className="relative flex-none" />
          {!compacto && <span className="relative flex-1 truncate">{label}</span>}
        </>
      )}
    </NavLink>
  )
}

interface PropriedadesLayout {
  children: ReactNode
}

function Layout({ children }: PropriedadesLayout) {
  const [recolhido, setRecolhido] = useState(false)
  const [menuAberto, setMenuAberto] = useState(false)
  const desktop = useConsultaDeMidia(CONSULTA_DESKTOP)
  const { usuario, sair } = useAuth()
  const navegar = useNavigate()
  const { pathname } = useLocation()
  const prefereMenosMovimento = useConsultaDeMidia(CONSULTA_MENOS_MOVIMENTO)
  const menuRef = useRef<HTMLElement>(null)
  const botaoMenuRef = useRef<HTMLButtonElement>(null)
  const conteudoRef = useRef<HTMLDivElement>(null)
  const preferencias = usePreferencias()
  const semAnimacao = preferencias.reduzirAnimacoes || prefereMenosMovimento

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

  return (
    <div className="flex min-h-dvh flex-col lg:flex-row lg:items-start">
      <div className="fundo-app pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
        <div className="contents ios:hidden">
          <div className="absolute -top-40 -left-32 size-[34rem] rounded-full bg-brand-100 opacity-70 blur-3xl" />
          <div className="absolute top-1/4 -right-40 size-[38rem] rounded-full bg-slate-200/80 blur-3xl" />
          <div className="absolute -bottom-48 left-1/4 size-[32rem] rounded-full bg-slate-200 opacity-80 blur-3xl" />
          <div className="absolute top-1/2 left-1/2 size-[20rem] rounded-full bg-brand-50 blur-3xl" />
        </div>
        {/* iOS: cor atrás de cada painel de vidro (menu, carrossel, coluna da direita). */}
        <div className="hidden ios:contents">
          <div className="absolute -top-24 -left-40 size-[36rem] rounded-full bg-brand-500 opacity-[0.16] blur-[120px]" />
          <div className="absolute top-[22rem] left-1/3 size-[40rem] rounded-full bg-brand-600 opacity-[0.09] blur-[140px]" />
          <div className="absolute top-1/2 -right-32 size-[34rem] rounded-full bg-brand-100 opacity-80 blur-[120px]" />
          <div className="absolute -bottom-40 left-0 size-[38rem] rounded-full bg-slate-300 opacity-50 blur-[120px]" />
        </div>
      </div>

      <header className="glass sticky top-3 z-30 mx-3 mt-3 flex h-14 flex-none items-center gap-2 rounded-2xl px-2 lg:hidden ios:h-[3.75rem] ios:gap-3 ios:rounded-full ios:pr-5">
        <button
          ref={botaoMenuRef}
          type="button"
          onClick={() => setMenuAberto(true)}
          aria-label="Abrir menu"
          aria-expanded={drawerAberto}
          aria-controls="menu-lateral"
          className="flex size-10 flex-none items-center justify-center rounded-lg text-slate-700 transition-colors hover:bg-white/60 ios:btn-icon"
        >
          <IconeMenu tamanho={20} />
        </button>
        <img src={logoDecos} alt="Hospital Decós" className="hidden h-9 w-auto sm:block" />
        <img src={simboloDecos} alt="Hospital Decós" className="size-9 object-contain sm:hidden" />
      </header>

      {drawerAberto && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/30 lg:hidden ios:bg-slate-900/25 ios:backdrop-blur-sm"
          onClick={fecharMenu}
          aria-hidden="true"
        />
      )}

      {/* layoutRoot: o menu fica parado na tela, então a rolagem da página não entra na conta
          da animação do indicador. */}
      <motion.aside
        layoutRoot
        id="menu-lateral"
        ref={menuRef}
        inert={!desktop && !menuAberto}
        className={`glass fixed inset-y-3 left-3 z-50 flex w-[262px] max-w-[calc(100vw-1.5rem)] flex-none flex-col overflow-hidden rounded-2xl transition-[translate,width] duration-200 lg:sticky lg:top-3 lg:z-auto lg:my-3 lg:ml-3 lg:h-[calc(100dvh-1.5rem)] lg:max-w-none lg:translate-x-0 ios:rounded-panel ${
          menuAberto ? 'translate-x-0' : '-translate-x-[calc(100%+1.5rem)]'
        }`}
        style={desktop ? { width: compacto ? '82px' : '262px', padding: compacto ? '24px 11px' : '24px 17px' } : { padding: '24px 17px' }}
      >
        <div className="flex flex-none flex-col items-center gap-2 px-3 pb-5">
          {!compacto && (
            <>
              <img src={logoDecos} alt="Hospital Decós" className="h-9 w-auto max-w-[150px] object-contain" />
              <span className="text-[10px] tracking-[0.16em] text-slate-500 ios:text-[11px] ios:font-medium ios:tracking-[0.08em]">
                INTRANET
              </span>
            </>
          )}
          {compacto && <img src={simboloDecos} alt="Hospital Decós" className="size-9 object-contain" />}
        </div>

        <motion.div layoutScroll className="min-h-0 flex-1 overflow-y-auto">
          <nav className="flex flex-none flex-col gap-1">
            {!compacto && (
              <span className="px-3 pb-2 text-[10px] tracking-[0.12em] text-slate-500 ios:px-3.5 ios:text-[11px] ios:font-semibold ios:tracking-[0.06em]">
                PÁGINAS
              </span>
            )}
            {NAV_PRINCIPAL.map((item) => (
              <ItemMenu key={item.rota} {...item} compacto={compacto} aoNavegar={fecharMenu} />
            ))}
          </nav>

          {usuario?.role === 'superadmin' && (
            <div className="mt-5 flex flex-col gap-1 border-t border-white/70 pt-4 ios:border-slate-900/5">
              {!compacto && (
                <span className="px-3 pb-2 text-[10px] tracking-[0.12em] text-slate-500 ios:px-3.5 ios:text-[11px] ios:font-semibold ios:tracking-[0.06em]">
                ADMINISTRAÇÃO
              </span>
              )}
              {NAV_ADMIN.map((item) => (
                <ItemMenu key={item.rota} {...item} compacto={compacto} aoNavegar={fecharMenu} />
              ))}
            </div>
          )}

          <div className="mt-5 flex flex-col gap-1 border-t border-white/70 pt-4 ios:border-slate-900/5">
            {!compacto && (
              <span className="px-3 pb-2 text-[10px] tracking-[0.12em] text-slate-500 ios:px-3.5 ios:text-[11px] ios:font-semibold ios:tracking-[0.06em]">
                ACESSO RÁPIDO
              </span>
            )}
            {ATALHOS.map((link) => (
              <a
                key={link.label}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                title={link.label}
                onClick={fecharMenu}
                className={`flex min-h-10 items-center gap-2.5 rounded-[10px] py-2.5 text-[13.5px] ${compacto ? 'justify-center px-0' : 'px-3 ios:px-3.5'} font-medium text-slate-600 no-underline transition-[color,background-color,scale] hover:bg-white/60 hover:text-brand-600 ios:rounded-full ios:text-[15px] ios:text-slate-700 ios:hover:bg-white/50 ios:active:scale-[0.98]`}
              >
                <IconeSetaExterna tamanho={16} className="flex-none text-slate-500 ios:size-[18px]" />
                {!compacto && <span className="flex-1 truncate">{link.label}</span>}
              </a>
            ))}
          </div>
        </motion.div>

        <ItemMenu
          rota="/configuracoes"
          label="Configurações"
          Icone={IconeAjustes}
          compacto={compacto}
          aoNavegar={fecharMenu}
          className="mt-3"
        />

        <button
          type="button"
          onClick={() => setRecolhido((r) => !r)}
          title={compacto ? 'Expandir menu' : 'Recolher menu'}
          className={`mt-1 hidden flex-none items-center gap-2.5 rounded-lg py-2 lg:flex ${compacto ? 'justify-center px-0' : 'px-3 ios:px-3.5'} text-xs text-slate-500 transition-[color,background-color,scale] hover:bg-white/60 hover:text-slate-700 ios:min-h-10 ios:rounded-full ios:text-sm ios:text-slate-600 ios:hover:bg-white/50 ios:active:scale-[0.98]`}
        >
          {compacto ? <IconeSidebarExpandir tamanho={16} /> : <IconeSidebarRecolher tamanho={16} />}
          {!compacto && <span className="flex-1 text-left">Recolher menu</span>}
        </button>

        <div className={`mt-2 flex flex-none items-center gap-2.5 border-t ${compacto ? 'justify-center' : ''} border-white/70 pt-4 ios:border-slate-900/5`}>
          <span className="flex size-8 flex-none items-center justify-center rounded-full bg-brand-100 text-brand-700 ios:size-9">
            <IconeUsuario tamanho={18} />
          </span>
          {!compacto && (
            <>
              <div className="flex min-w-0 flex-1 flex-col leading-tight">
                <span className="truncate text-xs text-slate-600 ios:text-[13px] ios:font-medium ios:text-slate-700">
                  {usuario ? ROTULO_PAPEL[usuario.role] : ''}
                </span>
              </div>
              <button
                type="button"
                title="Notificações"
                aria-label="Notificações"
                className="flex size-10 flex-none items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-white/60 hover:text-slate-700 lg:size-8 ios:btn-icon"
              >
                <IconeSino tamanho={18} />
              </button>
              <button
                type="button"
                onClick={aoSair}
                title="Sair"
                aria-label="Sair"
                className="flex size-10 flex-none items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-white/60 hover:text-brand-600 lg:size-8 ios:btn-icon"
              >
                <IconeSair tamanho={18} />
              </button>
            </>
          )}
        </div>
      </motion.aside>

      <main className="min-w-0 flex-1 self-stretch lg:min-h-dvh">
        <div ref={conteudoRef} className="px-4 pt-5 pb-8 sm:px-7 lg:py-6">
          {/* A página atual some e só então a nova entra. O transform some ao fim da animação,
              para os modais (position: fixed) da página continuarem presos à tela. */}
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={pathname}
              initial={semAnimacao ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={semAnimacao ? undefined : { opacity: 0, transition: { duration: 0.09, ease: 'easeIn' } }}
              transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  )
}

export default Layout
