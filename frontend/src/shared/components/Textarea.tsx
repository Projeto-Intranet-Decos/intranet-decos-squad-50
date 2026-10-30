import { forwardRef, type TextareaHTMLAttributes } from 'react'

type PropriedadesTextarea = TextareaHTMLAttributes<HTMLTextAreaElement>

const Textarea = forwardRef<HTMLTextAreaElement, PropriedadesTextarea>(function Textarea(
  { className, ...resto },
  ref,
) {
  return (
    <textarea
      ref={ref}
      className={`field resize-none py-2.5 text-sm leading-relaxed ${className ?? ''}`}
      {...resto}
    />
  )
})

export default Textarea
