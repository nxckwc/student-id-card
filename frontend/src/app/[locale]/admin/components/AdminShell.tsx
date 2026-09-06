import { AlertCircle, RefreshCw } from 'lucide-react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <section className="mb-8 flex flex-col gap-4 border-b border-border pb-8 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="mb-2 text-xs font-semibold uppercase text-text-secondary">{eyebrow}</p>
        <h1 className="text-3xl font-bold">{title}</h1>
        {description && <p className="mt-2 text-sm text-text-muted">{description}</p>}
      </div>
      {action}
    </section>
  )
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  const t = useTranslations('admin')
  return (
    <div className="flex flex-col items-start gap-3 rounded-lg border border-danger-border bg-danger-bg p-5 sm:flex-row sm:items-center sm:justify-between">
      <p className="flex items-center gap-2 text-sm font-medium text-danger-foreground">
        <AlertCircle className="size-5 shrink-0" />
        {message || t('loadError')}
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex items-center gap-2 rounded-md bg-danger px-3 py-2 text-sm font-semibold text-white hover:bg-danger-hover"
      >
        <RefreshCw className="size-4" />
        {t('retry')}
      </button>
    </div>
  )
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border-dashed bg-surface/70 px-5 py-12 text-center text-sm text-text-muted">
      {message}
    </div>
  )
}

export function DataUnavailableBanner({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface-chip px-5 py-4 text-sm font-medium text-text-nav">
      {message}
    </div>
  )
}

export function StatCard({
  icon,
  iconClass,
  value,
  label,
  href,
  loading,
}: {
  icon: React.ReactNode
  iconClass: string
  value: string | number
  label: string
  href?: string
  loading?: boolean
}) {
  const body = (
    <>
      <span className={`mb-5 flex size-10 items-center justify-center rounded-lg ${iconClass}`}>{icon}</span>
      {loading ? (
        <div className="skeleton h-9 w-20 rounded-md" />
      ) : (
        <p className="text-3xl font-bold tabular-nums">{value}</p>
      )}
      <p className="mt-1 text-sm font-medium text-text-muted">{label}</p>
    </>
  )

  const className = 'border border-border bg-surface/85 p-5 text-left transition'

  if (!href) {
    return <div className={className}>{body}</div>
  }

  return (
    <Link
      href={href}
      className={`${className} hover:-translate-y-0.5 hover:border-border-strong hover:shadow-[0_10px_24px_rgba(52,76,61,0.07)]`}
    >
      {body}
    </Link>
  )
}

export function RoleBadge({ role }: { role: string }) {
  const styles =
    role === 'ADMIN' ? 'bg-accent-soft text-accent-foreground'
    : role === 'TEACHER' ? 'bg-info-soft text-info'
    : 'bg-surface-subtle text-text-muted'
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-bold ${styles}`}>
      {role}
    </span>
  )
}
