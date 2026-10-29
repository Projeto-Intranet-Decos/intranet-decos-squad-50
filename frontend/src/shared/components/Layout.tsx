import type { ComponentType, ReactNode } from 'react'
import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import ListaAtalhos from '../../features/atalhos/components/ListaAtalhos'
import { renovarAccessToken } from '../../lib/api'
import ModalAlterarSenha from '../../lib/auth/ModalAlterarSenha'
import { useAuth } from '../../lib/auth/useAuth'
import { canAcessarAdministracao } from '../../lib/permissions'
import { usePreferencias } from '../../lib/preferencias/usePreferencias'
import { useConsultaDeMidia } from '../hooks/useConsultaDeMidia'
import { useReduzirAnimacoes } from '../hooks/useReduzirAnimacoes'
import { useRolagemElastica } from '../hooks/useRolagemElastica'
import logoDecos from '../assets/logo-decos.png'
import simboloDecos from '../assets/simbolo.png'
import SecaoMenu from './SecaoMenu'
import {
  IconeAjustes,
  IconeArquivos,
  IconeCalendario,
  IconeChave,
  IconeDuvida,
  IconeHistorico,
  IconeMegafone,
  IconeMenu,
  IconeSair,
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


// Abaixo de lg o menu lateral vira drawer, aberto pelo botão da barra superior.
const CONSULTA_DESKTOP = '(min-width: 1024px)'

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
        `relative flex min-h-10 flex-none items-center gap-2.5 rounded-[10px] py-2.5 text-[13.5px] transition-[color,background-color,scale] liquido:rounded-full liquido:text-[15px] liquido:active:scale-[0.98] ${
          compacto ? 'justify-center px-0' : 'px-3 liquido:px-3.5'
        } ${
          isActive
            ? 'font-semibold text-brand-600 liquido:text-brand-700 liquido:[&_svg]:stroke-2 liquido:[&_svg]:text-brand-600'
            : 'font-medium text-slate-600 hover:bg-white/60 hover:text-slate-900 liquido:text-slate-700 liquido:hover:bg-white/50'
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
              className="item-ativo absolute inset-0 rounded-[10px] liquido:rounded-full"
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
  const [alterandoSenha, setAlterandoSenha] = useState(false)
  const desktop = useConsultaDeMidia(CONSULTA_DESKTOP)
  const { usuario, sair } = useAuth()
  const navegar = useNavigate()
  const { pathname } = useLocation()
  const menuRef = useRef<HTMLElement>(null)
  const botaoMenuRef = useRef<HTMLButtonElement>(null)
  const conteudoRef = useRef<HTMLDivElement>(null)
  const completouSessaoAntiga = useRef(false)
  const preferencias = usePreferencias()
  const semAnimacao = useReduzirAnimacoes()

  // "Recolher menu" só vale no desktop; o drawer sempre abre inteiro.
  const compacto = recolhido && desktop
  const drawerAberto = menuAberto && !desktop

  // Token emitido antes de o nome entrar no payload (AUT-03): renova uma vez para o indicador
  // mostrar o nome. Se a renovação falhar, o interceptor cuida disso na próxima requisição.
  useEffect(() => {
    if (!usuario || usuario.nome || completouSessaoAntiga.current) return
    completouSessaoAntiga.current = true
    renovarAccessToken().catch(() => {})
  }, [usuario])

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
        <div className="contents liquido:hidden">
          <div className="absolute -top-40 -left-32 size-[34rem] rounded-full bg-brand-100 opacity-70 blur-3xl" />
          <div className="absolute top-1/4 -right-40 size-[38rem] rounded-full bg-slate-200/80 blur-3xl" />
          <div className="absolute -bottom-48 left-1/4 size-[32rem] rounded-full bg-slate-200 opacity-80 blur-3xl" />
          <div className="absolute top-1/2 left-1/2 size-[20rem] rounded-full bg-brand-50 blur-3xl" />
        </div>
        {/* Vidro líquido: cor atrás de cada painel de vidro (menu, carrossel, coluna da direita). */}
        <div className="hidden liquido:contents">
          <div className="absolute -top-24 -left-40 size-[36rem] rounded-full bg-brand-500 opacity-[0.16] blur-[120px]" />
          <div className="absolute top-[22rem] left-1/3 size-[40rem] rounded-full bg-brand-600 opacity-[0.09] blur-[140px]" />
          <div className="absolute top-1/2 -right-32 size-[34rem] rounded-full bg-brand-100 opacity-80 blur-[120px]" />
          <div className="absolute -bottom-40 left-0 size-[38rem] rounded-full bg-slate-300 opacity-50 blur-[120px]" />
        </div>
      </div>

      <header className="glass sticky top-3 z-30 mx-3 mt-3 flex h-14 flex-none items-center gap-2 rounded-2xl px-2 lg:hidden liquido:h-[3.75rem] liquido:gap-3 liquido:rounded-full liquido:pr-5">
        <button
          ref={botaoMenuRef}
          type="button"
          onClick={() => setMenuAberto(true)}
          aria-label="Abrir menu"
          aria-expanded={drawerAberto}
          aria-controls="menu-lateral"
          className="flex size-10 flex-none items-center justify-center rounded-lg text-slate-700 transition-colors hover:bg-white/60 liquido:btn-icon"
        >
          <IconeMenu tamanho={20} />
        </button>
        <img src={logoDecos} alt="Hospital Decós" className="hidden h-9 w-auto sm:block" />
        <img src={simboloDecos} alt="Hospital Decós" className="size-9 object-contain sm:hidden" />
      </header>

      {drawerAberto && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/30 lg:hidden liquido:bg-slate-900/25 liquido:backdrop-blur-sm"
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
        className={`glass fixed inset-y-3 left-3 z-50 flex w-[262px] max-w-[calc(100vw-1.5rem)] flex-none flex-col overflow-hidden rounded-2xl transition-[translate,width] duration-200 lg:sticky lg:top-3 lg:z-auto lg:my-3 lg:ml-3 lg:h-[calc(100dvh-1.5rem)] lg:max-w-none lg:translate-x-0 liquido:rounded-panel ${
          menuAberto ? 'translate-x-0' : '-translate-x-[calc(100%+1.5rem)]'
        }`}
        style={desktop ? { width: compacto ? '82px' : '262px', padding: compacto ? '24px 11px' : '24px 17px' } : { padding: '24px 17px' }}
      >
        <div className="flex flex-none flex-col items-center gap-2 px-3 pb-5">
          {!compacto && (
            <>
              <img src={logoDecos} alt="Hospital Decós" className="h-9 w-auto max-w-[150px] object-contain" />
              <span className="text-[10px] tracking-[0.16em] text-slate-500 uppercase liquido:text-xs liquido:font-medium liquido:tracking-normal liquido:normal-case">
                Intranet
              </span>
            </>
          )}
          {compacto && <img src={simboloDecos} alt="Hospital Decós" className="size-9 object-contain" />}
        </div>

        <motion.div layoutScroll className="min-h-0 flex-1 overflow-y-auto">
          <SecaoMenu titulo="Páginas" compacto={compacto} semAnimacao={semAnimacao} as="nav">
            {NAV_PRINCIPAL.map((item) => (
              <ItemMenu key={item.rota} {...item} compacto={compacto} aoNavegar={fecharMenu} />
            ))}
          </SecaoMenu>

          {canAcessarAdministracao(usuario) && (
            <SecaoMenu
              titulo="Administração"
              compacto={compacto}
              semAnimacao={semAnimacao}
              className="mt-5 border-t border-white/70 pt-4 liquido:border-slate-900/5"
            >
              {NAV_ADMIN.map((item) => (
                <ItemMenu key={item.rota} {...item} compacto={compacto} aoNavegar={fecharMenu} />
              ))}
            </SecaoMenu>
          )}

          <ListaAtalhos compacto={compacto} semAnimacao={semAnimacao} aoNavegar={fecharMenu} />
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
          className={`mt-1 hidden flex-none items-center gap-2.5 rounded-lg py-2 lg:flex ${compacto ? 'justify-center px-0' : 'px-3 liquido:px-3.5'} text-xs text-slate-500 transition-[color,background-color,scale] hover:bg-white/60 hover:text-slate-700 liquido:min-h-10 liquido:rounded-full liquido:text-sm liquido:text-slate-600 liquido:hover:bg-white/50 liquido:active:scale-[0.98]`}
        >
          {compacto ? <IconeSidebarExpandir tamanho={16} /> : <IconeSidebarRecolher tamanho={16} />}
          {!compacto && <span className="flex-1 text-left">Recolher menu</span>}
        </button>

        {/* Duas linhas: o nome ganha a largura toda, em vez de dividir a linha com os botões. */}
        <div className="mt-2 flex flex-none flex-col gap-2 border-t border-white/70 pt-4 liquido:border-slate-900/5">
          <div className={`flex items-center gap-2.5 ${compacto ? 'justify-center' : ''}`}>
            {usuario ? (
              <span title={usuario.nome} className="flex size-8 flex-none items-center justify-center rounded-full bg-brand-100 text-brand-700 liquido:size-9">
                <IconeUsuario tamanho={18} />
              </span>
            ) : (
              <Link
                to="/login"
                state={{ de: pathname }}
                title="Entrar"
                aria-label="Entrar"
                className="flex size-8 flex-none items-center justify-center rounded-full bg-brand-100 text-brand-700 liquido:size-9"
              >
                <IconeUsuario tamanho={18} />
              </Link>
            )}
            {!compacto && !usuario && (
              <>
                <span className="min-w-0 flex-1 truncate text-xs text-slate-600 liquido:text-[13px] liquido:font-medium liquido:text-slate-700">
                  Visitante
                </span>
                <Link to="/login" state={{ de: pathname }} className="btn btn-primary min-h-10 px-3.5 text-[13px] lg:min-h-8">
                  Entrar
                </Link>
              </>
            )}
            {!compacto && usuario && (
              /* O papel só aparece para o superadmin; os demais veem só o nome (AUT-03). */
              <div className="flex min-w-0 flex-1 flex-col leading-tight">
                <span title={usuario?.nome} className="truncate text-[13px] font-medium text-slate-700 liquido:text-sm">
                  {usuario?.nome}
                </span>
                {usuario?.role === 'superadmin' && (
                  <span className="truncate text-[11px] text-slate-500 liquido:text-xs">Superadministrador</span>
                )}
              </div>
            )}
          </div>
          {!compacto && usuario && (
            <div className="flex items-center justify-end gap-1">
              <button
                type="button"
                title="Notificações"
                aria-label="Notificações"
                className="flex size-10 flex-none items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-white/60 hover:text-slate-700 lg:size-8 liquido:btn-icon"
              >
                <IconeSino tamanho={18} />
              </button>
              <button
                type="button"
                onClick={() => setAlterandoSenha(true)}
                title="Alterar senha"
                aria-label="Alterar senha"
                className="flex size-10 flex-none items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-white/60 hover:text-slate-700 lg:size-8 liquido:btn-icon"
              >
                <IconeChave tamanho={18} />
              </button>
              <button
                type="button"
                onClick={aoSair}
                title="Sair"
                aria-label="Sair"
                className="flex size-10 flex-none items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-white/60 hover:text-brand-600 lg:size-8 liquido:btn-icon"
              >
                <IconeSair tamanho={18} />
              </button>
            </div>
          )}
        </div>
      </motion.aside>

      {alterandoSenha && <ModalAlterarSenha aoFechar={() => setAlterandoSenha(false)} />}

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
