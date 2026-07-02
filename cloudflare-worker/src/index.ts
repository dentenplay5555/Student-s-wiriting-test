import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { jwt, sign } from 'hono/jwt'

// Environment bindings interface
export interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  JWT_SECRET: string;
}

const app = new Hono<{ Bindings: Env }>()

// Global Middleware
app.use('*', cors())
app.use('*', logger())

// Simple In-Memory Rate Limiter (per Cloudflare Worker isolate)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

const rateLimiter = (limit: number, windowMs: number) => {
  return async (c: any, next: any) => {
    const clientIP = c.req.header('CF-Connecting-IP') || 'anonymous'
    const now = Date.now()

    let record = rateLimitMap.get(clientIP)
    if (!record || now > record.resetTime) {
      record = { count: 0, resetTime: now + windowMs }
    }

    record.count++
    rateLimitMap.set(clientIP, record)

    if (record.count > limit) {
      return c.json({ error: 'Too many requests. Please try again later.' }, 429)
    }
    await next()
  }
}

// Authentication Endpoint: Issue JWT token containing student's email
app.post('/auth', rateLimiter(10, 60 * 1000), async (c) => {
  try {
    const { email } = await c.req.json()
    if (!email || !email.includes('@')) {
      return c.json({ error: 'Invalid email address.' }, 400)
    }

    const payload = {
      email: email.trim().toLowerCase(),
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24, // 24 hours expiration
    }

    const token = await sign(payload, c.env.JWT_SECRET)
    return c.json({ token })
  } catch (err: any) {
    return c.json({ error: 'Authentication failed: ' + err.message }, 500)
  }
})

// Submission Endpoint: Validate JWT and proxy to Supabase
app.post(
  '/submit',
  rateLimiter(5, 60 * 1000),
  async (c, next) => {
    // JWT verification middleware
    return jwt({ secret: c.env.JWT_SECRET })(c, next)
  },
  async (c) => {
    try {
      const payload = c.get('jwtPayload')
      const emailFromJwt = payload.email

      const data: any = await c.req.json()

      // 1. Validate Email alignment
      if (!data.student_email || data.student_email.trim().toLowerCase() !== emailFromJwt) {
        return c.json({ error: 'Unauthorized: Student email does not match token.' }, 401)
      }

      // 2. Schema Validation
      if (!data.student_name || !data.student_class || !data.student_no) {
        return c.json({ error: 'Validation failed: Student profile info is incomplete.' }, 400)
      }
      if (!data.draft_first || !data.draft_second || !data.draft_final) {
        return c.json({ error: 'Validation failed: Draft content is incomplete.' }, 400)
      }
      if (!data.ai_feedback_record) {
        return c.json({ error: 'Validation failed: AI feedback record is missing.' }, 400)
      }

      // Validate practice scores (TR, CC, LR, GRA, ME) bounds
      const scores = ['practice_tr', 'practice_cc', 'practice_lr', 'practice_gra', 'practice_me']
      for (const key of scores) {
        const val = data[key]
        if (typeof val !== 'number' || val < 1 || val > 5) {
          return c.json({ error: `Validation failed: Score ${key} must be a number between 1 and 5.` }, 400)
        }
      }

      console.log(`Forwarding submission to Supabase for student: ${data.student_email}`)

      // 3. Post to Supabase REST endpoint
      const targetUrl = `${c.env.SUPABASE_URL.replace(/\/$/, '')}/rest/v1/submissions`
      const response = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          'apikey': c.env.SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${c.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify(data)
      })

      if (!response.ok) {
        const errText = await response.text()
        console.error('Supabase integration error:', errText)
        return c.json({ error: 'Failed to write submission to Supabase.' }, 502)
      }

      return c.json({ success: true, message: 'Submission saved successfully!' })
    } catch (err: any) {
      console.error('Submission handling failed:', err)
      return c.json({ error: 'Internal server error: ' + err.message }, 500)
    }
  }
)

export default app
