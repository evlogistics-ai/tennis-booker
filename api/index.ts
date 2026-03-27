import type { VercelRequest, VercelResponse } from "@vercel/node";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { eq, and } from "drizzle-orm";
import { pgTable, serial, text, uuid, date, timestamp, unique } from "drizzle-orm/pg-core";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

// --- Schema ---
const courts = pgTable("courts", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  location: text("location").notNull(),
  surface: text("surface").notNull(),
});

const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

const bookings = pgTable(
  "bookings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id),
    courtId: serial("court_id").notNull().references(() => courts.id),
    date: date("date").notNull(),
    startTime: text("start_time").notNull(),
    endTime: text("end_time").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [unique("unique_court_slot").on(table.courtId, table.date, table.startTime)]
);

// --- DB ---
function getDb() {
  const sql = neon(process.env.DATABASE_URL!);
  return drizzle(sql);
}

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";

// --- Helpers ---
function getUserId(req: VercelRequest): string | null {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return null;
  try {
    const payload = jwt.verify(header.slice(7), JWT_SECRET) as { userId: string };
    return payload.userId;
  } catch {
    return null;
  }
}

function cors(res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

// --- Router ---
export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).end();

  const url = new URL(req.url!, `http://${req.headers.host}`);
  const path = url.pathname.replace(/^\/api/, "");
  const db = getDb();

  try {
    // POST /api/auth/signup
    if (path === "/auth/signup" && req.method === "POST") {
      const { email, password } = req.body;
      if (!email || !password) return res.status(400).json({ error: "Email and password required" });
      if (password.length < 6) return res.status(400).json({ error: "Password must be at least 6 characters" });

      const existing = await db.select().from(users).where(eq(users.email, email));
      if (existing.length > 0) return res.status(409).json({ error: "Email already registered" });

      const passwordHash = await bcrypt.hash(password, 10);
      const [user] = await db.insert(users).values({ email, passwordHash }).returning({ id: users.id, email: users.email });
      const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "7d" });
      return res.status(200).json({ token, user: { id: user.id, email: user.email } });
    }

    // POST /api/auth/login
    if (path === "/auth/login" && req.method === "POST") {
      const { email, password } = req.body;
      if (!email || !password) return res.status(400).json({ error: "Email and password required" });

      const [user] = await db.select().from(users).where(eq(users.email, email));
      if (!user) return res.status(401).json({ error: "Invalid credentials" });

      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) return res.status(401).json({ error: "Invalid credentials" });

      const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "7d" });
      return res.status(200).json({ token, user: { id: user.id, email: user.email } });
    }

    // GET /api/auth/me
    if (path === "/auth/me" && req.method === "GET") {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const [user] = await db.select({ id: users.id, email: users.email }).from(users).where(eq(users.id, userId));
      if (!user) return res.status(404).json({ error: "User not found" });
      return res.status(200).json({ user });
    }

    // GET /api/courts
    if (path === "/courts" && req.method === "GET") {
      const allCourts = await db.select().from(courts);
      return res.status(200).json(allCourts);
    }

    // GET /api/bookings?courtId=X&date=Y
    if (path === "/bookings" && req.method === "GET") {
      const courtId = url.searchParams.get("courtId");
      const dateParam = url.searchParams.get("date");
      if (!courtId || !dateParam) return res.status(400).json({ error: "courtId and date required" });

      const result = await db
        .select({ id: bookings.id, courtId: bookings.courtId, date: bookings.date, startTime: bookings.startTime, endTime: bookings.endTime })
        .from(bookings)
        .where(and(eq(bookings.courtId, Number(courtId)), eq(bookings.date, dateParam)));
      return res.status(200).json(result);
    }

    // GET /api/my-bookings
    if (path === "/my-bookings" && req.method === "GET") {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const result = await db
        .select({ id: bookings.id, courtId: bookings.courtId, date: bookings.date, startTime: bookings.startTime, endTime: bookings.endTime, createdAt: bookings.createdAt })
        .from(bookings)
        .where(eq(bookings.userId, userId));
      return res.status(200).json(result);
    }

    // POST /api/bookings
    if (path === "/bookings" && req.method === "POST") {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const { courtId, date: dateVal, startTime, endTime } = req.body;
      if (!courtId || !dateVal || !startTime || !endTime) return res.status(400).json({ error: "courtId, date, startTime, endTime required" });

      try {
        const [booking] = await db.insert(bookings).values({ userId, courtId, date: dateVal, startTime, endTime }).returning();
        return res.status(201).json(booking);
      } catch (err: any) {
        if (err.message?.includes("unique_court_slot") || err.message?.includes("duplicate")) {
          return res.status(409).json({ error: "This time slot is already booked" });
        }
        throw err;
      }
    }

    // DELETE /api/bookings/:id
    const deleteMatch = path.match(/^\/bookings\/(.+)$/);
    if (deleteMatch && req.method === "DELETE") {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const bookingId = deleteMatch[1];
      const [booking] = await db.select().from(bookings).where(and(eq(bookings.id, bookingId), eq(bookings.userId, userId)));
      if (!booking) return res.status(404).json({ error: "Booking not found" });

      await db.delete(bookings).where(eq(bookings.id, bookingId));
      return res.status(200).json({ ok: true });
    }

    return res.status(404).json({ error: "Not found" });
  } catch (err: any) {
    console.error("API Error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export const config = {
  maxDuration: 30,
};
