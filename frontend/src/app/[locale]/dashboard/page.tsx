"use client"

import { useEffect, useState } from 'react'
import axios from 'axios'
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'
import { useLocale, useTranslations } from 'next-intl'
import {
  BookOpen24Regular,
  ChevronRight20Regular,
  DataHistogram24Regular,
  DoorArrowLeft24Regular,
  PersonAccounts24Filled,
  PersonAccounts24Regular,
} from '@fluentui/react-icons'
import { AlertCircle, CalendarDays, Clock3, MapPin, RefreshCw } from 'lucide-react'

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3100').replace(/\/+$/, '')

const days = [1, 2, 3, 4, 5, 6, 7]

interface ScheduleEntry {
  id: number
  weekday: number
  period: number
  subject: string
  className: string
  roomId: string
  startTime: string
  endTime: string
}

interface SessionResponse {
  user: { username: string; role: string }
}

const getDashboardData = async (): Promise<{ schedule: ScheduleEntry[]; username: string; role: string }> => {
  const sessionResponse = await axios.get<SessionResponse>(`${API_BASE_URL}/auth/session`, { withCredentials: true })
  const scheduleResponse = sessionResponse.data.user.role === 'USER'
    ? { data: { schedule: [] } }
    : await axios.get<{ schedule: ScheduleEntry[] }>(`${API_BASE_URL}/dashboard/schedule`, { withCredentials: true })

  return {
    schedule: scheduleResponse.data.schedule,
    username: sessionResponse.data.user.username,
    role: sessionResponse.data.user.role,
  }
}

const reportScopes = [
  { id: 'arrival', icon: <DoorArrowLeft24Regular className="size-5" />, color: 'bg-danger-soft text-danger-foreground' },
  { id: 'student', icon: <PersonAccounts24Regular className="size-5" />, color: 'bg-accent-soft text-accent-foreground' },
  { id: 'class', icon: <DataHistogram24Regular className="size-5" />, color: 'bg-info-soft text-info' },
  { id: 'subject', icon: <BookOpen24Regular className="size-5" />, color: 'bg-warning-soft text-warning-foreground' },
]

const currentWeekday = (): number => {
  const day = new Date().getDay()
  return day === 0 ? 7 : day
}

const toMinutes = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

function DashboardContent() {
  const locale = useLocale()
  const t = useTranslations('dashboard')
  const [selectedDay, setSelectedDay] = useState(currentWeekday)
  const [currentTime, setCurrentTime] = useState(() => new Date())
  const [selectedLessonId, setSelectedLessonId] = useState<number | null>(null)
  const { data, error, isLoading, refetch } = useQuery({
    queryKey: ['dashboard-schedule'],
    queryFn: getDashboardData,
    refetchInterval: 5000,
  })

  const selectedLessons = (data?.schedule ?? []).filter((entry) => entry.weekday === selectedDay)
  const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes()
  const selectedDayLabel = t(`days.${selectedDay}.full`)
  const dateLabel = new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long' }).format(currentTime)

  useEffect(() => {
    const intervalId = window.setInterval(() => setCurrentTime(new Date()), 60_000)
    return () => window.clearInterval(intervalId)
  }, [])

  const isCurrentLesson = (lesson: ScheduleEntry): boolean => (
    selectedDay === currentWeekday()
    && currentMinutes >= toMinutes(lesson.startTime)
    && currentMinutes < toMinutes(lesson.endTime)
  )

  if (data?.role === 'USER') {
    return (
      <main className="relative min-h-screen bg-background px-4 pb-14 pt-24 text-text-primary sm:px-6 lg:px-8">
        <div className="relative mx-auto flex min-h-[calc(100vh-8rem)] max-w-7xl items-center justify-center">
          <section className="w-full max-w-2xl rounded-lg border border-border bg-surface/85 p-10 text-center shadow-[0_10px_28px_rgba(52,92,70,0.08)]">
            <h1 className="text-3xl font-bold text-text-primary">hello this what student see</h1>
          </section>
        </div>
      </main>
    )
  }

  return (
    <main className="relative min-h-screen bg-background px-4 pb-14 pt-24 text-text-primary sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle,rgba(112,139,122,0.16)_1px,transparent_1px)] bg-size-[24px_24px]" />
      <div className="relative mx-auto max-w-7xl">
        <section className="mb-10 flex flex-col gap-5 border-b border-border pb-8 sm:flex-row sm:items-end sm:justify-between" aria-labelledby="dashboard-title">
          <div className="flex items-center gap-3">
            <div className="relative flex size-12 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent-foreground">
              <PersonAccounts24Filled className="size-6" />
              <span className="absolute -right-1 -top-1 size-3 rotate-12 rounded-sm bg-danger-accent" />
            </div>
            <div>
              <p className="text-xs font-semibold text-text-muted">{t('workspace')}</p>
              <h1 id="dashboard-title" className="text-2xl font-bold text-text-primary">{t('welcome', { username: data?.username ?? 'Admin' })}</h1>
            </div>
          </div>
          <p className="text-sm font-medium text-text-muted">{t('today', { date: dateLabel })}</p>
        </section>

        <section id="schedule" className="scroll-mt-24" aria-labelledby="schedule-title">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="mb-1 flex items-center gap-2 text-xs font-bold uppercase text-danger-accent-soft"><CalendarDays className="size-4" /> {t('weeklySchedule')}</p>
              <h2 id="schedule-title" className="text-2xl font-bold text-text-primary">{selectedDayLabel}</h2>
            </div>
            <span className="text-sm text-text-muted">{t('periodCount', { count: selectedLessons.length })}</span>
          </div>

          <div className="mb-5 grid grid-cols-7 gap-1 rounded-lg border border-border bg-surface/80 p-1 shadow-[0_4px_18px_rgba(52,76,61,0.04)]" role="tablist" aria-label={t('selectDay')}>
            {days.map((day) => (
              <button
                key={day}
                type="button"
                role="tab"
                aria-selected={selectedDay === day}
                className={`min-w-0 rounded-md px-1 py-2.5 text-xs font-bold transition sm:px-3 sm:text-sm ${selectedDay === day ? 'bg-accent text-white shadow-sm' : 'text-text-nav hover:bg-surface-chip'}`}
                onClick={() => setSelectedDay(day)}
              >
                {t(`days.${day}.short`)}
              </button>
            ))}
          </div>

          {isLoading ? (
            <div className="schedule-rail flex snap-x gap-3 overflow-x-auto pb-4" aria-label={t('loading')}>
              {Array.from({ length: 7 }, (_, index) => <div key={index} className="skeleton h-48 w-72 shrink-0 snap-start rounded-lg" />)}
            </div>
          ) : error ? (
            <div className="flex flex-col items-start gap-3 rounded-lg border border-danger-border bg-danger-bg p-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="flex items-center gap-2 text-sm font-medium text-danger-foreground"><AlertCircle className="size-5" />{t('loadError')}</p>
              <button type="button" className="inline-flex items-center gap-2 rounded-md bg-danger px-3 py-2 text-sm font-semibold text-white hover:bg-danger-hover" onClick={() => void refetch()}><RefreshCw className="size-4" />{t('retry')}</button>
            </div>
          ) : selectedLessons.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border-dashed bg-surface/70 px-5 py-12 text-center text-sm text-text-muted">{t('noPeriods', { day: selectedDayLabel })}</div>
          ) : (
            <div className="schedule-rail flex snap-x gap-3 overflow-x-auto pb-4" aria-label={`${selectedDayLabel} ${t('weeklySchedule')}`}>
              {selectedLessons.map((lesson) => {
                const isCurrent = isCurrentLesson(lesson)
                const isSelected = selectedLessonId === lesson.id

                return (
                <button
                  key={lesson.id}
                  type="button"
                  disabled={!isCurrent}
                  aria-pressed={isSelected}
                  aria-label={`Period ${lesson.period}: ${lesson.subject}, ${isCurrent ? t('inProgress') : t('unavailable')}`}
                  onClick={() => setSelectedLessonId(lesson.id)}
                  className={`relative flex min-h-52 w-72 shrink-0 snap-start flex-col overflow-hidden rounded-lg border p-5 text-left transition ${isCurrent ? `border-accent-border bg-surface shadow-[0_10px_28px_rgba(52,92,70,0.1)] ${isSelected ? 'ring-2 ring-accent ring-offset-2 ring-offset-background' : 'hover:border-accent-border-hover'}` : 'cursor-not-allowed border-border bg-surface-muted opacity-60 grayscale'}`}
                >
                  <span className={`absolute inset-x-0 top-0 h-1 ${isCurrent ? 'bg-danger-accent' : 'bg-neutral'}`} />
                  <div className="flex items-start justify-between gap-3">
                    <span className="rounded-md bg-surface-chip px-2 py-1 text-xs font-bold text-text-secondary">Period {lesson.period}</span>
                    <span className="flex shrink-0 items-center gap-1 text-xs tabular-nums text-text-muted"><Clock3 className="size-3.5" />{lesson.startTime} - {lesson.endTime}</span>
                  </div>
                  <div className="mt-7">
                    <h3 className="text-xl font-bold text-text-primary">{lesson.subject}</h3>
                    <p className="mt-1 text-sm text-text-nav">{t('class', { name: lesson.className })}</p>
                  </div>
                  <div className="mt-auto flex items-center justify-between gap-2 pt-6">
                    <p className="flex items-center gap-1.5 text-xs font-semibold text-text-secondary"><MapPin className="size-3.5" />{t('room', { id: lesson.roomId })}</p>
                    {isCurrent && <span className="rounded-md bg-danger-accent px-2 py-1 text-xs font-bold text-white">{t('current')}</span>}
                  </div>
                </button>
                )
              })}
            </div>
          )}
        </section>

        <section id="reports" className="mt-12 scroll-mt-24" aria-labelledby="reports-title">
          <div className="mb-4">
            <p className="mb-1 text-xs font-bold uppercase text-danger-accent-soft">{t('insights')}</p>
            <h2 id="reports-title" className="text-2xl font-bold text-text-primary">{t('reports')}</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {reportScopes.map((scope) => (
              <button key={scope.id} className="group flex w-full items-center gap-4 rounded-lg border border-border bg-surface/85 p-4 text-left transition hover:-translate-y-0.5 hover:border-border-strong hover:shadow-[0_10px_24px_rgba(52,76,61,0.07)]" onClick={() => console.log('selected scope:', scope.id)}>
                <div className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${scope.color}`}>{scope.icon}</div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-bold text-text-primary">{t(`reportItems.${scope.id}.label`)}</h3>
                  <p className="mt-0.5 text-xs text-text-muted">{t(`reportItems.${scope.id}.description`)}</p>
                </div>
                <ChevronRight20Regular className="size-4 shrink-0 text-text-faint transition group-hover:translate-x-0.5 group-hover:text-danger-accent-soft" />
              </button>
            ))}
          </div>
        </section>
      </div>
    </main>
  )
}

export default function Dashboard() {
  const [queryClient] = useState(() => new QueryClient())

  return (
    <QueryClientProvider client={queryClient}>
      <DashboardContent />
    </QueryClientProvider>
  )
}
