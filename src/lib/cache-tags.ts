/** Cache tags for public data. Admin mutations call updateTag() with these. */
export const TAGS = {
  settings: "settings",
  courses: "courses",
  offerings: "offerings",
  events: "events",
  placement: "placement",
  exams: "exams",
  posts: "posts",
  gallery: "gallery",
  partners: "partners",
} as const;

export type CacheTag = (typeof TAGS)[keyof typeof TAGS];
