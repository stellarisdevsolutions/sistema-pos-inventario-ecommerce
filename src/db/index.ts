import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  // In dev / build time without DB, warn instead of crashing
  console.warn("⚠️ DATABASE_URL is not set in environment variables");
}

const sql = neon(connectionString || "postgresql://dummy:dummy@localhost:5432/dummy");
export const db = drizzle(sql, { schema });
