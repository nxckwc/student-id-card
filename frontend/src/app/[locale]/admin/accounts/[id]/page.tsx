"use client"

import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertCircle, ArrowLeft, CalendarDays, Check, LoaderCircle, Save } from 'lucide-react'
import { EmptyState, ErrorState, RoleBadge } from '../../components/AdminShell'
import { fetchAccount, getApiErrorMessage, saveAccountSchedule, type AccountDetail, type ScheduleEntry } from '../../lib/api'

const days = [1, 2, 3, 4, 5, 6, 7]
const periods = [1, 2, 3, 4, 5, 6, 7, 8]

// Fallback for not-yet-saved periods; the backend recomputes these on save.
const periodTimes: Record<number, [string, string]> = {
  1: ['08:30', '09:25'], 2: ['09:25', '10:20'], 3: ['10:20', '11:15'], 4: ['11:15', '12:10'],
  5: ['12:10', '13:05'], 6: ['13:05', '14:00'], 7: ['14:00', '14:55'], 8: ['14:55', '15:50'],
}

type Draft = Omit<ScheduleEntry, 'id' | 'startTime' | 'endTime'>

const emptyDraft = (weekday: number, period: number): Draft => ({ weekday, period, subject: '', className: '', roomId: '' })

const AccountDetailPage = ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = use(params)
  const accountId = Number(id)
  const locale = useLocale()
  const t = useTranslations('admin')
  const queryClient = useQueryClient()

  const accountQuery = useQuery({
    queryKey: ['admin', 'account', accountId],
    queryFn: () => fetchAccount(accountId),
    enabled: Number.isInteger(accountId),
  })

  const account = accountQuery.data
  const [selectedDay, setSelectedDay] = useState(1)
  const [draft, setDraft] = useState<Draft[]>([])
  const [isDirty, setIsDirty] = useState(false)

  const accountLoadedId = account?.id
  useEffect(() => {
    if (account) {
      setDraft(account.scheduleEntries.map((entry) => ({ weekday: entry.weekday, period: entry.period, subject: entry.subject, className: entry.className, roomId: entry.roomId })))
      setIsDirty(false)
    }
  }, [accountLoadedId])

  const saveMutation = useMutation({
    mutationFn: (entries: ScheduleEntry[]) => saveAccountSchedule(accountId, entries),
    onSuccess: (schedule) => {
      if (account) {
        queryClient.setQueryData(['admin', 'account', accountId], { ...account, scheduleEntries: schedule } satisfies AccountDetail)
      }
      void queryClient.invalidateQueries({ queryKey: ['admin', 'accounts'] })
      void queryClient.invalidateQueries({ queryKey: ['admin', 'overview'] })
      setIsDirty(false)
    },
  })

  const updateDraft = (period: number, field: 'subject' | 'className' | 'roomId', value: string) => {
    setIsDirty(true)
    setDraft((current) => {
      const existing = current.find((entry) => entry.weekday === selectedDay && entry.period === period)
      if (existing) return current.map((entry) => (entry === existing ? { ...entry, [field]: value } : entry))
      return [...current, { ...emptyDraft(selectedDay, period), [field]: value }]
    })
  }

  const handleSave = () => {
    const completeEntries = draft.filter((entry) => entry.subject.trim() && entry.className.trim() && entry.roomId.trim())
    saveMutation.mutate(completeEntries)
  }

  if (!Number.isInteger(accountId)) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-lg border border-danger-border bg-danger-bg p-6">
        <p className="flex items-center gap-2 text-sm font-medium text-danger-foreground"><AlertCircle className="size-5" />{t('invalidId')}</p>
        <Link href={`/${locale}/admin/accounts`} className="text-sm font-bold text-accent underline underline-offset-4">{t('backToAccounts')}</Link>
      </div>
    )
  }

  const dayEntries = draft.filter((entry) => entry.weekday === selectedDay)
  const getDraft = (period: number): Draft => dayEntries.find((entry) => entry.period === period) ?? emptyDraft(selectedDay, period)
  const incompleteCount = draft.filter((entry) => !(entry.subject.trim() && entry.className.trim() && entry.roomId.trim())).length
  const errorMessage = getApiErrorMessage(saveMutation.error)
  const notFound = accountQuery.error && (accountQuery.error as { response?: { status?: number } }).response?.status === 404

  return (
    <>
      <Link href={`/${locale}/admin/accounts`} className="mb-6 flex items-center gap-2 text-sm font-semibold text-text-secondary hover:text-text-primary">
        <ArrowLeft className="size-4" />
        {t('backToAccounts')}
      </Link>

      {accountQuery.isLoading ? (
        <div className="space-y-4">
          <div className="skeleton h-10 w-64 rounded-md" />
          <div className="skeleton h-96 w-full rounded-lg" />
        </div>
      ) : accountQuery.isError ? (
        notFound ? (
          <div className="flex flex-col items-start gap-3 rounded-lg border border-danger-border bg-danger-bg p-6">
            <p className="flex items-center gap-2 text-sm font-medium text-danger-foreground"><AlertCircle className="size-5" />{t('accountNotFound')}</p>
            <Link href={`/${locale}/admin/accounts`} className="text-sm font-bold text-accent underline underline-offset-4">{t('backToAccounts')}</Link>
          </div>
        ) : (
          <ErrorState message="" onRetry={() => void accountQuery.refetch()} />
        )
      ) : !account ? (
        <EmptyState message={t('accountNotFound')} />
      ) : (
        <>
          <section className="mb-8 flex flex-col gap-2 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase text-text-secondary">{t('accountDetails')}</p>
              <h1 className="flex items-center gap-3 text-3xl font-bold">
                {account.username}
                <RoleBadge role={account.role} />
              </h1>
              <p className="mt-2 text-sm text-text-muted">
                {t('memberSince', { date: new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(account.createdAt)) })} · {t('accountId')} {account.id}
              </p>
            </div>
            <button
              type="button"
              onClick={handleSave}
              disabled={saveMutation.isPending || !isDirty}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-accent px-4 py-2.5 text-sm font-bold text-white transition hover:bg-accent-hover disabled:opacity-60"
            >
              {saveMutation.isPending ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />}
              {saveMutation.isPending ? t('saving') : t('save')}
            </button>
          </section>

          {saveMutation.isSuccess && (
            <p className="mb-4 flex items-center gap-2 text-sm font-semibold text-accent-foreground" role="status">
              <Check className="size-4" />
              {t('saved')}
            </p>
          )}
          {errorMessage && (
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-danger-border bg-danger-bg px-4 py-3 text-sm font-medium text-danger-foreground" role="alert">
              <AlertCircle className="size-4 shrink-0" />
              {errorMessage}
            </div>
          )}

          <section className="rounded-lg border border-border bg-surface/85 p-4 sm:p-6">
            <div className="mb-5 flex items-center gap-2">
              <CalendarDays className="size-5 text-text-secondary" />
              <h2 className="text-lg font-bold">{t('assignSchedule')}</h2>
            </div>

            <div className="mb-6 grid grid-cols-7 gap-1 rounded-md bg-surface-chip p-1" role="tablist" aria-label={t('selectDay')}>
              {days.map((day) => (
                <button
                  key={day}
                  type="button"
                  role="tab"
                  aria-selected={selectedDay === day}
                  onClick={() => setSelectedDay(day)}
                  className={`rounded px-1 py-2 text-xs font-bold transition sm:px-3 sm:text-sm ${selectedDay === day ? 'bg-accent text-white' : 'text-text-nav hover:bg-surface'}`}
                >
                  {t(`days.${day}`)}
                </button>
              ))}
            </div>

            <div className="space-y-3">
              {periods.map((period) => {
                const entry = getDraft(period)
                const saved = account.scheduleEntries.find((item) => item.period === period)
                const [start, end] = saved?.startTime ? [saved.startTime, saved.endTime] : periodTimes[period]
                return (
                  <div key={period} className="grid gap-2 rounded-md border border-border-soft p-3 sm:grid-cols-[8rem_1fr_1fr_1fr] sm:items-center">
                    <div>
                      <p className="text-sm font-bold">{t('period')} {period}</p>
                      <p className="text-xs text-text-muted">{start} - {end}</p>
                    </div>
                    <input
                      type="text"
                      value={entry.subject}
                      onChange={(event) => updateDraft(period, 'subject', event.target.value)}
                      placeholder={t('subject')}
                      aria-label={`${t('subject')} — ${t('period')} ${period}`}
                      className="rounded border border-border px-3 py-2 text-sm outline-none focus:border-accent"
                    />
                    <input
                      type="text"
                      value={entry.className}
                      onChange={(event) => updateDraft(period, 'className', event.target.value)}
                      placeholder={t('className')}
                      aria-label={`${t('className')} — ${t('period')} ${period}`}
                      className="rounded border border-border px-3 py-2 text-sm outline-none focus:border-accent"
                    />
                    <input
                      type="text"
                      value={entry.roomId}
                      onChange={(event) => updateDraft(period, 'roomId', event.target.value)}
                      placeholder={t('room')}
                      aria-label={`${t('room')} — ${t('period')} ${period}`}
                      className="rounded border border-border px-3 py-2 text-sm outline-none focus:border-accent"
                    />
                  </div>
                )
              })}
            </div>

            {incompleteCount > 0 && (
              <p className="mt-4 flex items-center gap-2 text-sm font-medium text-warning-foreground">
                <AlertCircle className="size-4 shrink-0" />
                {t('incompleteRows', { count: incompleteCount })}
              </p>
            )}
          </section>
        </>
      )}
    </>
  )
}

export default AccountDetailPage
