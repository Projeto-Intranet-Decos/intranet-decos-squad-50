import { QRCodeSVG } from 'qrcode.react'
import { useRef } from 'react'
import { toast } from 'sonner'
import Botao from '../../../shared/components/Botao'
import Modal from '../../../shared/components/Modal'
import { IconeBaixar } from '../../../shared/components/icones'
import { ROTULOS_CATEGORIA, type Documento } from '../types'

interface PropriedadesModalQrCodeDocumento {
  documento: Documento
  aoFechar: () => void
}

function ModalQrCodeDocumento({ documento, aoFechar }: PropriedadesModalQrCodeDocumento) {
  const qrCodeRef = useRef<SVGSVGElement>(null)
  const link = `${window.location.origin}/documentos?documento=${documento.id}`

  function copiarLink() {
    navigator.clipboard.writeText(link).then(
      () => toast.success('Link copiado.'),
      () => toast.error('Não foi possível copiar o link.'),
    )
  }

  function baixarQrCode() {
    if (!qrCodeRef.current) return
    const conteudo = new XMLSerializer().serializeToString(qrCodeRef.current)
    const url = URL.createObjectURL(new Blob([conteudo], { type: 'image/svg+xml' }))
    const ancora = document.createElement('a')
    ancora.href = url
    ancora.download = `qr-code-${documento.titulo}.svg`
    ancora.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Modal aberto titulo="QR code do documento" aoFechar={aoFechar} largura="420px">
      <p className="m-0 mb-4 rounded-lg bg-warning/10 px-3 py-2 text-xs text-warning ring-1 ring-warning/20">
        Protótipo: o código leva à página de documentos. Abrir este documento direto pelo link ainda não existe.
      </p>

      <div className="flex flex-col items-center gap-3 rounded-[10px] bg-white p-5 text-center ring-1 ring-slate-200 liquido:rounded-inner">
        <QRCodeSVG
          ref={qrCodeRef}
          value={link}
          size={200}
          marginSize={2}
          fgColor="#3b000e"
          title={`QR code de ${documento.titulo}`}
        />
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-semibold text-slate-900">{documento.titulo}</span>
          <span className="text-xs text-slate-500">
            {ROTULOS_CATEGORIA[documento.categoria]} · {documento.setorNome}
          </span>
        </div>
      </div>

      <p className="m-0 mt-3 text-center text-xs break-all text-slate-500">{link}</p>

      <div className="mt-4 grid gap-2.5 border-t border-slate-200/60 pt-4 sm:flex sm:justify-end liquido:border-slate-900/5">
        <Botao variante="secundario" onClick={copiarLink}>
          Copiar link
        </Botao>
        <Botao variante="primario" onClick={baixarQrCode}>
          <IconeBaixar tamanho={15} />
          Baixar QR code
        </Botao>
      </div>
    </Modal>
  )
}

export default ModalQrCodeDocumento
