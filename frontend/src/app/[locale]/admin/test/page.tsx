"use client"

import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Activity, Check, GraduationCap, Nfc, Search, ShieldCheck, UserX } from 'lucide-react'
import { ErrorState, PageHeader } from '../components/AdminShell'
import { fetchAttendance, fetchReaders, getApiErrorMessage, lookupReaderCard, registerReaderCard, simulateReaderScan, type ReaderScanResult } from '../lib/api'

type Action = 'tap' | 'register' | 'lookup'
const normalizeUid = (value: string): string => value.trim().toLowerCase()
const isValidUid = (value: string): boolean => /^[0-9a-f]{6,32}$/.test(value)

const TestPage = () => {
  const queryClient = useQueryClient()
  const [action, setAction] = useState<Action>('tap')
  const [readerId, setReaderId] = useState('')
  const [cardUid, setCardUid] = useState('')
  const [studentId, setStudentId] = useState('')
  const [deviceToken, setDeviceToken] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ReaderScanResult | null>(null)
  const [lookup, setLookup] = useState<{ found: boolean; student: { firstName: string; lastName: string; studentId: string | null; uid_card: string | null } | null } | null>(null)

  const readersQuery = useQuery({ queryKey: ['admin', 'readers'], queryFn: fetchReaders })
  const recentQuery = useQuery({ queryKey: ['admin', 'activity', 0, 8, ''], queryFn: () => fetchAttendance(0, 8, ''), refetchInterval: 5000 })

  useEffect(() => {
    if (readersQuery.data?.length && !readerId) setReaderId(readersQuery.data[0]?.id ?? '')
  }, [readersQuery.data, readerId])

  const scanMutation = useMutation({
    mutationFn: () => simulateReaderScan(normalizeUid(cardUid), { readerId }),
    onSuccess: (value) => { setResult(value); setError(null); void queryClient.invalidateQueries({ queryKey: ['admin', 'activity'] }); void queryClient.invalidateQueries({ queryKey: ['admin', 'overview'] }) },
    onError: (value) => { setResult(null); setError(getApiErrorMessage(value) ?? 'Unable to process reader scan') },
  })
  const lookupMutation = useMutation({
    mutationFn: () => lookupReaderCard(normalizeUid(cardUid)),
    onSuccess: (value) => { setLookup(value); setError(null) },
    onError: (value) => { setLookup(null); setError(getApiErrorMessage(value) ?? 'Unable to look up card') },
  })
  const registerMutation = useMutation({
    mutationFn: () => registerReaderCard(studentId.trim(), normalizeUid(cardUid), deviceToken.trim()),
    onSuccess: () => { setError(null); setLookup({ found: true, student: null }) },
    onError: (value) => setError(getApiErrorMessage(value) ?? 'Unable to register card'),
  })

  const selectedReader = readersQuery.data?.find((reader) => reader.id === readerId)
  const submit = () => {
    if (!isValidUid(normalizeUid(cardUid))) { setError('Card UID must be 6-32 hexadecimal characters'); return }
    if (action === 'tap') scanMutation.mutate()
    else if (action === 'lookup') lookupMutation.mutate()
    else registerMutation.mutate()
  }

  return (
    <>
      <PageHeader eyebrow="Reader testing" title="Test" description="Simulate gate and room reader scans, look up cards, and verify attendance responses." />
      {error && <div className="mb-4 flex items-center gap-2 rounded-lg border border-[#e8bcb6] bg-[#fff8f6] px-4 py-3 text-sm font-semibold text-[#99483f]" role="alert"><UserX className="size-4" />{error}</div>}

      <div>
        <section className="rounded-xl border border-[#cbdacf] bg-white p-5 shadow-[0_14px_36px_rgba(52,76,61,0.08)] sm:p-7">
          <div className="mb-6 flex items-center gap-2 text-sm font-bold text-[#314038]"><Nfc className="size-5 text-[#3f7565]" />Simulate a reader tap</div>
          <div className="mb-5 grid gap-4 sm:grid-cols-2">
            <label className="text-xs font-bold uppercase text-[#748078]">Reader<select value={readerId} onChange={(event) => setReaderId(event.target.value)} className="mt-2 w-full rounded-lg border border-[#dce5de] bg-white px-3 py-2.5 text-sm font-normal normal-case"><option value="">Select a reader</option>{readersQuery.data?.map((reader) => <option key={reader.id} value={reader.id}>{reader.name} ({reader.type}){reader.active ? '' : ' - inactive'}</option>)}</select></label>
            <label className="text-xs font-bold uppercase text-[#748078]">Card UID<input value={cardUid} onChange={(event) => setCardUid(event.target.value.toLowerCase())} placeholder="04a1b2c3d4" className="mt-2 w-full rounded-lg border border-[#dce5de] px-3 py-2.5 font-mono text-sm font-normal normal-case" /></label>
          </div>
          <div className="mb-5 grid grid-cols-3 gap-1 rounded-lg border border-[#dce5de] bg-[#f8fbf8] p-1">{([['tap', 'Tap'], ['lookup', 'Lookup'], ['register', 'Register card']] as const).map(([value, label]) => <button key={value} type="button" onClick={() => setAction(value)} className={`rounded-md px-2 py-2.5 text-xs font-bold ${action === value ? 'bg-[#3f7565] text-white' : 'text-[#69766e] hover:bg-white'}`}>{value === 'tap' ? <Nfc className="mx-auto mb-1 size-4" /> : value === 'lookup' ? <Search className="mx-auto mb-1 size-4" /> : <ShieldCheck className="mx-auto mb-1 size-4" />}{label}</button>)}</div>
          {action === 'register' && <div className="mb-5 grid gap-4 sm:grid-cols-2"><input value={studentId} onChange={(event) => setStudentId(event.target.value.replace(/\D/g, ''))} placeholder="Official student ID" className="rounded-lg border border-[#dce5de] px-3 py-2.5 text-sm" /><input type="password" value={deviceToken} onChange={(event) => setDeviceToken(event.target.value)} placeholder="Registration device token" className="rounded-lg border border-[#dce5de] px-3 py-2.5 text-sm" /></div>}
          <button type="button" disabled={!readerId || (action === 'tap' && !selectedReader) || scanMutation.isPending || lookupMutation.isPending || registerMutation.isPending} onClick={submit} className="inline-flex items-center gap-2 rounded-lg bg-[#3f7565] px-5 py-3 text-sm font-bold text-white disabled:opacity-50">{action === 'tap' ? <Nfc className="size-4" /> : action === 'lookup' ? <Search className="size-4" /> : <ShieldCheck className="size-4" />}{action === 'tap' ? 'Process tap' : action === 'lookup' ? 'Look up card' : 'Register card'}</button>
          {result && <div className="mt-6 rounded-lg border border-[#b9d4c6] bg-[#eef7f2] p-4"><div className="flex items-center gap-3"><GraduationCap className="size-6 text-[#356b5c]" /><div className="min-w-0 flex-1"><p className="font-bold">{result.student.firstName} {result.student.lastName}</p><p className="text-xs text-[#748078]">{result.reader.name} · {result.reader.type}</p></div><span className="rounded-md bg-white px-2 py-1 text-xs font-bold text-[#356b5c]">{result.action}</span></div>{result.gate && <p className="mt-3 text-sm text-[#52675c]">Gate state: <strong>{result.gate.state}</strong> · arrival: <strong>{result.gate.inStatus}</strong></p>}{result.room && <p className="mt-3 text-sm text-[#52675c]">{result.room.subject} · {result.room.className} · room {result.room.roomId} · period {result.room.period}</p>}<p className="mt-2 text-xs text-[#748078]">{result.created ? 'New record created' : 'Existing record returned'} · {result.elapsedMs} ms</p></div>}
          {lookup && <div className="mt-6 rounded-lg border border-[#dce5de] bg-[#f8fbf8] p-4 text-sm">{lookup.student ? <><strong>{lookup.student.firstName} {lookup.student.lastName}</strong><span className="ml-3 text-[#748078]">{lookup.student.studentId ?? 'No student ID'}</span></> : 'Card not registered.'}</div>}
        </section>
      </div>

      <section className="mt-6 rounded-xl border border-[#dce5de] bg-white p-5"><h2 className="mb-4 text-sm font-bold">Recent reader activity</h2>{recentQuery.isError ? <ErrorState message="" onRetry={() => void recentQuery.refetch()} /> : recentQuery.data?.logs?.slice(0, 8).map((log) => <div key={log.id} className="flex items-center gap-3 border-b border-[#e8eee9] py-3 last:border-0"><Check className="size-4 text-[#3f7565]" /><span className="min-w-0 flex-1 text-sm"><strong>{log.student.firstName} {log.student.lastName}</strong><span className="ml-2 text-[#748078]">{log.type} · {log.status}{log.context ? ` · ${log.context.subject} · ${log.context.roomId}` : ''}</span></span><time className="text-xs text-[#748078]">{new Intl.DateTimeFormat('en', { timeStyle: 'short' }).format(new Date(log.timestamp))}</time></div>)}</section>
    </>
  )
}

export default TestPage
