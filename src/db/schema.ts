import { pgTable, serial, text, uuid, date, timestamp, unique } from "drizzle-orm/pg-core";

export const courts = pgTable("courts", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  location: text("location").notNull(),
  surface: text("surface").notNull(),
});

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const bookings = pgTable(
  "bookings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    courtId: serial("court_id")
      .notNull()
      .references(() => courts.id),
    date: date("date").notNull(),
    startTime: text("start_time").notNull(),
    endTime: text("end_time").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [unique("unique_court_slot").on(table.courtId, table.date, table.startTime)]
);
