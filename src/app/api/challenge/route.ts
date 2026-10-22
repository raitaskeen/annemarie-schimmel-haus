import { connection } from "next/server";
import { createChallenge } from "@/lib/security/human-check";

/** Issues a fresh human-check question for public forms (never cached). */
export async function GET() {
  await connection();
  const { a, b, op, token } = createChallenge();
  return Response.json({ a, b, op, token }, { headers: { "Cache-Control": "no-store" } });
}
