import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { jwt as jwtMiddleware, sign as signJwt } from "hono/jwt";
import { HTTPException } from "hono/http-exception";

const app = new Hono();

// ---------------------------------------------------------------------------
// Global middleware
// ---------------------------------------------------------------------------
app.use("*", cors());
app.use("*", logger());

// ---------------------------------------------------------------------------
// Response helpers — every route returns this shape, so the frontend can
// always safely call res.json() without guessing at the format.
// ---------------------------------------------------------------------------
const ok = (c, data, status = 200) => c.json({ success: true, data }, status);
const fail = (c, message, status = 400, extra = {}) =>
  c.json({ success: false, error: message, ...extra }, status);

// ---------------------------------------------------------------------------
// Global error handler
// Anything thrown anywhere (including inside middleware) lands here instead
// of becoming a bare-text "Internal Server Error" that breaks res.json().
// ---------------------------------------------------------------------------
app.onError((err, c) => {
  console.error("🔥 ERROR:", err);

  if (err instanceof HTTPException) {
    // HTTPException already carries a proper Response (see jwtGuard below).
    return err.getResponse();
  }

  return fail(c, err?.message ?? String(err), 500, {
    code: "INTERNAL_SERVER_ERROR",
  });
});

// ---------------------------------------------------------------------------
// Rate limiter
// In-memory, per-worker-instance. Good enough for basic abuse protection;
// swap the Map for Cloudflare KV/Durable Objects if you need it to be
// consistent across instances/regions.
// ---------------------------------------------------------------------------
function rateLimiter(limit, windowMs) {
  const hits = new Map();

  return async (c, next) => {
    const ip = c.req.header("CF-Connecting-IP") || "anonymous";
    const now = Date.now();

    let entry = hits.get(ip);
    if (!entry || now > entry.resetTime) {
      entry = { count: 0, resetTime: now + windowMs };
    }
    entry.count++;
    hits.set(ip, entry);

    if (entry.count > limit) {
      return fail(c, "Too many requests. Please try again later.", 429, {
        code: "RATE_LIMITED",
      });
    }

    await next();
  };
}

// ---------------------------------------------------------------------------
// JWT guard
// Wraps hono/jwt so an invalid/missing/expired token always comes back as
// clean JSON (via the global error handler) instead of an uncaught throw.
// ---------------------------------------------------------------------------
function jwtGuard(secret) {
  const verify = jwtMiddleware({ secret });

  return async (c, next) => {
    try {
      await verify(c, next);
    } catch (err) {
      throw new HTTPException(401, {
        message: "Unauthorized",
        res: c.json(
          {
            success: false,
            error: "INVALID_TOKEN",
            message: err?.message ?? "token verification failed",
          },
          401
        ),
      });
    }
  };
}

// ---------------------------------------------------------------------------
// Supabase layer — kept separate from route/validation logic so it's easy
// to unit test or swap out later.
// ---------------------------------------------------------------------------
async function insertSubmission(env, body) {
  const url = `${env.SUPABASE_URL.replace(/\/$/, "")}/rest/v1/submissions`;

  return fetch(url, {
    method: "POST",
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(body),
  });
}

async function findStudentByEmail(env, email) {
  const url = `${env.SUPABASE_URL.replace(/\/$/, "")}/rest/v1/students?email=eq.${encodeURIComponent(
    email
  )}&select=*&limit=1`;

  const res = await fetch(url, {
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    },
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error("Supabase lookup error:", errText);
    throw new Error("Failed to look up student.");
  }

  const rows = await res.json();
  return rows[0] ?? null;
}

// ---------------------------------------------------------------------------
// Password hashing (PBKDF2-SHA256 via Web Crypto — works natively in
// Cloudflare Workers, no external deps needed like bcrypt would require).
//
// Stored format: "<saltHex>:<hashHex>"
//
// To create a new student account, hash a password with hashPassword()
// once (e.g. in a small local script or a one-off admin route) and store
// the resulting string in the students.password_hash column.
//
// ⚠️ Cloudflare Workers CPU-time note:
// Workers enforce a per-request CPU time budget — ~10ms on the Free plan,
// ~30-50ms on Bundled paid, effectively unlimited on Unbound. PBKDF2 with
// the "standard" 100,000 iterations can burn 100ms+ of *actual CPU*, which
// gets your worker killed mid-request (error 1102) on Free/Bundled plans.
// 20,000 iterations is a safer default that still runs in a few ms while
// keeping meaningful brute-force resistance. If you're on the Unbound plan
// and want to be more conservative, you can raise this back up.
// ---------------------------------------------------------------------------
const PBKDF2_ITERATIONS = 20_000;

function bufferToHex(buffer) {
  return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function hexToBuffer(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
}

// Format: "<iterations>:<saltHex>:<hashHex>" — embedding the iteration
// count means you can safely change PBKDF2_ITERATIONS later without
// invalidating passwords that were hashed under the old value.
async function hashPassword(password, saltHex, iterations = PBKDF2_ITERATIONS) {
  const salt = saltHex ? hexToBuffer(saltHex) : crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const derivedBits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
    keyMaterial,
    256
  );
  return `${iterations}:${bufferToHex(salt)}:${bufferToHex(derivedBits)}`;
}

async function verifyPassword(password, storedHash) {
  const [iterationsStr, saltHex, hashHex] = (storedHash || "").split(":");
  const iterations = Number(iterationsStr);
  if (!iterations || !saltHex || !hashHex) return false;
  const candidate = await hashPassword(password, saltHex, iterations);
  const candidateHashHex = candidate.split(":")[2];
  // Constant-time-ish comparison
  return candidateHashHex === hashHex;
}

// ---------------------------------------------------------------------------
// Validation layer
// ---------------------------------------------------------------------------
const REQUIRED_FIELDS = [
  "student_email",
  "student_name",
  "student_class",
  "student_no",
  "draft_first",
  "draft_second",
  "draft_final",
  "ai_feedback_record",
];

const SCORE_FIELDS = [
  "practice_tr",
  "practice_cc",
  "practice_lr",
  "practice_gra",
  "practice_me",
];

function validateSubmission(body, expectedEmail) {
  for (const field of REQUIRED_FIELDS) {
    if (!body[field]) {
      return `Missing field: ${field}`;
    }
  }

  if (body.student_email.trim().toLowerCase() !== expectedEmail) {
    return "Email mismatch: token email does not match student_email.";
  }

  for (const field of SCORE_FIELDS) {
    const val = body[field];
    if (typeof val !== "number" || val < 1 || val > 5) {
      return `Invalid score: ${field} must be a number between 1 and 5.`;
    }
  }

  return null; // no error
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------
app.get("/test", (c) => ok(c, { alive: true }));

app.post("/auth", rateLimiter(10, 60_000), async (c) => {
  const body = await c.req.json().catch(() => null);

  if (!body?.email || !body?.password) {
    return fail(c, "Missing email or password.", 400, {
      code: "VALIDATION_FAILED",
    });
  }

  const email = String(body.email).trim().toLowerCase();
  const password = String(body.password);

  const student = await findStudentByEmail(c.env, email);

  // Same generic error whether the email doesn't exist or the password is
  // wrong — don't leak which one it was.
  if (!student || !(await verifyPassword(password, student.password_hash))) {
    return fail(c, "Invalid email or password.", 401, {
      code: "INVALID_CREDENTIALS",
    });
  }

  const token = await signJwt(
    {
      email,
      name: student.name ?? undefined,
      class: student.class ?? undefined,
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24, // 24h
    },
    c.env.JWT_SECRET
  );

  return ok(c, { token });
});

app.post(
  "/submit",
  rateLimiter(5, 60_000),
  (c, next) => jwtGuard(c.env.JWT_SECRET)(c, next),
  async (c) => {
    const payload = c.get("jwtPayload");
    const tokenEmail = payload.email;

    const body = await c.req.json();

    const validationError = validateSubmission(body, tokenEmail);
    if (validationError) {
      return fail(c, validationError, 400, { code: "VALIDATION_FAILED" });
    }

    console.log(`Forwarding submission to Supabase for student: ${body.student_email}`);

    const res = await insertSubmission(c.env, body);

    if (!res.ok) {
      const errText = await res.text();
      console.error("Supabase integration error:", errText);
      return fail(c, "Failed to write submission to Supabase.", 502, {
        code: "SUPABASE_ERROR",
      });
    }

    return ok(c, { message: "Submission saved successfully!" });
  }
);

export default app;