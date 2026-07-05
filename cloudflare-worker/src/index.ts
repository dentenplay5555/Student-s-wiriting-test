import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { jwt, sign } from "hono/jwt";

export interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  JWT_SECRET: string;
}

const app = new Hono<{ Bindings: Env }>();

// --------------------
// Global Middleware
// --------------------
app.use(
  "*",
  cors({
    origin: [
      "https://dentenplay5555.github.io"
    ]
  })
);
app.use("*", logger());

// --------------------
// Health Check
// --------------------
app.get("/test", (c) => {
  return c.json({
    ok: true,
    message: "Worker is running!"
  });
});

// --------------------
// Simple In-Memory Rate Limiter
// --------------------
const rateLimitMap = new Map<
  string,
  {
    count: number;
    resetTime: number;
  }
>();

function rateLimiter(limit: number, windowMs: number) {
  return async (c: any, next: any) => {
    const ip =
      c.req.header("CF-Connecting-IP") ??
      c.req.header("x-forwarded-for") ??
      "anonymous";

    const now = Date.now();

    let record = rateLimitMap.get(ip);

    if (!record || now > record.resetTime) {
      record = {
        count: 0,
        resetTime: now + windowMs,
      };
    }

    record.count++;

    rateLimitMap.set(ip, record);

    if (record.count > limit) {
      return c.json(
        {
          error: "Too many requests"
        },
        429
      );
    }

    return await next();
  };
}

// --------------------
// AUTH
// --------------------
app.post(
  "/auth",
  rateLimiter(10, 60 * 1000),
  async (c) => {
    try {
      console.log("1");
      const body = await c.req.json();
      console.log("2");
      const email = String(body.email ?? "")
        .trim()
        .toLowerCase();

      if (!email) {
        return c.json(
          {
            error: "Email required"
          },
          400
        );
      }

      if (!email.includes("@")) {
        return c.json(
          {
            error: "Invalid email"
          },
          400
        );
      }

      const token = await sign(
        {
          email,
          exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24,
        },
        c.env.JWT_SECRET
      );
      console.log("3");
      return c.json({
        success: true,
        token,
      });
    } catch (err: any) {
      console.error("AUTH ERROR", err);

      return c.json(
        {
          error: err?.message ?? "Authentication failed",
        },
        500
      );
    }
  }
);

// --------------------
// SUBMIT
// --------------------
app.post(
  "/submit",
  rateLimiter(5, 60 * 1000),

  async (c, next) => {
    console.log("4");
    return jwt({
      secret: c.env.JWT_SECRET,
      alg: "HS256",
    })(c, next);
  },

  async (c) => {
    try {
      const jwtPayload: any = c.get("jwtPayload");

      const body = await c.req.json();

      const email = String(body.student_email ?? "")
        .trim()
        .toLowerCase();

      if (email !== jwtPayload.email) {
        return c.json(
          {
            error: "Email mismatch"
          },
          401
        );
      }

      const response = await fetch(
        `${c.env.SUPABASE_URL}/rest/v1/submissions`,
        {
          method: "POST",
          headers: {
            apikey: c.env.SUPABASE_SERVICE_ROLE_KEY,
            Authorization:
              `Bearer ${c.env.SUPABASE_SERVICE_ROLE_KEY}`,
            "Content-Type": "application/json",
            Prefer: "return=representation",
          },
          body: JSON.stringify(body),
        }
      );

      if (!response.ok) {
        const text = await response.text();

        console.error(text);

        return c.json(
          {
            error: text,
          },
          500
        );
      }

      const result = await response.text();

      return c.json({
        success: true,
        data: result,
      });
    } catch (err: any) {
      console.error("SUBMIT ERROR", err);

      return c.json(
        {
          error: err?.message ?? "Unknown Error",
        },
        500
      );
    }
  }
);
app.get("/debug", (c) => {
  return c.json({
    hasJwt: !!c.env.JWT_SECRET,
    hasServiceRole: !!c.env.SUPABASE_SERVICE_ROLE_KEY,
    hasSupabaseUrl: !!c.env.SUPABASE_URL,
  });
});
export default app;