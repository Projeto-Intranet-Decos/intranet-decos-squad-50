import { forwardRef, type SelectHTMLAttributes } from 'react'

type PropriedadesSelect = SelectHTMLAttributes<HTMLSelectElement>

const Select = forwardRef<HTMLSelectElement, PropriedadesSelect>(function Select(
  { className, children, ...resto },
  ref,
) {
  return (
    <select
      ref={ref}
      className={`field cursor-pointer py-2.5 text-sm disabled:cursor-not-allowed ${className ?? ''}`}
      {...resto}
    >
      {children}
    </select>
  )
})

export default Select
