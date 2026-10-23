interface PropriedadesSkeleton {
  className?: string
}

// Bloco de carregamento (skeleton). A pulsação é CSS puro (`animate-pulse`), então já
// some com "Reduzir animações" (GER-14) e `prefers-reduced-motion` sem nenhum código aqui.
function Skeleton({ className = '' }: PropriedadesSkeleton) {
  return (
    <div
      aria-hidden="true"
      data-testid="skeleton"
      className={`animate-pulse rounded-md bg-slate-200/80 liquido:bg-slate-900/8 ${className}`}
    />
  )
}

export default Skeleton
