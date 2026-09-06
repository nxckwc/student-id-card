import type { Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import { Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import { getAuthTokenFromCookies } from '../utils/cookie.js'
import type { JwtPayload } from '../interfaces/auth.js'

const getAdmin = (req: Request): JwtPayload | null => {
  const token = getAuthTokenFromCookies(req)
  const secret = process.env['JWT_SECRET']
  if (!token || !secret) return null
  try {
    const payload = jwt.verify(token, secret) as JwtPayload
    return payload.role === 'ADMIN' ? payload : null
  } catch {
    return null
  }
}

const requireAdmin = (req: Request, res: Response): boolean => {
  if (!getAdmin(req)) {
    res.status(403).json({ message: 'Admin access required' })
    return false
  }
  return true
}

const normalizeCardUid = (value: string): string => value.trim().toLowerCase()
const isValidCardUid = (value: string): boolean => /^[0-9a-f]{6,32}$/.test(value)
const selectStudent = { id: true, studentId: true, firstName: true, lastName: true, uid_card: true } as const

type ReaderType = 'GATE' | 'ROOM'

const getSchoolSettings = async () => prisma.schoolSettings.upsert({
  where: { id: 1 },
  update: {},
  create: { id: 1 },
})

const getZonedParts = (date: Date, timeZone: string): { dateKey: string; weekday: number; minutes: number } => {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    weekday: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  const weekdayMap: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 }
  return {
    dateKey: `${values.year}-${values.month}-${values.day}`,
    weekday: weekdayMap[values.weekday ?? ''] ?? 1,
    minutes: Number(values.hour) * 60 + Number(values.minute),
  }
}

const dayStartUtc = (dateKey: string): Date => new Date(`${dateKey}T00:00:00.000Z`)

const parseClock = (value: string): number | null => {
  const match = /^(\d{2}):(\d{2})$/.exec(value)
  if (!match) return null
  const hour = Number(match[1])
  const minute = Number(match[2])
  return hour <= 23 && minute <= 59 ? hour * 60 + minute : null
}

const resolveReader = async (req: Request, res: Response, requestedReaderId?: string) => {
  const token = req.headers['x-reader-token']
  const readerId = requestedReaderId?.trim()
  if (typeof token === 'string' && token && readerId) {
    const reader = await prisma.reader.findUnique({ where: { id: readerId } })
    if (!reader || !reader.active || reader.deviceToken !== token) {
      res.status(401).json({ error: 'Invalid or inactive reader' })
      return null
    }
    return reader
  }

  if (!requireAdmin(req, res)) return null
  if (!readerId) {
    res.status(400).json({ error: 'Missing readerId' })
    return null
  }
  const reader = await prisma.reader.findUnique({ where: { id: readerId } })
  if (!reader || !reader.active) {
    res.status(404).json({ error: 'Reader not found or inactive' })
    return null
  }
  return reader
}

const scanGate = async (readerId: string, studentId: string, now: Date) => {
  const settings = await getSchoolSettings()
  const zoned = getZonedParts(now, settings.timezone)
  const cutoff = parseClock(settings.lateCutoff) ?? 480
  const inStatus = zoned.minutes < cutoff ? 'IN' : 'LATE'
  const date = dayStartUtc(zoned.dateKey)

  return prisma.$transaction(async (tx) => {
    const existing = await tx.gateLog.findUnique({ where: { studentId_date: { studentId, date } } })
    if (!existing) {
      const log = await tx.gateLog.create({ data: { studentId, readerId, date, state: 'IN', inStatus, inAt: now, firstInAt: now } })
      return { log, action: 'IN' as const, created: true }
    }
    if (existing.state === 'IN') {
      const log = await tx.gateLog.update({ where: { id: existing.id }, data: { state: 'OUT', outAt: now, readerId } })
      return { log, action: 'OUT' as const, created: false }
    }
    const log = await tx.gateLog.update({ where: { id: existing.id }, data: { state: 'IN', inStatus, inAt: now, readerId } })
    return { log, action: 'IN' as const, created: false }
  })
}

const scanRoom = async (readerId: string, studentId: string, now: Date) => {
  const settings = await getSchoolSettings()
  const zoned = getZonedParts(now, settings.timezone)
  const date = dayStartUtc(zoned.dateKey)
  const reader = await prisma.reader.findUnique({ where: { id: readerId }, select: { teachers: { select: { userId: true } } } })
  const userIds = reader?.teachers.map((assignment) => assignment.userId) ?? []
  if (userIds.length === 0) throw new Error('Room reader has no assigned teachers')

  const entries = await prisma.scheduleEntry.findMany({ where: { userId: { in: userIds }, weekday: zoned.weekday }, orderBy: { id: 'asc' } })
  const activeEntries = entries.filter((entry) => {
    const start = parseClock(entry.startTime)
    const end = parseClock(entry.endTime)
    return start !== null && end !== null && zoned.minutes >= start && zoned.minutes < end
  })
  if (activeEntries.length === 0) throw new Error('No active class schedule for this room reader')
  if (activeEntries.length > 1) throw new Error('Room reader schedule is ambiguous')

  const entry = activeEntries[0]
  if (!entry) throw new Error('No active class schedule for this room reader')
  const key = { studentId, roomId: entry.roomId, subject: entry.subject, period: entry.period, date }
  const existing = await prisma.roomLog.findUnique({ where: { studentId_roomId_subject_period_date: key } })
  if (existing) return { log: existing, created: false, entry }

  try {
    const log = await prisma.roomLog.create({ data: { studentId, readerId, date, weekday: entry.weekday, period: entry.period, subject: entry.subject, className: entry.className, roomId: entry.roomId, presentAt: now } })
    return { log, created: true, entry }
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const log = await prisma.roomLog.findUniqueOrThrow({ where: { studentId_roomId_subject_period_date: key } })
      return { log, created: false, entry }
    }
    throw error
  }
}

export const scanReader = async (req: Request, res: Response): Promise<void> => {
  const started = process.hrtime.bigint()
  const body = req.body as { readerId?: string; cardUid?: string; dryRun?: boolean }
  const reader = await resolveReader(req, res, body.readerId)
  if (!reader) return
  if (typeof body.cardUid !== 'string') {
    res.status(400).json({ error: 'Missing cardUid' })
    return
  }
  const cardUid = normalizeCardUid(body.cardUid)
  if (!isValidCardUid(cardUid)) {
    res.status(400).json({ error: 'Invalid card UID format' })
    return
  }

  try {
    const student = await prisma.student.findUnique({ where: { uid_card: cardUid }, select: selectStudent })
    if (!student) {
      res.status(404).json({ error: 'Card not registered', student: null })
      return
    }
    if (body.dryRun) {
      res.json({ reader: { id: reader.id, name: reader.name, type: reader.type }, student, dryRun: true })
      return
    }

    const now = new Date()
    const result = reader.type === ('ROOM' satisfies ReaderType)
      ? await scanRoom(reader.id, student.id, now)
      : await scanGate(reader.id, student.id, now)
    const elapsedMs = Number(process.hrtime.bigint() - started) / 1e6
    res.json({
      reader: { id: reader.id, name: reader.name, type: reader.type },
      student,
      action: 'action' in result ? result.action : 'PRESENT',
      created: result.created,
      gate: 'action' in result ? { state: result.log.state, inStatus: result.log.inStatus, inAt: result.log.inAt, outAt: result.log.outAt } : null,
      room: 'entry' in result ? { roomId: result.entry.roomId, subject: result.entry.subject, className: result.entry.className, period: result.entry.period, presentAt: result.log.presentAt } : null,
      dryRun: false,
      elapsedMs: Math.round(elapsedMs * 100) / 100,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal error'
    if (message.startsWith('No active') || message.startsWith('Room reader') || message.includes('ambiguous')) {
      res.status(409).json({ error: message })
      return
    }
    res.status(500).json({ error: 'Internal error' })
  }
}

export const lookupCard = async (req: Request, res: Response): Promise<void> => {
  if (!requireAdmin(req, res)) return
  const raw = typeof req.query['cardUid'] === 'string' ? req.query['cardUid'] : ''
  const normalized = normalizeCardUid(raw)
  if (!normalized) {
    res.status(400).json({ error: 'Missing cardUid' })
    return
  }
  try {
    const student = await prisma.student.findUnique({ where: { uid_card: normalized }, select: selectStudent })
    res.json({ found: Boolean(student), student: student ?? null })
  } catch {
    res.status(500).json({ error: 'Internal error' })
  }
}

export const simulateScan = scanReader
