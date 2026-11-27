interface PropriedadesCapaAviso {
  url: string
  alt: string
  classeQuadro?: string
  classeImagem?: string
}

// A capa aparece inteira (object-contain) seja 16:9, 9:16 ou 1:1; a sobra do quadro é preenchida
// pela própria imagem ampliada e desfocada. As duas tags usam a mesma URL, então baixa uma vez só.
function CapaAviso({ url, alt, classeQuadro = '', classeImagem = 'size-full' }: PropriedadesCapaAviso) {
  return (
    <div className={`relative overflow-hidden bg-slate-200 ${classeQuadro}`}>
      <img
        src={url}
        alt=""
        aria-hidden="true"
        loading="lazy"
        className="absolute inset-0 size-full scale-110 object-cover blur-xl brightness-90 saturate-125"
      />
      <img src={url} alt={alt} loading="lazy" className={`relative object-contain drop-shadow-md ${classeImagem}`} />
    </div>
  )
}

export default CapaAviso
