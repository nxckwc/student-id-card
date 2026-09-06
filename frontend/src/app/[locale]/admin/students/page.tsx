"use client"

import { useEffect, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertCircle, Check, Copy, GraduationCap, Search, UserPlus } from 'lucide-react'
import { DataUnavailableBanner, EmptyState, ErrorState, PageHeader } from '../components/AdminShell'
import { createStudent, fetchStudents, getApiErrorMessage } from '../lib/api'

const StudentsPage = () => {
  const locale = useLocale()
  const t = useTranslations('admin')
  const queryClient = useQueryClient()

  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [studentId, setStudentId] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<{ kind: 'error' | 'success'; message: string; card?: string } | null>(null)

  useEffect(() => {
    const timeout = setTimeout(() => setSearch(searchInput.trim()), 300)
    return () => clearTimeout(timeout)
  }, [searchInput])

  useEffect(() => {
    if (!feedback) return
    const timeout = setTimeout(() => setFeedback(null), 4000)
    return () => clearTimeout(timeout)
  }, [feedback])

  const studentsQuery = useQuery({ queryKey: ['admin', 'students', search], queryFn: () => fetchStudents(search) })
  const students = studentsQuery.data?.studentDataAvailable ? studentsQuery.data.students ?? [] : null

  const addMutation = useMutation({
    mutationFn: () => createStudent(firstName.trim(), lastName.trim(), studentId.trim()),
    onSuccess: (student) => {
      setFirstName('')
      setLastName('')
      setStudentId('')
      setFeedback({ kind: 'success', message: t('addStudentSuccess', { name: `${student.firstName} ${student.lastName}`, studentId: student.studentId ?? '' }) })
      void queryClient.invalidateQueries({ queryKey: ['admin', 'students'] })
      void queryClient.invalidateQueries({ queryKey: ['admin', 'overview'] })
    },
    onError: (error) => setFeedback({ kind: 'error', message: getApiErrorMessage(error) ?? t('loadError') }),
  })

  const canAdd = firstName.trim().length > 0 && lastName.trim().length > 0 && /^\d+$/.test(studentId.trim())

  const copyCard = async (studentId: string, uidCard: string | null) => {
    if (!uidCard) return
    try {
      await navigator.clipboard.writeText(uidCard)
      setCopiedId(studentId)
      setTimeout(() => setCopiedId((current) => (current === studentId ? null : current)), 2000)
    } catch {
      setFeedback({ kind: 'error', message: t('copyFailed') })
    }
  }

  return (
    <>
      <PageHeader
        eyebrow={t('studentManagement')}
        title={t('students')}
        description={t('studentsDescription')}
      />

      {feedback && (
        <div
          className={`mb-4 flex items-start gap-2 rounded-lg border px-4 py-3 text-sm font-semibold ${
            feedback.kind === 'error' ? 'border-danger-border bg-danger-bg text-danger-foreground' : 'border-accent-border bg-surface-soft text-accent-foreground'
          }`}
          role="status"
        >
          {feedback.kind === 'error' ? <AlertCircle className="mt-0.5 size-4 shrink-0" /> : <Check className="mt-0.5 size-4 shrink-0" />}
          <span className="break-all">{feedback.message}</span>
        </div>
      )}

      {studentsQuery.data?.studentDataAvailable === false ? (
        <DataUnavailableBanner message={t('studentDataUnavailable')} />
      ) : (
        <>
          <form
            className="mb-6 rounded-lg border border-border bg-surface/85 p-4"
            onSubmit={(event) => {
              event.preventDefault()
              if (canAdd) addMutation.mutate()
            }}
          >
            <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-text-primary">
              <UserPlus className="size-4 text-accent" />
              {t('addStudent')}
            </h2>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={studentId}
                onChange={(event) => setStudentId(event.target.value.replace(/[^0-9]/g, ''))}
                placeholder={t('studentId')}
                aria-label={t('studentId')}
                required
                className="flex-1 rounded border border-border px-3 py-2 text-sm outline-none focus:border-accent"
              />
              <input
                type="text"
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                placeholder={t('firstName')}
                aria-label={t('firstName')}
                required
                className="flex-1 rounded border border-border px-3 py-2 text-sm outline-none focus:border-accent"
              />
              <input
                type="text"
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                placeholder={t('lastName')}
                aria-label={t('lastName')}
                required
                className="flex-1 rounded border border-border px-3 py-2 text-sm outline-none focus:border-accent"
              />
              <button
                type="submit"
                disabled={!canAdd || addMutation.isPending}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-bold text-white transition hover:bg-accent-hover disabled:opacity-60"
              >
                <UserPlus className="size-4" />
                {t('addStudent')}
              </button>
            </div>
          </form>

          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-faint" />
              <input
                type="search"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder={t('searchStudents')}
                aria-label={t('searchStudents')}
                className="w-full rounded-lg border border-border bg-surface/85 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-accent"
              />
            </div>
            {students && <p className="text-sm text-text-muted">{t('studentCount', { count: students.length })}</p>}
          </div>

          {studentsQuery.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }, (_, index) => <div key={index} className="skeleton h-16 rounded-lg" />)}
            </div>
          ) : studentsQuery.isError ? (
            <ErrorState message="" onRetry={() => void studentsQuery.refetch()} />
          ) : !students ? (
            <DataUnavailableBanner message={t('studentDataUnavailable')} />
          ) : students.length === 0 ? (
            <EmptyState message={search ? t('noStudentsFound') : t('noStudents')} />
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border bg-surface/85">
              <table className="w-full min-w-[40rem] text-left text-sm">
                <thead>
                  <tr className="border-b border-border-soft text-xs uppercase text-text-faint">
                    <th scope="col" className="px-4 py-3 font-bold">{t('student')}</th>
                    <th scope="col" className="px-4 py-3 font-bold">{t('studentId')}</th>
                    <th scope="col" className="px-4 py-3 font-bold">{t('cardUid')}</th>
                    <th scope="col" className="px-4 py-3 font-bold">{t('checkIns')}</th>
                    <th scope="col" className="px-4 py-3 font-bold">{t('added')}</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => (
                    <tr key={student.id} className="border-b border-border-soft last:border-0 hover:bg-surface-row">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-info-soft text-info">
                            <GraduationCap className="size-4" />
                          </span>
                          <span className="font-bold">{student.firstName} {student.lastName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 tabular-nums text-text-secondary">{student.studentId ?? '—'}</td>
                      <td className="px-4 py-3">
                        {student.uid_card ? (
                          <button
                            type="button"
                            onClick={() => void copyCard(student.id, student.uid_card)}
                            title={t('copyCardId')}
                            className="flex items-center gap-2 rounded font-mono text-xs text-text-secondary transition hover:bg-surface-chip"
                          >
                            <span className="truncate">{student.uid_card}</span>
                            {copiedId === student.id ? <Check className="size-3.5 shrink-0 text-accent-foreground" /> : <Copy className="size-3.5 shrink-0 text-text-faint" />}
                          </button>
                        ) : (
                          <span className="rounded-full bg-surface-subtle px-2.5 py-1 text-xs font-semibold text-text-faint">{t('cardNotRegistered')}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 tabular-nums text-text-nav">{student._count.gateLogs + student._count.roomLogs}</td>
                      <td className="px-4 py-3 text-text-nav">
                        {new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(student.createdAt))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </>
  )
}

export default StudentsPage
