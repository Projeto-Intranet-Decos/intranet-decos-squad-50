import { forwardRef, type InputHTMLAttributes } from 'react'

type PropriedadesInput = InputHTMLAttributes<HTMLInputElement>

const Input = forwardRef<HTMLInputElement, PropriedadesInput>(function Input(
  { className, ...resto },
  ref,
) {
  return (
    <input
      ref={ref}
      className={`field py-2.5 text-sm ${className ?? ''}`}
      {...resto}
    />
  )
})

export default Input
