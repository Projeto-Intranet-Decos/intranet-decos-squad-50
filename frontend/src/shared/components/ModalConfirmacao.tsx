import { motion } from 'motion/react'
import type { ReactNode } from 'react'
import Botao from './Botao'
import Modal from './Modal'
import { IconeAlerta } from './icones'

interface PropriedadesModalConfirmacao {
  titulo: string
  /** Frase da pergunta, ex: "Tem certeza que deseja excluir este aviso?". */
  pergunta: string
  /** Nome do que será excluído, em destaque. */
  destaque: string
  /** Aviso extra em vermelho, ex: "Essa ação não pode ser desfeita.". */
  alerta?: string
  rotuloConfirmar: string
  rotuloProcessando?: string
  processando?: boolean
  aoConfirmar: () => void
  aoFechar: () => void
  children?: ReactNode
}

function ModalConfirmacao({
  titulo,
  pergunta,
  destaque,
  alerta = 'Essa ação não pode ser desfeita.',
  rotuloConfirmar,
  rotuloProcessando = 'Excluindo…',
  processando = false,
  aoConfirmar,
  aoFechar,
  children,
}: PropriedadesModalConfirmacao) {
  return (
    // Fechar no meio da requisição não a cancela; trava pra não sumir o feedback.
    <Modal aberto titulo={titulo} aoFechar={() => !processando && aoFechar()} largura="460px">
      <div className="flex gap-3.5">
        {/* O ícone "pula" um instante depois do painel e o texto entra logo atrás. */}
        <motion.span
          initial={{ scale: 0.4, rotate: -20, opacity: 0 }}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 500, damping: 18, delay: 0.1 }}
          className="flex size-10 flex-none items-center justify-center rounded-full bg-danger-50 text-danger-600 ring-1 ring-red-200"
        >
          <IconeAlerta tamanho={20} />
        </motion.span>
        <motion.div
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut', delay: 0.14 }}
          className="min-w-0 text-sm text-slate-700"
        >
          <p className="m-0">{pergunta}</p>
          <p className="m-0 mt-2 truncate font-semibold text-slate-900" title={destaque}>
            {destaque}
          </p>
          {children}
          <p className="m-0 mt-3 text-[13px] text-critical">{alerta}</p>
        </motion.div>
      </div>

      <div className="mt-6 grid gap-2.5 border-t border-slate-200/60 liquido:border-slate-900/5 pt-[18px] sm:flex sm:justify-end">
        <Botao variante="secundario" onClick={aoFechar} disabled={processando}>
          Cancelar
        </Botao>
        <Botao variante="perigo" onClick={aoConfirmar} disabled={processando}>
          {processando ? rotuloProcessando : rotuloConfirmar}
        </Botao>
      </div>
    </Modal>
  )
}

export default ModalConfirmacao
