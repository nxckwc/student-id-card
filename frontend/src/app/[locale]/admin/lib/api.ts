import axios from 'axios'

export const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3100').replace(/\/+$/, '')

export interface Account {
  id: number
  username: string
  role: string
  createdAt: string
  updatedAt: string
  _count: { scheduleEntries: number }
}

export interface ScheduleEntry {
  id?: number
  weekday: number
  period: number
  subject: string
  className: string
  roomId: string
  startTime?: string
  endTime?: string
}

export interface AccountDetail extends Account {
  scheduleEntries: ScheduleEntry[]
}

export interface AdminOverview {
  accounts: number
  students: number | null
  attendance: number | null
  scannedStudents: number | null
  scheduledAccounts: number
  studentDataAvailable: boolean
}

export interface Student {
  id: string
  studentId: string | null
  firstName: string
  lastName: string
  uid_card: string | null
  createdAt: string
  _count: { gateLogs: number; roomLogs: number }
}

export interface AttendanceLog {
  id: string
  timestamp: string
  status: string
  type: 'GATE' | 'ROOM'
  context: { subject: string; className: string; roomId: string; period: number } | null
  student: { id: string; firstName: string; lastName: string }
}

export interface Reader {
  id: string
  name: string
  type: 'GATE' | 'ROOM'
  active: boolean
  createdAt?: string
  updatedAt?: string
  deviceToken?: string
  teachers: { user: { id: number; username: string } }[]
}

export interface ReaderScanResult {
  reader: { id: string; name: string; type: 'GATE' | 'ROOM' }
  student: ReaderStudent
  action: 'IN' | 'OUT' | 'PRESENT'
  created: boolean
  gate: { state: string; inStatus: string; inAt: string; outAt: string | null } | null
  room: { roomId: string; subject: string; className: string; period: number; presentAt: string } | null
  dryRun: boolean
  elapsedMs: number
}

export interface ReaderStudent {
  id: string
  studentId: string | null
  firstName: string
  lastName: string
  uid_card: string | null
}

export interface ReaderLookupResult {
  found: boolean
  student: ReaderStudent | null
}

export interface RegisterCardResult {
  success: boolean
  student: ReaderStudent
}

export interface SchoolSettings {
  id: number
  lateCutoff: string
  timezone: string
}

export interface SessionUser {
  id: number
  username: string
  role: string
}

export const fetchOverview = async (): Promise<AdminOverview> => {
  const { data } = await axios.get<{ overview: AdminOverview }>(`${API_BASE_URL}/admin/overview`, { withCredentials: true })
  return data.overview
}

export const fetchAccounts = async (search: string): Promise<Account[]> => {
  const { data } = await axios.get<{ accounts: Account[] }>(`${API_BASE_URL}/admin/accounts`, {
    withCredentials: true,
    params: search ? { search } : undefined,
  })
  return data.accounts
}

export const fetchAccount = async (id: number): Promise<AccountDetail> => {
  const { data } = await axios.get<{ account: AccountDetail }>(`${API_BASE_URL}/admin/accounts/${id}`, { withCredentials: true })
  return data.account
}

export const saveAccountSchedule = async (id: number, entries: ScheduleEntry[]): Promise<ScheduleEntry[]> => {
  const { data } = await axios.put<{ success: boolean; schedule: ScheduleEntry[] }>(
    `${API_BASE_URL}/admin/accounts/${id}/schedule`,
    { entries },
    { withCredentials: true },
  )
  return data.schedule
}

export const changeAccountRole = async (id: number, role: 'USER' | 'TEACHER' | 'ADMIN'): Promise<Account> => {
  const { data } = await axios.patch<{ account: Account }>(`${API_BASE_URL}/admin/accounts/${id}/role`, { role }, { withCredentials: true })
  return data.account
}

export const deleteAccountApi = async (id: number): Promise<void> => {
  await axios.delete(`${API_BASE_URL}/admin/accounts/${id}`, { withCredentials: true })
}

export const fetchStudents = async (search: string): Promise<{ students: Student[] | null; studentDataAvailable: boolean }> => {
  const { data } = await axios.get<{ students: Student[] | null; studentDataAvailable: boolean }>(`${API_BASE_URL}/admin/students`, {
    withCredentials: true,
    params: search ? { search } : undefined,
  })
  return data
}

export const createStudent = async (firstName: string, lastName: string, studentId: string): Promise<Student> => {
  const { data } = await axios.post<Student>(`${API_BASE_URL}/student`, { firstName, lastName, studentId }, { withCredentials: true })
  return data
}

export const fetchAttendance = async (
  offset: number,
  limit: number,
  search: string,
): Promise<{ logs: AttendanceLog[] | null; total: number | null; studentDataAvailable: boolean }> => {
  const { data } = await axios.get<{ logs: AttendanceLog[] | null; total: number | null; studentDataAvailable: boolean }>(
    `${API_BASE_URL}/admin/attendance`,
    { withCredentials: true, params: { offset, limit, ...(search ? { search } : {}) } },
  )
  return data
}

export const simulateReaderScan = async (
  cardUid: string,
  options: { readerId: string; dryRun?: boolean },
): Promise<ReaderScanResult> => {
  const { data } = await axios.post<ReaderScanResult>(
    `${API_BASE_URL}/admin/reader/scan`,
    { cardUid, ...options },
    { withCredentials: true },
  )
  return data
}

export const fetchReaders = async (): Promise<Reader[]> => {
  const { data } = await axios.get<{ readers: Reader[] }>(`${API_BASE_URL}/admin/readers`, { withCredentials: true })
  return data.readers
}

export const createReader = async (name: string, type: 'GATE' | 'ROOM'): Promise<Reader> => {
  const { data } = await axios.post<{ reader: Reader }>(`${API_BASE_URL}/admin/readers`, { name, type }, { withCredentials: true })
  return data.reader
}

export const updateReader = async (id: string, payload: { name?: string; active?: boolean; teacherIds?: number[] }): Promise<void> => {
  await axios.patch(`${API_BASE_URL}/admin/readers/${id}`, payload, { withCredentials: true })
}

export const fetchSchoolSettings = async (): Promise<SchoolSettings> => {
  const { data } = await axios.get<{ settings: SchoolSettings }>(`${API_BASE_URL}/admin/settings`, { withCredentials: true })
  return data.settings
}

export const saveSchoolSettings = async (lateCutoff: string, timezone: string): Promise<SchoolSettings> => {
  const { data } = await axios.put<{ settings: SchoolSettings }>(`${API_BASE_URL}/admin/settings`, { lateCutoff, timezone }, { withCredentials: true })
  return data.settings
}

export const lookupReaderCard = async (cardUid: string): Promise<ReaderLookupResult> => {
  const { data } = await axios.get<ReaderLookupResult>(`${API_BASE_URL}/admin/reader/lookup`, {
    withCredentials: true,
    params: { cardUid },
  })
  return data
}

export const registerReaderCard = async (studentId: string, cardUid: string, deviceToken: string): Promise<RegisterCardResult> => {
  const { data } = await axios.post<RegisterCardResult>(
    `${API_BASE_URL}/card/register`,
    { studentId, cardUid },
    { withCredentials: true, headers: { 'X-Device-Token': deviceToken } },
  )
  return data
}

export const fetchSession = async (): Promise<SessionUser> => {
  const { data } = await axios.get<{ authenticated: boolean; user: SessionUser }>(`${API_BASE_URL}/auth/session`, { withCredentials: true })
  return data.user
}

export const getApiErrorMessage = (error: unknown): string | undefined => {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message ?? error.response?.data?.error
    return typeof message === 'string' && message.length > 0 ? message : undefined
  }
  return undefined
}
