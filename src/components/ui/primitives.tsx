import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react'

type Tone = 'neutral' | 'primary' | 'positive' | 'caution' | 'negative'

function toneClasses(tone: Tone): string {
  switch (tone) {
    case 'primary':
      return 'bg-primary-normal/10 text-primary-normal border-primary-normal/20'
    case 'positive':
      return 'bg-status-positive/10 text-status-positive border-status-positive/20'
    case 'caution':
      return 'bg-status-cautionary/10 text-status-cautionary border-status-cautionary/20'
    case 'negative':
      return 'bg-status-negative/10 text-status-negative border-status-negative/20'
    default:
      return 'bg-fill-alternative text-label-neutral border-line-neutral'
  }
}

interface SurfaceProps extends HTMLAttributes<HTMLElement> {
  eyebrow?: string
  title?: string
  description?: string
  action?: ReactNode
  children: ReactNode
}

export function Surface({
  eyebrow,
  title,
  description,
  action,
  children,
  className = '',
  ...props
}: SurfaceProps) {
  return (
    <section
      className={`rounded-wds-lg border border-line-neutral bg-surface-normal p-4 shadow-sm md:p-6 ${className}`}
      {...props}
    >
      {(eyebrow || title || description || action) && (
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-col gap-1">
            {eyebrow && (
              <p className="text-xs font-semibold uppercase tracking-wide text-primary-normal">
                {eyebrow}
              </p>
            )}
            {title && <h2 className="text-base font-semibold text-label-normal md:text-lg">{title}</h2>}
            {description && <p className="max-w-3xl text-xs leading-relaxed text-label-alternative">{description}</p>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      {children}
    </section>
  )
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'md'
}

export function Button({
  variant = 'secondary',
  size = 'md',
  className = '',
  type = 'button',
  ...props
}: ButtonProps) {
  const variantClass = {
    primary: 'border-primary-normal bg-primary-normal text-white hover:bg-primary-strong',
    secondary: 'border-line-solid bg-surface-normal text-label-normal hover:bg-fill-alternative',
    ghost: 'border-transparent bg-transparent text-label-neutral hover:bg-fill-alternative',
  }[variant]
  const sizeClass = size === 'sm' ? 'h-8 px-3 text-xs' : 'h-10 px-4 text-sm'

  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center rounded-wds border font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${variantClass} ${sizeClass} ${className}`}
      {...props}
    />
  )
}

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone
}

export function Badge({ tone = 'neutral', className = '', ...props }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-wds-sm border px-2 py-1 text-xs font-semibold ${toneClasses(tone)} ${className}`}
      {...props}
    />
  )
}

interface MetricTileProps {
  label: string
  value: string
  help?: string
  tone?: Tone
}

export function MetricTile({ label, value, help, tone = 'neutral' }: MetricTileProps) {
  return (
    <div className={`rounded-wds border p-3 ${toneClasses(tone)}`}>
      <p className="text-xs font-medium opacity-80">{label}</p>
      <p className="mt-1 text-lg font-semibold text-label-normal" translate="no">{value}</p>
      {help && <p className="mt-1 text-xs text-label-alternative">{help}</p>}
    </div>
  )
}

interface FieldProps {
  label: string
  htmlFor: string
  help?: string
  children: ReactNode
}

export function Field({ label, htmlFor, help, children }: FieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-label-neutral" htmlFor={htmlFor}>{label}</label>
      {children}
      {help && <p className="text-xs text-label-alternative">{help}</p>}
    </div>
  )
}
