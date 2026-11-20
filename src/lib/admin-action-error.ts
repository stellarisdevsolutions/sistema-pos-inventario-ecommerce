import { ZodError } from "zod";
import { AdminAccessError } from "@/lib/auth/session";

export function adminActionError(error: unknown, fallback: string): string {
  if (error instanceof AdminAccessError) return error.message;
  if (error instanceof ZodError) return error.issues[0]?.message ?? fallback;
  console.error(fallback, error instanceof Error ? error.name : "Unknown error");
  return fallback;
}
