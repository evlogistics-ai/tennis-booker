import { Hono } from "hono";
import { handle } from "hono/vercel";
import { cors } from "hono/cors";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { eq, and } from "drizzle-orm";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { courts, users, bookings } from "../src/db/schema.js";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

type Env = {
  Variables: {
    userId: string;
  };
};

const app = new Hono<Env>().basePath("/api");
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";

app.use("/*", cors({ origin: "*" }));

// --- Auth middleware ---

function authMiddleware() {
  return async (c: any, next: any) => {
    const header = c.req.header("Authorization");
    if (!header?.startsWith("Bearer ")) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    try {
      const token = header.slice(7);
      const payload = jwt.verify(token, JWT_SECRET) as { userId: string };
      c.set("userId", payload.userId);
      await next();
    } catch {
      return c.json({ error: "Invalid token" }, 401);
    }
  };
}

// --- Auth routes ---

app.post("/auth/signup", async (c) => {
  const { email, password } = await c.req.json();
  if (!email || !password) {
    return c.json({ error: "Email and password required" }, 400);
  }
  if (password.length < 6) {
    return c.json({ error: "Password must be at least 6 characters" }, 400);
  }

  const existing = await db.select().from(users).where(eq(users.email, email));
  if (existing.length > 0) {
    return c.json({ error: "Email already registered" }, 409);
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const [user] = await db
    .insert(users)
    .values({ email, passwordHash })
    .returning({ id: users.id, email: users.email });

  const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "7d" });
  return c.json({ token, user: { id: user.id, email: user.email } });
});

app.post("/auth/login", async (c) => {
  const { email, password } = await c.req.json();
  if (!email || !password) {
    return c.json({ error: "Email and password required" }, 400);
  }

  const [user] = await db.select().from(users).where(eq(users.email, email));
  if (!user) {
    return c.json({ error: "Invalid credentials" }, 401);
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return c.json({ error: "Invalid credentials" }, 401);
  }

  const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "7d" });
  return c.json({ token, user: { id: user.id, email: user.email } });
});

app.get("/auth/me", authMiddleware(), async (c) => {
  const userId = c.get("userId");
  const [user] = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(eq(users.id, userId));
  if (!user) return c.json({ error: "User not found" }, 404);
  return c.json({ user });
});

// --- Courts routes (public) ---

app.get("/courts", async (c) => {
  const allCourts = await db.select().from(courts);
  return c.json(allCourts);
});

// --- Bookings routes ---

app.get("/bookings", async (c) => {
  const courtId = c.req.query("courtId");
  const date = c.req.query("date");

  if (!courtId || !date) {
    return c.json({ error: "courtId and date required" }, 400);
  }

  const result = await db
    .select({
      id: bookings.id,
      courtId: bookings.courtId,
      date: bookings.date,
      startTime: bookings.startTime,
      endTime: bookings.endTime,
    })
    .from(bookings)
    .where(and(eq(bookings.courtId, Number(courtId)), eq(bookings.date, date)));

  return c.json(result);
});

app.get("/my-bookings", authMiddleware(), async (c) => {
  const userId = c.get("userId");
  const result = await db
    .select({
      id: bookings.id,
      courtId: bookings.courtId,
      date: bookings.date,
      startTime: bookings.startTime,
      endTime: bookings.endTime,
      createdAt: bookings.createdAt,
    })
    .from(bookings)
    .where(eq(bookings.userId, userId));

  return c.json(result);
});

app.post("/bookings", authMiddleware(), async (c) => {
  const userId = c.get("userId");
  const { courtId, date, startTime, endTime } = await c.req.json();

  if (!courtId || !date || !startTime || !endTime) {
    return c.json({ error: "courtId, date, startTime, endTime required" }, 400);
  }

  try {
    const [booking] = await db
      .insert(bookings)
      .values({ userId, courtId, date, startTime, endTime })
      .returning();
    return c.json(booking, 201);
  } catch (err: any) {
    if (err.message?.includes("unique_court_slot") || err.message?.includes("duplicate")) {
      return c.json({ error: "This time slot is already booked" }, 409);
    }
    throw err;
  }
});

app.delete("/bookings/:id", authMiddleware(), async (c) => {
  const userId = c.get("userId");
  const bookingId = c.req.param("id");

  const [booking] = await db
    .select()
    .from(bookings)
    .where(and(eq(bookings.id, bookingId), eq(bookings.userId, userId)));

  if (!booking) {
    return c.json({ error: "Booking not found" }, 404);
  }

  await db.delete(bookings).where(eq(bookings.id, bookingId));
  return c.json({ ok: true });
});

export const config = {
  maxDuration: 30,
};

export default handle(app);
