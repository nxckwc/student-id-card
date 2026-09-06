import type { Request, Response } from 'express'
import { prisma } from '../lib/prisma.js'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { clearAuthCookie, getAuthTokenFromCookies, setAuthCookie } from '../utils/cookie.js'

import type { AuthRequestBody, JwtPayload } from '../interfaces/auth.js'

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 example: hadi
 *               password:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                   example: 1
 *                 username:
 *                   type: string
 *                   example: hadi
 *       400:
 *         description: Username already taken
 */
export const register = async (req: Request, res: Response): Promise<void> => {
  const { username, password } = req.body as AuthRequestBody

  if (!username || !password) {
    res.status(400).json({ message: 'Username and password are required' })
    return
  }

  if (password.length < 6) {
    res.status(400).json({ message: 'Password must be at least 6 characters' })
    return
  }

  const exists = await prisma.user.findUnique({ where: { username } })
  if (exists) {
    res.status(400).json({ message: 'Username already taken' })
    return
  }

  const hashed = await bcrypt.hash(password, 10)

  const user = await prisma.user.create({
    data: { username, password: hashed }
  })

  res.json({ id: user.id, username: user.username })
}


/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login with existing user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 example: hadi
 *               password:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                   example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *       401:
 *         description: Invalid credentials
 */
export const login = async (req: Request, res: Response): Promise<void> => {
  const { username, password, rememberMe = true } = req.body as AuthRequestBody

  if (!username || !password) {
    res.status(400).json({ message: 'Username and password are required' })
    return
  }

  const user = await prisma.user.findUnique({ where: { username } })
  if (!user) {
    res.status(401).json({ message: 'Invalid credentials' })
    return
  }

  const valid = await bcrypt.compare(password, user.password)
  if (!valid) {
    res.status(401).json({ message: 'Invalid credentials' })
    return
  }

  const secret = process.env['JWT_SECRET']
  if (!secret) throw new Error('JWT_SECRET is not defined')

  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role, rememberMe: Boolean(rememberMe) },
    secret,
    { expiresIn: '1h' }
  )

  setAuthCookie(res, token, rememberMe)
  res.json({ id: user.id, username: user.username, role: user.role })
}

export const session = async (req: Request, res: Response): Promise<void> => {
  const token = getAuthTokenFromCookies(req)
  if (!token) {
    res.status(401).json({ message: 'Unauthorized' })
    return
  }

  const secret = process.env['JWT_SECRET']
  if (!secret) throw new Error('JWT_SECRET is not defined')

  try {
    const payload = jwt.verify(token, secret) as JwtPayload
    const user = await prisma.user.findUnique({
      where: { id: payload.id },
      select: { id: true, username: true, role: true },
    })

    if (!user) {
      clearAuthCookie(res)
      res.status(401).json({ message: 'Unauthorized' })
      return
    }

    if (user.username !== payload.username || user.role !== payload.role) {
      const refreshedToken = jwt.sign(
        { id: user.id, username: user.username, role: user.role, rememberMe: payload.rememberMe !== false },
        secret,
        { expiresIn: '1h' },
      )
      setAuthCookie(res, refreshedToken, payload.rememberMe !== false)
    }

    res.json({
      authenticated: true,
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      }
    })
  } catch {
    clearAuthCookie(res)
    res.status(401).json({ message: 'Unauthorized' })
  }
}

export const logout = async (_req: Request, res: Response): Promise<void> => {
  clearAuthCookie(res)
  res.json({ success: true })
}
