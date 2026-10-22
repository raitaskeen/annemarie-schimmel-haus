import { randomBytes } from "node:crypto";

/** Unambiguous alphabet (no 0/O, 1/I/L) for references people read aloud or type. */
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

export type ReferenceKind = "enrollment" | "event" | "placement" | "message";

const PREFIX: Record<ReferenceKind, string> = {
  enrollment: "ASH-E",
  event: "ASH-V",
  placement: "ASH-P",
  message: "ASH-M",
};

function randomCode(length: number): string {
  let out = "";
  const limit = 256 - (256 % ALPHABET.length);
  while (out.length < length) {
    for (const byte of randomBytes(length * 2)) {
      if (byte < limit) out += ALPHABET[byte % ALPHABET.length];
      if (out.length === length) break;
    }
  }
  return out;
}

/** e.g. ASH-E-7K3M9Q, 31^6 ≈ 887M combinations; uniqueness is enforced by the database. */
export function newReference(kind: ReferenceKind): string {
  return `${PREFIX[kind]}-${randomCode(6)}`;
}

export { referencePattern } from "./validators";
