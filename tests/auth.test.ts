import { describe, expect, it } from "vitest";
import { decrypt, deriveKey, encrypt, randomToken, sha256Hex } from "@/lib/auth/crypto";
import { generatePassword, hashPassword, needsRehash, passwordProblems, verifyPassword } from "@/lib/auth/password";
import { can, PERMISSIONS } from "@/lib/auth/permissions";
import { base32Decode, base32Encode, totp, verifyTotp } from "@/lib/auth/totp";

describe("TOTP (RFC 6238, SHA-1)", () => {
  // Secret "12345678901234567890"; the RFC lists 8-digit codes, authenticator apps show the last 6.
  const secret = base32Encode(Buffer.from("12345678901234567890"));
  const vectors: [number, string][] = [
    [59, "287082"],
    [1111111109, "081804"],
    [1111111111, "050471"],
    [1234567890, "005924"],
    [2000000000, "279037"],
    [20000000000, "353130"],
  ];

  it("encodes the RFC secret", () => {
    expect(secret).toBe("GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ");
    expect(base32Decode(secret).toString()).toBe("12345678901234567890");
  });

  it.each(vectors)("t=%i → %s", (seconds, code) => {
    expect(totp(secret, seconds * 1000)).toBe(code);
  });

  it("accepts the neighbouring step for clock drift but not older codes", () => {
    const now = 1_700_000_000_000;
    expect(verifyTotp(secret, totp(secret, now), now)).not.toBeNull();
    expect(verifyTotp(secret, totp(secret, now - 30_000), now)).not.toBeNull();
    expect(verifyTotp(secret, totp(secret, now - 5 * 30_000), now)).toBeNull();
  });

  it("rejects malformed input", () => {
    expect(verifyTotp(secret, "12345", Date.now())).toBeNull();
    expect(verifyTotp(secret, "abcdef", Date.now())).toBeNull();
  });
});

describe("password hashing", () => {
  it("round-trips and rejects wrong passwords", async () => {
    const hash = await hashPassword("Correct horse battery 9");
    expect(hash.startsWith("scrypt$32768$8$3$")).toBe(true);
    expect(await verifyPassword("Correct horse battery 9", hash)).toBe(true);
    expect(await verifyPassword("Correct horse battery 8", hash)).toBe(false);
    expect(needsRehash(hash)).toBe(false);
  });

  it("salts every hash", async () => {
    expect(await hashPassword("Same password 123!")).not.toBe(await hashPassword("Same password 123!"));
  });

  it("treats missing or foreign hashes as invalid", async () => {
    expect(await verifyPassword("anything", null)).toBe(false);
    expect(await verifyPassword("anything", "$2b$10$abcdefghijklmnopqrstuv")).toBe(false);
  });

  it("flags weaker parameters for rehash", () => {
    expect(needsRehash("scrypt$16384$8$1$c2FsdA$aGFzaA")).toBe(true);
  });

  it("enforces the policy", () => {
    expect(passwordProblems("short1A!")).toContain("Use at least 12 characters.");
    expect(passwordProblems("alllowercaseletters")).toContain("Mix at least three of: lowercase, uppercase, digits, symbols.");
    expect(passwordProblems("Schimmel-Lahore-2026", ["schimmel"])).toContain("Do not include your name, email or the institute name.");
    expect(passwordProblems("MyPassword-2026!")).toContain("Avoid common or repeated patterns.");
    expect(passwordProblems("Tea at the Upper Mall, 4pm")).toEqual([]);
  });

  it("generates passwords that satisfy the policy", () => {
    for (let i = 0; i < 50; i++) expect(passwordProblems(generatePassword())).toEqual([]);
  });
});

describe("encryption at rest (AES-256-GCM)", () => {
  const key = deriveKey("test-secret-that-is-at-least-thirty-two-characters-long", "totp-secret");

  it("round-trips and uses a fresh IV", () => {
    const a = encrypt("JBSWY3DPEHPK3PXP", key);
    const b = encrypt("JBSWY3DPEHPK3PXP", key);
    expect(a).not.toBe(b);
    expect(decrypt(a, key)).toBe("JBSWY3DPEHPK3PXP");
  });

  it("detects tampering and wrong keys", () => {
    const payload = encrypt("secret", key);
    const [v, iv, tag, ct] = payload.split(".");
    const flipped = Buffer.from(ct, "base64url");
    flipped[0] ^= 1;
    expect(() => decrypt([v, iv, tag, flipped.toString("base64url")].join("."), key)).toThrow();
    expect(() => decrypt(payload, deriveKey("another-secret-that-is-also-long-enough", "totp-secret"))).toThrow();
  });

  it("binds keys to their purpose", () => {
    expect(deriveKey("s".repeat(40), "a").equals(deriveKey("s".repeat(40), "b"))).toBe(false);
  });

  it("creates unguessable tokens and stable digests", () => {
    expect(randomToken()).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(new Set(Array.from({ length: 200 }, () => randomToken())).size).toBe(200);
    expect(sha256Hex("abc")).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  });
});

describe("permissions", () => {
  it("gives administrators everything and future portal roles nothing yet", () => {
    for (const p of PERMISSIONS) expect(can("admin", p)).toBe(true);
    for (const p of PERMISSIONS) {
      expect(can("teacher", p)).toBe(false);
      expect(can("student", p)).toBe(false);
    }
  });

  it("keeps the course office away from users, settings and exports", () => {
    expect(can("support", "submissions:write")).toBe(true);
    expect(can("support", "users:manage")).toBe(false);
    expect(can("support", "settings:manage")).toBe(false);
    expect(can("support", "submissions:export")).toBe(false);
    expect(can("editor", "users:manage")).toBe(false);
  });
});
