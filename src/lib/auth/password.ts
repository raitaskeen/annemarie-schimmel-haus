/**
 * Password hashing with scrypt (Node built-in, no native add-ons).
 *
 * Parameters follow the OWASP Password Storage Cheat Sheet scrypt profile
 * N=2^15, r=8, p=3 (≈32 MiB per hash). Hashes are self-describing so the
 * parameters can be raised later; `needsRehash` reports outdated hashes.
 *
 * Format: scrypt$<N>$<r>$<p>$<salt b64url>$<hash b64url>
 */
import { randomBytes, scrypt as scryptCb, timingSafeEqual, type ScryptOptions } from "node:crypto";

const N = 2 ** 15;
const R = 8;
const P = 3;
const KEY_LENGTH = 64;
const SALT_BYTES = 16;

function scrypt(password: string, salt: Buffer, keylen: number, options: ScryptOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCb(password.normalize("NFKC"), salt, keylen, options, (err, key) => (err ? reject(err) : resolve(key)));
  });
}

const maxmem = (n: number, r: number, p: number) => 128 * n * r * p + 16 * 1024 * 1024;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES);
  const key = await scrypt(password, salt, KEY_LENGTH, { N, r: R, p: P, maxmem: maxmem(N, R, P) });
  return ["scrypt", N, R, P, salt.toString("base64url"), key.toString("base64url")].join("$");
}

export async function verifyPassword(password: string, stored: string | null | undefined): Promise<boolean> {
  if (!stored) {
    // Spend comparable time so a missing account is not distinguishable by timing.
    await scrypt(password, randomBytes(SALT_BYTES), KEY_LENGTH, { N, r: R, p: P, maxmem: maxmem(N, R, P) });
    return false;
  }
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const [, n, r, p, saltB64, hashB64] = parts;
  const params = { N: Number(n), r: Number(r), p: Number(p) };
  if (![params.N, params.r, params.p].every((v) => Number.isInteger(v) && v > 0)) return false;
  const expected = Buffer.from(hashB64, "base64url");
  const actual = await scrypt(password, Buffer.from(saltB64, "base64url"), expected.length, {
    ...params,
    maxmem: maxmem(params.N, params.r, params.p),
  });
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function needsRehash(stored: string): boolean {
  const [, n, r, p] = stored.split("$");
  return Number(n) < N || Number(r) < R || Number(p) < P;
}

/** Password policy shared by the UI hints and server validation. */
export const PASSWORD_MIN_LENGTH = 12;

export function passwordProblems(password: string, context: string[] = []): string[] {
  const problems: string[] = [];
  if (password.length < PASSWORD_MIN_LENGTH) problems.push(`Use at least ${PASSWORD_MIN_LENGTH} characters.`);
  if (password.length > 256) problems.push("Use at most 256 characters.");
  const classes = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((re) => re.test(password)).length;
  if (classes < 3) problems.push("Mix at least three of: lowercase, uppercase, digits, symbols.");
  const lower = password.toLowerCase();
  for (const word of context) {
    const w = word.toLowerCase().trim();
    if (w.length >= 4 && lower.includes(w)) {
      problems.push("Do not include your name, email or the institute name.");
      break;
    }
  }
  if (/^(.)\1+$/.test(password) || /(password|12345678|qwerty)/i.test(password)) {
    problems.push("Avoid common or repeated patterns.");
  }
  return problems;
}

/** Strong random password for invitations and the first local admin. */
export function generatePassword(length = 20): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#%&*-_=+";
  const bytes = randomBytes(length * 2);
  let out = "";
  for (let i = 0; i < bytes.length && out.length < length; i++) {
    // Rejection sampling keeps the distribution uniform.
    const limit = 256 - (256 % alphabet.length);
    if (bytes[i] < limit) out += alphabet[bytes[i] % alphabet.length];
  }
  // Guarantee every character class is present.
  return /[a-z]/.test(out) && /[A-Z]/.test(out) && /\d/.test(out) && /[^A-Za-z0-9]/.test(out)
    ? out
    : generatePassword(length);
}
