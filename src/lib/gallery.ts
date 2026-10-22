/** Gallery categories shared by the admin (server and client) and the public site. */
export const GALLERY_CATEGORIES = ["courses", "campus", "exhibitions", "events", "community", "workshops", "performing_arts", "visitors"] as const;

export type GalleryCategory = (typeof GALLERY_CATEGORIES)[number];

export const GALLERY_CATEGORY_LABELS: Record<GalleryCategory, string> = {
  courses: "Courses",
  campus: "Campus",
  exhibitions: "Exhibitions",
  events: "Events",
  community: "Community",
  workshops: "Workshops",
  performing_arts: "Performing arts",
  visitors: "Visitors",
};

export const galleryCategoryOptions = GALLERY_CATEGORIES.map((value) => ({ value, label: GALLERY_CATEGORY_LABELS[value] }));
