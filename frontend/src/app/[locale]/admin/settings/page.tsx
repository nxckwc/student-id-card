"use client"

import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertCircle, Check, Save, Settings2 } from 'lucide-react'
import { ErrorState, PageHeader } from '../components/AdminShell'
import { fetchSchoolSettings, getApiErrorMessage, saveSchoolSettings } from '../lib/api'

const SettingsPage = () => {
  const queryClient = useQueryClient()
  const [lateCutoff, setLateCutoff] = useState('08:00')
  const [timezone, setTimezone] = useState('Asia/Bangkok')
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const settingsQuery = useQuery({ queryKey: ['admin', 'settings'], queryFn: fetchSchoolSettings })

  useEffect(() => {
    if (!settingsQuery.data) return
    setLateCutoff(settingsQuery.data.lateCutoff)
    setTimezone(settingsQuery.data.timezone)
  }, [settingsQuery.data])

  const saveMutation = useMutation({
    mutationFn: () => saveSchoolSettings(lateCutoff, timezone),
    onSuccess: () => {
      setFeedback({ type: 'success', message: 'Attendance settings saved.' })
      void queryClient.invalidateQueries({ queryKey: ['admin', 'settings'] })
    },
    onError: (error) => setFeedback({ type: 'error', message: getApiErrorMessage(error) ?? 'Unable to save settings.' }),
  })

  if (settingsQuery.isLoading) {
    return <div className="skeleton h-64 rounded-xl" />
  }

  if (settingsQuery.isError) {
    return <ErrorState message="" onRetry={() => void settingsQuery.refetch()} />
  }

  return (
    <>
      <PageHeader
        eyebrow="System configuration"
        title="Settings"
        description="Configure the school-wide rules used by gate attendance readers."
      />

      {feedback && (
        <div className={`mb-5 flex items-center gap-2 rounded-lg border px-4 py-3 text-sm font-semibold ${feedback.type === 'error' ? 'border-[#e8bcb6] bg-[#fff8f6] text-[#99483f]' : 'border-[#b9d4c6] bg-[#eef7f2] text-[#356b5c]'}`} role="status">
          {feedback.type === 'error' ? <AlertCircle className="size-4" /> : <Check className="size-4" />}
          {feedback.message}
        </div>
      )}

      <section className="max-w-2xl rounded-xl border border-[#dce5de] bg-white p-5 shadow-[0_14px_36px_rgba(52,76,61,0.06)] sm:p-7">
        <div className="mb-6 flex items-center gap-3 border-b border-[#e8eee9] pb-5">
          <span className="flex size-10 items-center justify-center rounded-lg bg-[#deece4] text-[#356b5c]"><Settings2 className="size-5" /></span>
          <div>
            <h2 className="text-lg font-bold">Attendance rules</h2>
            <p className="text-sm text-[#748078]">These values apply to all active gate readers.</p>
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <label className="text-xs font-bold uppercase tracking-wide text-[#748078]" htmlFor="late-cutoff">
            Late cutoff
            <input id="late-cutoff" type="time" value={lateCutoff} onChange={(event) => setLateCutoff(event.target.value)} className="mt-2 w-full rounded-lg border border-[#dce5de] px-3 py-2.5 text-sm font-normal normal-case text-[#26332e] outline-none focus:border-[#3f7565]" />
            <span className="mt-2 block text-xs font-normal normal-case text-[#8a978d]">Gate IN scans at or after this time are marked late.</span>
          </label>
          <label className="text-xs font-bold uppercase tracking-wide text-[#748078]" htmlFor="school-timezone">
            School timezone
            <input id="school-timezone" type="text" value={timezone} onChange={(event) => setTimezone(event.target.value)} placeholder="Asia/Bangkok" className="mt-2 w-full rounded-lg border border-[#dce5de] px-3 py-2.5 text-sm font-normal normal-case text-[#26332e] outline-none focus:border-[#3f7565]" />
            <span className="mt-2 block text-xs font-normal normal-case text-[#8a978d]">Used for school days, periods, and cutoff evaluation.</span>
          </label>
        </div>

        <div className="mt-7 flex justify-end border-t border-[#e8eee9] pt-5">
          <button type="button" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !lateCutoff || !timezone.trim()} className="inline-flex items-center gap-2 rounded-lg bg-[#3f7565] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#315f51] disabled:cursor-not-allowed disabled:opacity-50">
            <Save className="size-4" />
            {saveMutation.isPending ? 'Saving...' : 'Save settings'}
          </button>
        </div>
      </section>
    </>
  )
}

export default SettingsPage
