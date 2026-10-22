import { describe, expect, it } from "vitest";
import { toCsv } from "@/lib/csv";
import { buildIcs } from "@/lib/ics";
import { newReference } from "@/lib/reference";
import { eventSchema, isSafeImagePath } from "@/lib/schemas/admin";
import { siteSettingsSchema, defaultSiteSettings } from "@/lib/site-settings-schema";
import { cleanText, maskCnic, maskEmail, maskPhone, normalizeCnic, normalizePhone, referencePattern } from "@/lib/validators";

describe("phone numbers", () => {
  it.each([
    ["0300 1234567", "+923001234567"],
    ["0300-1234567", "+923001234567"],
    ["923001234567", "+923001234567"],
    ["+92 300 1234567", "+923001234567"],
    ["3001234567", "+923001234567"],
    ["0049 151 23456789", "+4915123456789"],
    ["+49 151 23456789", "+4915123456789"],
  ])("%s → %s", (input, out) => expect(normalizePhone(input)).toBe(out));

  it.each(["", "12345", "0300 12345", "+92 1", "not a number"])("rejects %j", (input) => expect(normalizePhone(input)).toBeNull());
});

describe("CNIC", () => {
  it("normalises 13 digits", () => {
    expect(normalizeCnic("3520212345671")).toBe("35202-1234567-1");
    expect(normalizeCnic("35202-1234567-1")).toBe("35202-1234567-1");
  });
  it("rejects other lengths", () => {
    expect(normalizeCnic("35202-123456-1")).toBeNull();
  });
});

describe("masking for the public tracker", () => {
  it("hides most characters", () => {
    expect(maskEmail("sara.testwala@example.com")).toBe("sa•••••••••••@example.com");
    expect(maskCnic("35202-1234567-1")).not.toContain("1234567");
    expect(maskPhone("+923001234567")).not.toContain("1234567");
  });
});

describe("text cleaning", () => {
  it("removes control characters but keeps line breaks", () => {
    expect(cleanText("  Hello\u0000  world\u0007\nSecond  line ")).toBe("Hello world\nSecond line");
  });
});

describe("application numbers", () => {
  it("match the published pattern and avoid look-alike characters", () => {
    const refs = Array.from({ length: 2000 }, (_, i) => newReference((["enrollment", "event", "placement", "message"] as const)[i % 4]));
    for (const r of refs) {
      expect(r).toMatch(referencePattern);
      expect(r.slice(6)).not.toMatch(/[01ILO]/);
    }
    expect(new Set(refs).size).toBeGreaterThan(1990);
  });
});

describe("CSV export", () => {
  it("neutralises spreadsheet formulas (CSV injection)", () => {
    const csv = toCsv([{ name: "=HYPERLINK(\"http://evil\")", note: "+1", other: "@SUM(A1)", dash: "-2" }]);
    const row = csv.split("\r\n")[1];
    expect(row).toBe(`"'=HYPERLINK(""http://evil"")",'+1,'@SUM(A1),'-2`);
  });

  it("quotes separators and starts with a BOM for Excel", () => {
    const csv = toCsv([{ a: "x,y", b: 'say "hi"', c: "line\nbreak" }]);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv).toContain(`"x,y","say ""hi""","line\nbreak"`);
  });
});

describe("calendar files", () => {
  it("escapes text and folds long lines", () => {
    const ics = buildIcs({ uid: "ASH-V-ABCDEF", title: "Film, music; and more", description: "x".repeat(200), location: "Lahore", start: new Date("2026-11-06T12:00:00Z") });
    expect(ics).toContain("SUMMARY:Film\\, music\\; and more");
    expect(ics).toContain("DTSTART:20261106T120000Z");
    for (const line of ics.split("\r\n")) expect(Buffer.byteLength(line, "utf8")).toBeLessThanOrEqual(75);
  });
});

describe("admin input safety", () => {
  it("only accepts images from the site's own folders", () => {
    expect(isSafeImagePath("/images/gallery/photo-1.webp")).toBe(true);
    expect(isSafeImagePath("/media/7f1c6b3e-4d2a-4f7a-9c11-0a1b2c3d4e5f")).toBe(true);
    expect(isSafeImagePath("/images/../../.env.local")).toBe(false);
    expect(isSafeImagePath("//evil.example/x.png")).toBe(false);
    expect(isSafeImagePath("https://evil.example/x.png")).toBe(false);
    expect(isSafeImagePath("/etc/passwd")).toBe(false);
  });

  it("rejects script and protocol-relative links in the announcement bar", () => {
    const withHref = (href: string) => siteSettingsSchema.safeParse({ ...defaultSiteSettings, announcement: { ...defaultSiteSettings.announcement, href } }).success;
    expect(withHref("/courses")).toBe(true);
    expect(withHref("https://www.goethe.de/ins/pk/en/spr/prf.html")).toBe(true);
    expect(withHref("javascript:alert(1)")).toBe(false);
    expect(withHref("//evil.example")).toBe(false);
    expect(withHref("data:text/html,<script>")).toBe(false);
  });

  it("parses the event programme lines", () => {
    const base = {
      slug: "open-day",
      titleEn: "Open Day",
      titleDe: "",
      summaryEn: "",
      summaryDe: "",
      bodyEn: "",
      bodyDe: "",
      category: "info_session",
      startsAt: "2026-11-07T10:00",
      endsAt: "",
      venue: "ASH",
      address: "Upper Mall",
      imagePath: "",
      imageAlt: "",
      capacity: "",
      registrationMode: "internal",
      externalUrl: "",
      registrationClosesAt: "",
      isFree: "true",
      feePkr: "",
      requiresCnic: "false",
      maxGuests: "2",
      collaborators: "Goethe-Institut, DAAD",
      status: "published",
      featured: "false",
    };
    const parsed = eventSchema.parse({ ...base, agenda: "10:00 | Welcome | Begrüßung | Garden\n\n11:30 | Trial lesson\n| missing time" });
    expect(parsed.agenda).toEqual([
      { time: "10:00", titleEn: "Welcome", titleDe: "Begrüßung", location: "Garden" },
      { time: "11:30", titleEn: "Trial lesson" },
    ]);
    expect(parsed.collaborators).toEqual(["Goethe-Institut", "DAAD"]);
    expect(eventSchema.safeParse({ ...base, registrationMode: "external", externalUrl: "" }).success).toBe(false);
    expect(eventSchema.safeParse({ ...base, externalUrl: "http://insecure.example" }).success).toBe(false);
  });
});

describe("site settings upgrades", () => {
  it("fills in automation defaults for settings saved before the section existed", () => {
    const { automation: _drop, ...old } = defaultSiteSettings;
    const parsed = siteSettingsSchema.parse(old);
    expect(parsed.automation).toEqual({
      autoRequestPayment: false,
      autoPromoteWaitlist: true,
      paymentReminders: true,
      reminders: true,
      autoClose: true,
      staffDigest: true,
      documentRetentionDays: 365,
    });
  });
});
