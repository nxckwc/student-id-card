import type { Request, Response } from 'express'
import crypto from 'node:crypto'
import jwt from 'jsonwebtoken'
import { Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import { getAuthTokenFromCookies } from '../utils/cookie.js'
import type { JwtPayload } from '../interfaces/auth.js'

interface ScheduleInput {
  weekday?: number
  period?: number
  subject?: string
  className?: string
  roomId?: string
}

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

const requireAdmin = (req: Request, res: Response): JwtPayload | null => {
  const admin = getAdmin(req)
  if (!admin) res.status(403).json({ message: 'Admin access required' })
  return admin
}

const getPeriodTime = (period: number): { startTime: string; endTime: string } => {
  const startMinutes = 8 * 60 + 30 + (period - 1) * 55
  const endMinutes = startMinutes + 55
  const format = (minutes: number) => `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
  return { startTime: format(startMinutes), endTime: format(endMinutes) }
}

/**
 * @swagger
 * /admin/overview:
 *   get:
 *     summary: Admin overview stats
 *     tags: [Admin]
 *     responses:
 *       200:
 *         description: Overview counts
 *       403:
 *         description: Admin access required
 */
export const getAdminOverview = async (req: Request, res: Response): Promise<void> => {
  if (!requireAdmin(req, res)) return

  const [accounts, scheduledAccounts] = await prisma.$transaction([
    prisma.user.count(),
    prisma.user.count({ where: { scheduleEntries: { some: {} } } }),
  ])

  try {
    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)
    const [students, gateAttendance, roomAttendance, gateStudents] = await prisma.$transaction([
      prisma.student.count(),
      prisma.gateLog.count(),
      prisma.roomLog.count(),
      prisma.gateLog.findMany({
        where: { date: { gte: startOfDay } },
        distinct: ['studentId'],
        select: { studentId: true },
      }),
    ])
    const attendance = gateAttendance + roomAttendance
    res.json({ overview: { accounts, students, attendance, scannedStudents: gateStudents.length, scheduledAccounts, studentDataAvailable: true } })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2021') {
      res.json({ overview: { accounts, students: null, attendance: null, scheduledAccounts, studentDataAvailable: false } })
      return
    }
    throw error
  }
}

/**
 * @swagger
 * /admin/accounts:
 *   get:
 *     summary: List user accounts
 *     tags: [Admin]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Case-insensitive username filter
 *     responses:
 *       200:
 *         description: Accounts found
 *       403:
 *         description: Admin access required
 */
export const getAccounts = async (req: Request, res: Response): Promise<void> => {
  if (!requireAdmin(req, res)) return

  const search = typeof req.query['search'] === 'string' ? req.query['search'].trim() : ''

  const accounts = await prisma.user.findMany({
    where: search ? { username: { contains: search, mode: 'insensitive' } } : undefined,
    orderBy: { username: 'asc' },
    select: {
      id: true,
      username: true,
      role: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { scheduleEntries: true } },
    },
  })

  res.json({ accounts })
}

/**
 * @swagger
 * /admin/accounts/{accountId}:
 *   get:
 *     summary: Get account with schedule
 *     tags: [Admin]
 *     parameters:
 *       - in: path
 *         name: accountId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Account found
 *       400:
 *         description: Invalid account id
 *       403:
 *         description: Admin access required
 *       404:
 *         description: Account not found
 */
export const getAccount = async (req: Request, res: Response): Promise<void> => {
  if (!requireAdmin(req, res)) return

  const accountId = Number(req.params['accountId'])
  if (!Number.isInteger(accountId)) {
    res.status(400).json({ message: 'Invalid account id' })
    return
  }

  const account = await prisma.user.findUnique({
    where: { id: accountId },
    select: {
      id: true,
      username: true,
      role: true,
      createdAt: true,
      updatedAt: true,
      scheduleEntries: {
        orderBy: [{ weekday: 'asc' }, { period: 'asc' }],
        select: {
          id: true,
          weekday: true,
          period: true,
          subject: true,
          className: true,
          roomId: true,
          startTime: true,
          endTime: true,
        },
      },
    },
  })

  if (!account) {
    res.status(404).json({ message: 'Account not found' })
    return
  }

  res.json({ account })
}

/**
 * @swagger
 * /admin/accounts/{accountId}/schedule:
 *   put:
 *     summary: Replace account schedule (full replacement)
 *     tags: [Admin]
 *     parameters:
 *       - in: path
 *         name: accountId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - entries
 *             properties:
 *               entries:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - weekday
 *                     - period
 *                     - subject
 *                     - className
 *                     - roomId
 *                   properties:
 *                     weekday:
 *                       type: integer
 *                       minimum: 1
 *                       maximum: 7
 *                     period:
 *                       type: integer
 *                       minimum: 1
 *                       maximum: 8
 *                     subject:
 *                       type: string
 *                     className:
 *                       type: string
 *                     roomId:
 *                       type: string
 *     responses:
 *       200:
 *         description: Schedule replaced
 *       400:
 *         description: Invalid account id or schedule
 *       403:
 *         description: Admin access required
 *       404:
 *         description: Account not found
 */
export const replaceAccountSchedule = async (req: Request, res: Response): Promise<void> => {
  if (!requireAdmin(req, res)) return

  const accountId = Number(req.params['accountId'])
  const entries = req.body?.entries as ScheduleInput[] | undefined
  if (!Number.isInteger(accountId) || !Array.isArray(entries)) {
    res.status(400).json({ message: 'Invalid account id or schedule' })
    return
  }

  const account = await prisma.user.findUnique({ where: { id: accountId }, select: { id: true } })
  if (!account) {
    res.status(404).json({ message: 'Account not found' })
    return
  }

  const seen = new Set<string>()
  const scheduleData = []
  for (const entry of entries) {
    const weekday = Number(entry.weekday)
    const period = Number(entry.period)
    const subject = entry.subject?.trim()
    const className = entry.className?.trim()
    const roomId = entry.roomId?.trim()
    const key = `${weekday}-${period}`

    if (!Number.isInteger(weekday) || weekday < 1 || weekday > 7 || !Number.isInteger(period) || period < 1 || period > 8 || !subject || !className || !roomId || seen.has(key)) {
      res.status(400).json({ message: 'Each schedule entry needs a unique weekday, period, subject, class, and room' })
      return
    }

    seen.add(key)
    scheduleData.push({ userId: accountId, weekday, period, subject, className, roomId, ...getPeriodTime(period) })
  }

  const roomAssignments = await prisma.readerTeacher.findMany({
    where: { userId: accountId, reader: { type: 'ROOM', active: true } },
    select: { readerId: true },
  })
  if (roomAssignments.length > 0) {
    const readerIds = roomAssignments.map((assignment) => assignment.readerId)
    const assignedTeachers = await prisma.readerTeacher.findMany({
      where: { readerId: { in: readerIds }, userId: { not: accountId } },
      select: { userId: true, readerId: true },
    })
    const conflicts = await prisma.scheduleEntry.findMany({
      where: {
        userId: { in: assignedTeachers.map((assignment) => assignment.userId) },
        OR: scheduleData.map((entry) => ({ weekday: entry.weekday, period: entry.period })),
      },
      select: { userId: true, weekday: true, period: true },
    })
    if (conflicts.length > 0) {
      res.status(409).json({ message: 'This schedule overlaps another teacher assigned to the same room reader' })
      return
    }
  }

  await prisma.$transaction([
    prisma.scheduleEntry.deleteMany({ where: { userId: accountId } }),
    prisma.scheduleEntry.createMany({ data: scheduleData }),
  ])

  res.json({ success: true, schedule: scheduleData })
}

const ACCOUNT_ROLES = ['USER', 'ADMIN'] as const
type AccountRole = (typeof ACCOUNT_ROLES)[number]

/**
 * @swagger
 * /admin/accounts/{accountId}/role:
 *   patch:
 *     summary: Change account role
 *     tags: [Admin]
 *     parameters:
 *       - in: path
 *         name: accountId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - role
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [USER, ADMIN]
 *     responses:
 *       200:
 *         description: Role updated
 *       400:
 *         description: Invalid role, own account, or last admin
 *       403:
 *         description: Admin access required
 *       404:
 *         description: Account not found
 */
export const updateAccountRole = async (req: Request, res: Response): Promise<void> => {
  const admin = requireAdmin(req, res)
  if (!admin) return

  const accountId = Number(req.params['accountId'])
  const role = (req.body?.role ?? '') as AccountRole
  if (!Number.isInteger(accountId) || !ACCOUNT_ROLES.includes(role)) {
    res.status(400).json({ message: 'Invalid account id or role' })
    return
  }

  if (accountId === admin.id) {
    res.status(400).json({ message: 'You cannot change your own role' })
    return
  }

  const account = await prisma.user.findUnique({ where: { id: accountId }, select: { id: true, role: true } })
  if (!account) {
    res.status(404).json({ message: 'Account not found' })
    return
  }

  if (account.role === 'ADMIN' && role === 'USER') {
    const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } })
    if (adminCount <= 1) {
      res.status(400).json({ message: 'Cannot demote the last remaining admin' })
      return
    }
  }

  const updated = await prisma.user.update({ where: { id: accountId }, data: { role }, select: { id: true, username: true, role: true } })
  res.json({ account: updated })
}

/**
 * @swagger
 * /admin/accounts/{accountId}:
 *   delete:
 *     summary: Delete account
 *     tags: [Admin]
 *     parameters:
 *       - in: path
 *         name: accountId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Account deleted
 *       400:
 *         description: Own account or last admin
 *       403:
 *         description: Admin access required
 *       404:
 *         description: Account not found
 */
export const deleteAccount = async (req: Request, res: Response): Promise<void> => {
  const admin = requireAdmin(req, res)
  if (!admin) return

  const accountId = Number(req.params['accountId'])
  if (!Number.isInteger(accountId)) {
    res.status(400).json({ message: 'Invalid account id' })
    return
  }

  if (accountId === admin.id) {
    res.status(400).json({ message: 'You cannot delete your own account' })
    return
  }

  const account = await prisma.user.findUnique({ where: { id: accountId }, select: { id: true, role: true } })
  if (!account) {
    res.status(404).json({ message: 'Account not found' })
    return
  }

  if (account.role === 'ADMIN') {
    const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } })
    if (adminCount <= 1) {
      res.status(400).json({ message: 'Cannot delete the last remaining admin' })
      return
    }
  }

  await prisma.user.delete({ where: { id: accountId } })
  res.json({ success: true })
}

/**
 * @swagger
 * /admin/students:
 *   get:
 *     summary: List students
 *     tags: [Admin]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Case-insensitive filter on name or card UID
 *     responses:
 *       200:
 *         description: Students found (or unavailable)
 *       403:
 *         description: Admin access required
 */
export const getStudents = async (req: Request, res: Response): Promise<void> => {
  if (!requireAdmin(req, res)) return

  const search = typeof req.query['search'] === 'string' ? req.query['search'].trim() : ''

  try {
    const students = await prisma.student.findMany({
      where: search
        ? {
            OR: [
              { firstName: { contains: search, mode: 'insensitive' } },
              { lastName: { contains: search, mode: 'insensitive' } },
              { studentId: { contains: search, mode: 'insensitive' } },
              { uid_card: { contains: search, mode: 'insensitive' } },
            ],
          }
        : undefined,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        studentId: true,
        firstName: true,
        lastName: true,
        uid_card: true,
        createdAt: true,
        _count: { select: { gateLogs: true, roomLogs: true } },
      },
    })

    res.json({ students, studentDataAvailable: true })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2021') {
      res.json({ students: null, studentDataAvailable: false })
      return
    }
    throw error
  }
}

/**
 * @swagger
 * /admin/attendance:
 *   get:
 *     summary: List attendance logs
 *     tags: [Admin]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           minimum: 0
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Case-insensitive student name filter
 *     responses:
 *       200:
 *         description: Attendance logs (or unavailable)
 *       403:
 *         description: Admin access required
 */
export const getAttendance = async (req: Request, res: Response): Promise<void> => {
  if (!requireAdmin(req, res)) return

  const rawLimit = Number(req.query['limit'])
  const rawOffset = Number(req.query['offset'])
  const limit = Number.isInteger(rawLimit) ? Math.min(Math.max(rawLimit, 1), 100) : 20
  const offset = Number.isInteger(rawOffset) && rawOffset >= 0 ? rawOffset : 0
  const search = typeof req.query['search'] === 'string' ? req.query['search'].trim() : ''

  try {
    const studentWhere = search
      ? { OR: [{ firstName: { contains: search, mode: 'insensitive' as const } }, { lastName: { contains: search, mode: 'insensitive' as const } }] }
      : undefined
    const [gateLogs, roomLogs] = await prisma.$transaction([
      prisma.gateLog.findMany({
        where: { student: studentWhere },
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          updatedAt: true,
          state: true,
          inStatus: true,
          student: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
      prisma.roomLog.findMany({
        where: { student: studentWhere },
        orderBy: { presentAt: 'desc' },
        select: {
          id: true,
          presentAt: true,
          subject: true,
          className: true,
          roomId: true,
          period: true,
          student: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
    ])
    const logs = [
      ...gateLogs.map((log) => ({ id: `gate-${log.id}`, timestamp: log.updatedAt, status: log.state === 'IN' ? log.inStatus : 'OUT', type: 'GATE', context: null, student: log.student })),
      ...roomLogs.map((log) => ({ id: `room-${log.id}`, timestamp: log.presentAt, status: 'PRESENT', type: 'ROOM', context: { subject: log.subject, className: log.className, roomId: log.roomId, period: log.period }, student: log.student })),
    ].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    const total = logs.length

    res.json({ logs: logs.slice(offset, offset + limit), total, studentDataAvailable: true })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2021') {
      res.json({ logs: null, total: null, studentDataAvailable: false })
      return
    }
    throw error
  }
}

const READER_TYPES = ['GATE', 'ROOM'] as const
type ReaderType = (typeof READER_TYPES)[number]

const isClock = (value: unknown): value is string => typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value)

export const getReaders = async (req: Request, res: Response): Promise<void> => {
  if (!requireAdmin(req, res)) return
  const readers = await prisma.reader.findMany({
    orderBy: [{ active: 'desc' }, { name: 'asc' }],
    select: {
      id: true, name: true, type: true, active: true, createdAt: true, updatedAt: true,
      teachers: { select: { user: { select: { id: true, username: true } } } },
    },
  })
  res.json({ readers })
}

export const createReader = async (req: Request, res: Response): Promise<void> => {
  if (!requireAdmin(req, res)) return
  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : ''
  const type = req.body?.type as ReaderType
  if (!name || !READER_TYPES.includes(type)) {
    res.status(400).json({ message: 'Reader name and type GATE or ROOM are required' })
    return
  }
  const deviceToken = crypto.randomBytes(24).toString('hex')
  const reader = await prisma.reader.create({
    data: { name, type, deviceToken },
    select: { id: true, name: true, type: true, active: true, deviceToken: true },
  })
  res.status(201).json({ reader })
}

export const updateReader = async (req: Request, res: Response): Promise<void> => {
  if (!requireAdmin(req, res)) return
  const readerId = typeof req.params['readerId'] === 'string' ? req.params['readerId'] : ''
  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : undefined
  const active = typeof req.body?.active === 'boolean' ? req.body.active : undefined
  const teacherIds: number[] | undefined = Array.isArray(req.body?.teacherIds) ? req.body.teacherIds.map((value: unknown) => Number(value)) : undefined
  if (!readerId || (name !== undefined && !name)) {
    res.status(400).json({ message: 'Invalid reader update' })
    return
  }
  try {
    const reader = await prisma.reader.findUnique({ where: { id: readerId }, select: { id: true, type: true } })
    if (!reader) {
      res.status(404).json({ message: 'Reader not found' })
      return
    }
    if (reader.type === 'GATE' && teacherIds && teacherIds.length > 0) {
      res.status(400).json({ message: 'Gate readers cannot be assigned to teachers' })
      return
    }
    if (reader.type === 'ROOM' && teacherIds && teacherIds.some((id) => !Number.isInteger(id))) {
      res.status(400).json({ message: 'Teacher IDs must be integers' })
      return
    }
    await prisma.$transaction(async (tx) => {
      await tx.reader.update({ where: { id: readerId }, data: { ...(name !== undefined ? { name } : {}), ...(active !== undefined ? { active } : {}) } })
      if (teacherIds) {
        await tx.readerTeacher.deleteMany({ where: { readerId } })
        if (teacherIds.length > 0) await tx.readerTeacher.createMany({ data: [...new Set(teacherIds)].map((userId) => ({ readerId, userId })) })
      }
    })
    res.json({ success: true })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
      res.status(400).json({ message: 'One or more teacher accounts do not exist' })
      return
    }
    res.status(500).json({ message: 'Internal error' })
  }
}

export const getSchoolSettings = async (req: Request, res: Response): Promise<void> => {
  if (!requireAdmin(req, res)) return
  const settings = await prisma.schoolSettings.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } })
  res.json({ settings })
}

export const updateSchoolSettings = async (req: Request, res: Response): Promise<void> => {
  if (!requireAdmin(req, res)) return
  const lateCutoff = req.body?.lateCutoff
  const timezone = req.body?.timezone
  if (!isClock(lateCutoff) || (timezone !== undefined && (typeof timezone !== 'string' || !timezone.trim()))) {
    res.status(400).json({ message: 'lateCutoff must use HH:MM format' })
    return
  }
  try {
    const settings = await prisma.schoolSettings.upsert({
      where: { id: 1 },
      update: { lateCutoff, ...(timezone !== undefined ? { timezone: timezone.trim() } : {}) },
      create: { id: 1, lateCutoff, ...(timezone !== undefined ? { timezone: timezone.trim() } : {}) },
    })
    res.json({ settings })
  } catch {
    res.status(400).json({ message: 'Invalid timezone' })
  }
}
