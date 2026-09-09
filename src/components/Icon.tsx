export const ICONO = 'material-symbols-outlined'

export const Icon = ({ name, className = '' }: { name: string; className?: string }) => (
  <span className={`${ICONO} select-none leading-none ${className}`} aria-hidden="true">
    {name}
  </span>
)