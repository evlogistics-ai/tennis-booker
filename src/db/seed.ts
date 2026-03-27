import "dotenv/config";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { courts } from "./schema";

async function seed() {
  const sql = neon(process.env.DATABASE_URL!);
  const db = drizzle(sql);

  const courtsData = [
    { name: "Center Court", location: "Main Complex", surface: "Hard" },
    { name: "Court 2", location: "Main Complex", surface: "Hard" },
    { name: "Clay Court A", location: "West Wing", surface: "Clay" },
    { name: "Clay Court B", location: "West Wing", surface: "Clay" },
    { name: "Grass Court", location: "East Pavilion", surface: "Grass" },
    { name: "Practice Court", location: "East Pavilion", surface: "Hard" },
  ];

  console.log("Seeding courts...");
  await db.insert(courts).values(courtsData).onConflictDoNothing();
  console.log("Done! Seeded", courtsData.length, "courts.");
}

seed().catch(console.error);
