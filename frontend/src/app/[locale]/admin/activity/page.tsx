"use client"

import { useEffect, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { useQuery } from '@tanstack/react-query'
import { Activity, ChevronDown, Search } from 'lucide-react'
import { DataUnavailableBanner, EmptyState, ErrorState, PageHeader } from '../components/AdminShell'
import { fetchAttendance } from '../lib/api'

const pageSize = 20

const ActivityPage = () => {
  const locale = useLocale()
  const t = useTranslations('admin')

  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [limit, setLimit] = useState(pageSize)

  useEffect(() => {
    const timeout = setTimeout(() => {
      setSearch(searchInput.trim())
      setLimit(pageSize)
    }, 300)
    return () => clearTimeout(timeout)
  }, [searchInput])

  const activityQuery = useQuery({
    queryKey: ['admin', 'activity', 0, limit, search],
    queryFn: () => fetchAttendance(0, limit, search),
  })

  const data = activityQuery.data
  const logs = data?.studentDataAvailable ? data.logs ?? [] : null
  const total = data?.studentDataAvailable ? (data.total ?? 0) : null

  return (
    <>
      <PageHeader
        eyebrow={t('activityLog')}
        title={t('activity')}
        description={t('activityDescription')}
      />

      {data?.studentDataAvailable === false ? (
        <DataUnavailableBanner message={t('studentDataUnavailable')} />
      ) : (
        <>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-faint" />
              <input
                type="search"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder={t('searchActivity')}
                aria-label={t('searchActivity')}
                className="w-full rounded-lg border border-border bg-surface/85 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-accent"
              />
            </div>
            {total !== null && <p className="text-sm text-text-muted">{t('activityCount', { count: total })}</p>}
          </div>

          {activityQuery.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }, (_, index) => <div key={index} className="skeleton h-14 rounded-lg" />)}
            </div>
          ) : activityQuery.isError ? (
            <ErrorState message="" onRetry={() => void activityQuery.refetch()} />
          ) : !logs ? (
            <DataUnavailableBanner message={t('studentDataUnavailable')} />
          ) : logs.length === 0 ? (
            <EmptyState message={search ? t('noActivityFound') : t('noActivity')} />
          ) : (
            <>
              <div className="overflow-hidden rounded-lg border border-border bg-surface/85">
                {logs.map((log) => (
                  <div key={log.id} className="flex items-center gap-4 border-b border-border-soft p-4 last:border-0">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-sm font-bold text-accent-foreground">
                      {log.student.firstName.charAt(0).toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-bold">{log.student.firstName} {log.student.lastName}</span>
                      <span className="flex items-center gap-1 text-xs text-text-muted">
                        <Activity className="size-3" />
                        {log.type} · {new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(log.timestamp))}
                        {log.context ? ` · ${log.context.subject} · ${log.context.roomId} · P${log.context.period}` : ''}
                      </span>
                    </span>
                    <span className="rounded-md bg-surface-chip px-2 py-1 text-xs font-bold text-text-secondary">{log.status || '—'}</span>
                  </div>
                ))}
              </div>
              {total !== null && total > limit && (
                <div className="mt-4 flex justify-center">
                  <button
                    type="button"
                    onClick={() => setLimit((current) => current + pageSize)}
                    className="inline-flex items-center gap-2 rounded-md border border-border bg-surface/85 px-4 py-2 text-sm font-bold text-text-secondary transition hover:bg-surface"
                  >
                    <ChevronDown className="size-4" />
                    {t('loadMore')}
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}
    </>
  )
}

export default ActivityPage
