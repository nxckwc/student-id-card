"use client"

import { useLocale, useTranslations } from 'next-intl'
import { useQuery } from '@tanstack/react-query'
import { Activity, AlertTriangle, Radio, Ticket } from 'lucide-react'
import { ErrorState } from './components/AdminShell'
import { fetchAttendance, fetchOverview } from './lib/api'

const StatusCard = ({ icon, iconClass, title, value }: {
  icon: React.ReactNode
  iconClass: string
  title: string
  value: string
}) => (
  <div className="rounded-lg border border-border bg-surface/85 p-5">
    <div className="mb-5 flex items-center justify-between">
      <span className={`flex size-10 items-center justify-center rounded-lg ${iconClass}`}>{icon}</span>
      <span className="size-2 rounded-full bg-warning" aria-label="Pending integration" />
    </div>
    <p className="text-xs font-bold uppercase text-text-muted">{title}</p>
    <p className="mt-1 text-xl font-bold text-text-primary">{value}</p>
  </div>
)

const RingStat = ({ value, total, label, detail, color }: {
  value: number | null
  total: number | null
  label: string
  detail: string
  color: string
}) => {
  const safeTotal = total && total > 0 ? total : 0
  const percentage = safeTotal && value !== null ? Math.min(100, Math.round((value / safeTotal) * 100)) : 0

  return (
    <div className="flex items-center gap-5 rounded-lg border border-border bg-surface/85 p-5">
      <div className="relative flex size-24 shrink-0 items-center justify-center rounded-full" style={{ background: `conic-gradient(${color} ${percentage}%, var(--border-soft) ${percentage}% 100%)` }}>
        <span className="text-xl font-bold">{value === null ? '—' : `${percentage}%`}</span>
      </div>
      <div className="min-w-0">
        <p className="text-sm font-bold text-text-primary">{label}</p>
        <p className="mt-1 text-2xl font-bold tabular-nums">{value === null ? '—' : value} <span className="text-sm font-medium text-text-muted">/ {total ?? '—'}</span></p>
        <p className="mt-1 text-xs text-text-muted">{detail}</p>
      </div>
    </div>
  )
}

const OverviewPage = () => {
  const locale = useLocale()
  const t = useTranslations('admin')

  const overviewQuery = useQuery({ queryKey: ['admin', 'overview'], queryFn: fetchOverview })
  const latestLogQuery = useQuery({
    queryKey: ['admin', 'activity', 0, 1, ''],
    queryFn: () => fetchAttendance(0, 1, ''),
    refetchInterval: 5000,
  })

  const overview = overviewQuery.data
  const latestLog = latestLogQuery.data?.logs?.[0] ?? null
  const loading = overviewQuery.isLoading
  const scannedStudents = overview?.scannedStudents ?? null
  const notScannedStudents = overview?.students !== null && overview?.students !== undefined && scannedStudents !== null
    ? Math.max(0, overview.students - scannedStudents)
    : null

  return (
    <>
      <section className="grid gap-3 sm:grid-cols-3" aria-label={t('systemOverview')}>
        <StatusCard icon={<Radio className="size-5" />} iconClass="bg-info-soft text-info" title={t('activeReader')} value={t('notConnected')} />
        <StatusCard icon={<Ticket className="size-5" />} iconClass="bg-warning-soft text-warning-foreground" title={t('tickets')} value={t('noOpenTickets')} />
        <StatusCard icon={<AlertTriangle className="size-5" />} iconClass="bg-danger-soft text-danger-foreground" title={t('softwareErrors')} value={t('noErrors')} />
      </section>

      <section className="mt-8" aria-label={t('attendanceStats')}>
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <p className="mb-1 text-xs font-bold uppercase text-text-secondary">{t('stats')}</p>
            <h2 className="text-2xl font-bold text-text-primary">{t('attendanceStats')}</h2>
          </div>
          <span className="text-xs font-medium text-text-muted">{t('today')}</span>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <RingStat value={loading ? null : scannedStudents} total={loading ? null : overview?.students ?? null} label={t('scannedAtGate')} detail={t('studentsScannedToday', { count: notScannedStudents ?? '—' })} color="var(--accent)" />
          <RingStat value={loading ? null : notScannedStudents} total={loading ? null : overview?.students ?? null} label={t('notScanned')} detail={t('studentsNotScannedToday', { count: notScannedStudents ?? '—' })} color="var(--warning)" />
        </div>
      </section>

      <section className="mt-6" aria-label={t('latestLog')}>
        <p className="mb-1 text-xs font-bold uppercase text-text-secondary">{t('recentLogs')}</p>
        <div className="flex items-center gap-3 rounded-lg border border-border bg-surface/85 px-4 py-3">
          <span className="relative flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent-foreground">
            <Activity className="size-4" />
            <span className="absolute -right-1 -top-1 size-2 rounded-full bg-accent ring-2 ring-white" />
          </span>
          {latestLogQuery.isLoading ? (
            <div className="skeleton h-5 w-48 rounded" />
          ) : latestLog ? (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-text-primary">{latestLog.student.firstName} {latestLog.student.lastName}</p>
              <p className="text-xs text-text-muted">
                {latestLog.status || t('attendance')} · {new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(latestLog.timestamp))}
              </p>
            </div>
          ) : (
            <p className="text-sm text-text-muted">{t('noLatestLog')}</p>
          )}
        </div>
      </section>

      {overviewQuery.isError ? <ErrorState message="" onRetry={() => void overviewQuery.refetch()} /> : null}
    </>
  )
}

export default OverviewPage
