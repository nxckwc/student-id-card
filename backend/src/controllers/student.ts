import type { Request, Response } from 'express'
import crypto from 'node:crypto'
import { Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import type { CreateStudentRequestBody, RegisterCardRequestBody } from '../interfaces/student.js'

const isNumericId = (value: string): boolean => /^\d+$/.test(value)

/**
 * @swagger
 * /student:
 *   post:
 *     summary: Create new student
 *     tags: [Students]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - firstName
 *               - lastName
 *               - studentId
 *             properties:
 *               firstName:
 *                 type: string
 *                 example: Juan
 *               lastName:
 *                 type: string
 *                 example: García
 *               studentId:
 *                 type: string
 *                 description: Official school student ID (numeric)
 *                 example: "123456"
 *     responses:
 *       201:
 *         description: Student created successfully (no card yet)
 *       400:
 *         description: Missing or invalid data about student
 *       409:
 *         description: Student ID already in use
 *       500:
 *         description: Internal error
 */
export const createStudent = async (req: Request, res: Response): Promise<void> => {
  try {
    const { firstName, lastName, studentId } = req.body as CreateStudentRequestBody

    if (!firstName || !lastName || !studentId) {
      res.status(400).json({ error: 'Missing data about student' })
      return
    }

    const trimmedStudentId = studentId.trim()
    if (!isNumericId(trimmedStudentId)) {
      res.status(400).json({ error: 'Student ID must be numeric' })
      return
    }

    const existing = await prisma.student.findUnique({
      where: { studentId: trimmedStudentId },
      select: { id: true }
    })
    if (existing) {
      res.status(409).json({ error: 'Student ID already in use' })
      return
    }

    const student = await prisma.student.create({
      data: {
        firstName,
        lastName,
        studentId: trimmedStudentId
      }
    })
    res.status(201).json(student)
  } catch {
    res.status(500).json({ error: 'Internal error' })
  }
}

/**
 * @swagger
 * /card/register:
 *   post:
 *     summary: Register (or re-assign) an NFC card to a student
 *     description: >
 *       Called by the dedicated card registration reader. The student types
 *       their official student ID into the reader, then taps their card.
 *       If the student already has a card, the new card replaces it.
 *       If the card is already bound to a different student, the request is rejected.
 *     tags: [Students]
 *     security:
 *       - deviceToken: []
 *     parameters:
 *       - in: header
 *         name: X-Device-Token
 *         required: true
 *         schema:
 *           type: string
 *         description: Shared reader device secret
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - studentId
 *               - cardUid
 *             properties:
 *               studentId:
 *                 type: string
 *                 description: Official school student ID (numeric)
 *                 example: "123456"
 *               cardUid:
 *                 type: string
 *                 description: NFC card UID read by the reader
 *                 example: "04a1b2c3d4"
 *     responses:
 *       200:
 *         description: Card registered (or re-assigned) successfully
 *       400:
 *         description: Missing or invalid data
 *       401:
 *         description: Invalid or missing device token
 *       404:
 *         description: Student not found
 *       409:
 *         description: Card already registered to another student
 *       500:
 *         description: Internal error
 */
export const registerCard = async (req: Request, res: Response): Promise<void> => {
  const secret = process.env['READER_DEVICE_SECRET']
  const token = req.headers['x-device-token']

  if (!secret || typeof token !== 'string' || !isSafeEqual(token, secret)) {
    res.status(401).json({ error: 'Invalid device token' })
    return
  }

  try {
    const { studentId, cardUid } = req.body as RegisterCardRequestBody

    if (!studentId || !cardUid) {
      res.status(400).json({ error: 'Missing studentId or cardUid' })
      return
    }

    const trimmedStudentId = studentId.trim()
    const normalizedCardUid = cardUid.trim().toLowerCase()
    if (!isNumericId(trimmedStudentId) || normalizedCardUid.length === 0) {
      res.status(400).json({ error: 'Invalid studentId or cardUid' })
      return
    }

    const student = await prisma.student.findUnique({
      where: { studentId: trimmedStudentId }
    })
    if (!student) {
      res.status(404).json({ error: 'Student not found' })
      return
    }

    const cardOwner = await prisma.student.findUnique({
      where: { uid_card: normalizedCardUid },
      select: { id: true }
    })
    if (cardOwner && cardOwner.id !== student.id) {
      res.status(409).json({ error: 'Card already registered to another student' })
      return
    }

    const updated = await prisma.student.update({
      where: { id: student.id },
      data: { uid_card: normalizedCardUid },
      select: { id: true, studentId: true, firstName: true, lastName: true, uid_card: true }
    })
    res.json({ success: true, student: updated })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      res.status(409).json({ error: 'Card already registered to another student' })
      return
    }
    res.status(500).json({ error: 'Internal error' })
  }
}

const isSafeEqual = (a: string, b: string): boolean => {
  const bufA = crypto.createHash('sha256').update(a).digest()
  const bufB = crypto.createHash('sha256').update(b).digest()
  return crypto.timingSafeEqual(bufA, bufB)
}

/**
 * @swagger
 * /student/{studentId}:
 *   get:
 *     summary: Get student by ID
 *     tags: [Students]
 *     parameters:
 *       - in: path
 *         name: studentId
 *         required: true
 *         schema:
 *           type: string
 *         description: Student UUID
 *     responses:
 *       200:
 *         description: Student found
 *       404:
 *         description: Student not found
 *       500:
 *         description: Internal error
 */
export const getStudent = async (req: Request, res: Response): Promise<void> => {
  try {
    const { studentId } = req.params as Record<string, string>

    const student = await prisma.student.findUnique({
      where: { id: studentId }
    })
    if (!student) {
      res.status(404).json({ error: 'Student not found' })
      return
    }
    res.json(student)
  } catch {
    res.status(500).json({ error: 'Internal error' })
  }
}

/**
 * @swagger
 * /student/card/{studentCardId}:
 *   get:
 *     summary: Get student by NFC card ID
 *     tags: [Students]
 *     parameters:
 *       - in: path
 *         name: studentCardId
 *         required: true
 *         schema:
 *           type: string
 *         description: NFC card UUID
 *     responses:
 *       200:
 *         description: Student found
 *       404:
 *         description: Student not found
 *       500:
 *         description: Internal error
 */
export const getStudentByCard = async (req: Request, res: Response): Promise<void> => {
  try {
    const { studentCardId } = req.params as Record<string, string>

    const student = await prisma.student.findUnique({
      where: { uid_card: studentCardId }
    })
    if (!student) {
      res.status(404).json({ error: 'Student not found' })
      return
    }
    res.json(student)
  } catch {
    res.status(500).json({ error: 'Internal error' })
  }
}
