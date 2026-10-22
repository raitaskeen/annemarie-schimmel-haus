import type { MetadataRoute } from "next";
import { locales } from "@/i18n/config";
import { getCourseSlugs, getEventSlugs, getPostSlugs } from "@/server/public/queries";

const STATIC = ["", "/courses", "/placement-test", "/exams", "/events", "/gallery", "/news", "/about", "/partners", "/contact", "/track", "/student-guidelines", "/privacy", "/terms"];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.APP_URL ?? "http://localhost:4000";
  const [courses, events, posts] = await Promise.all([getCourseSlugs(), getEventSlugs(), getPostSlugs()]);
  const paths = [...STATIC, ...courses.map((s) => `/courses/${s}`), ...events.map((s) => `/events/${s}`), ...posts.map((s) => `/news/${s}`)];
  return paths.map((path) => ({
    url: `${base}/en${path}`,
    changeFrequency: path === "" || path === "/events" || path === "/courses" ? "daily" : "weekly",
    priority: path === "" ? 1 : path.split("/").length > 2 ? 0.6 : 0.8,
    alternates: { languages: Object.fromEntries(locales.map((l) => [l, `${base}/${l}${path}`])) },
  }));
}
