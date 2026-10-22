"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { AnimatePresence, m } from "motion/react";
import {
  ArrowRight,
  ArrowUpRight,
  Award,
  CalendarDays,
  ClipboardCheck,
  FileSearch,
  GraduationCap,
  Handshake,
  Images,
  Landmark,
  Mail,
  Menu,
  Newspaper,
  Receipt,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import { Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import type { CommonDictionary } from "@/i18n/common";
import { href, type Locale } from "@/i18n/config";
import { cn } from "@/lib/utils";
import { InstallButton } from "@/components/pwa/install-ui";
import { SiteThemeToggle } from "./theme-toggle";
import { LanguageSwitcher, LanguageSwitcherFallback } from "./language-switcher";
import { Girih } from "./girih";

export type HeaderProps = {
  locale: Locale;
  nav: CommonDictionary["nav"];
  brand: CommonDictionary["brand"];
  app: CommonDictionary["app"];
  logo: React.ReactNode;
  featured: { eyebrow: string; title: string; meta: string; href: string } | null;
};

type Item = { title: string; hint: string; href: string; icon: React.ComponentType<{ className?: string }> };

export function HeaderClient({ locale, nav, brand, app, logo, featured }: HeaderProps) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const learn: Item[] = [
    { title: nav.courses, hint: nav.coursesHint, href: href(locale, "/courses"), icon: GraduationCap },
    { title: nav.placement, hint: nav.placementHint, href: href(locale, "/placement-test"), icon: ClipboardCheck },
    { title: nav.exams, hint: nav.examsHint, href: href(locale, "/exams"), icon: Award },
    { title: nav.fees, hint: nav.feesHint, href: href(locale, "/courses#fees"), icon: Receipt },
  ];
  const culture: Item[] = [
    { title: nav.events, hint: nav.eventsHint, href: href(locale, "/events"), icon: CalendarDays },
    { title: nav.gallery, hint: nav.galleryHint, href: href(locale, "/gallery"), icon: Images },
    { title: nav.news, hint: nav.newsHint, href: href(locale, "/news"), icon: Newspaper },
  ];
  const haus: Item[] = [
    { title: nav.about, hint: nav.aboutHint, href: href(locale, "/about"), icon: Landmark },
    { title: nav.partners, hint: nav.partnersHint, href: href(locale, "/partners"), icon: Handshake },
    { title: nav.contact, hint: nav.contactHint, href: href(locale, "/contact"), icon: Mail },
  ];

  return (
    <header
      className={cn(
        "sticky top-0 z-40 transition-[background-color,box-shadow,backdrop-filter] duration-300",
        scrolled ? "bg-paper/85 shadow-[0_1px_0_0_rgb(37_48_43/0.08),0_12px_30px_-20px_rgb(16_36_28/0.35)] backdrop-blur-xl" : "bg-paper",
      )}
    >
      <div className={cn("container-site flex items-center justify-between gap-4 transition-[height] duration-300", scrolled ? "h-16" : "h-20")}>
        <Link href={href(locale)} className="shrink-0 rounded-md" aria-label={`${brand.name} — ${nav.home}`}>
          {logo}
        </Link>

        <NavigationMenu viewport={false} className="hidden lg:flex" aria-label="Main">
          <NavigationMenuList className="gap-1">
            <MegaItem label={nav.learn} items={learn} featured={featured} />
            <MegaItem label={nav.culture} items={culture} />
            <MegaItem label={nav.institute} items={haus} />
            <NavigationMenuItem>
              <NavigationMenuLink asChild>
                <Link
                  href={href(locale, "/track")}
                  className="relative inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-sm font-medium text-ink/80 hover:bg-ink/5 hover:text-ink"
                >
                  <Suspense fallback={null}>
                    <ActiveMark hrefs={[href(locale, "/track")]} />
                  </Suspense>
                  <FileSearch className="size-4" />
                  {nav.track}
                </Link>
              </NavigationMenuLink>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>

        <div className="flex items-center gap-2">
          <Suspense fallback={<LanguageSwitcherFallback locale={locale} className="hidden sm:flex" />}>
            <LanguageSwitcher locale={locale} label={nav.language} className="hidden sm:flex" />
          </Suspense>
          <Button asChild className="hidden h-10 rounded-full bg-forest px-5 text-white shadow-[0_8px_24px_-12px_rgb(16_36_28/0.8)] hover:bg-pine md:inline-flex">
            <Link href={href(locale, "/courses")}>
              {nav.enroll}
              <ArrowRight className="transition-transform group-hover/button:translate-x-0.5" />
            </Link>
          </Button>

          <SiteThemeToggle labels={{ dark: locale === "de" ? "Dunkles Design" : "Dark mode", light: locale === "de" ? "Helles Design" : "Light mode" }} />
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon-lg" className="rounded-full lg:hidden" aria-label={nav.menu}>
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full max-w-md overflow-y-auto border-none bg-forest p-0 text-white sm:max-w-md [&>button]:hidden">
              <Girih className="text-white/[0.04]" size={72} />
              <div className="relative flex min-h-full flex-col">
                <div className="flex items-center justify-between px-6 pt-6">
                  <SheetTitle className="eyebrow text-lime">{nav.menu}</SheetTitle>
                  <SheetClose asChild>
                    <Button variant="ghost" size="icon-lg" className="rounded-full text-white hover:bg-white/10 hover:text-white" aria-label={nav.close}>
                      <X className="size-5" />
                    </Button>
                  </SheetClose>
                </div>
                <AnimatePresence>
                  {open && (
                    <m.nav
                      aria-label="Mobile"
                      className="flex-1 px-6 pt-6 pb-10"
                      initial="hidden"
                      animate="show"
                      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.04, delayChildren: 0.08 } } }}
                    >
                      {[
                        { label: nav.learn, items: learn },
                        { label: nav.culture, items: culture },
                        { label: nav.institute, items: haus },
                      ].map((group) => (
                        <div key={group.label} className="mb-7">
                          <m.p variants={item} className="eyebrow mb-2 text-white/50">
                            {group.label}
                          </m.p>
                          <ul>
                            {group.items.map((i) => (
                              <m.li key={i.href} variants={item}>
                                <Link
                                  href={i.href}
                                  onClick={() => setOpen(false)}
                                  className="group flex items-center justify-between border-b border-white/10 py-3 font-display text-2xl text-white/90 transition-colors hover:text-lime"
                                >
                                  {i.title}
                                  <ArrowUpRight className="size-5 opacity-40 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100" />
                                </Link>
                              </m.li>
                            ))}
                          </ul>
                        </div>
                      ))}
                      <m.div variants={item} className="grid gap-3">
                        <Button asChild size="lg" className="h-12 rounded-full bg-lime text-base font-semibold text-forest hover:bg-lime/90">
                          <Link href={href(locale, "/courses")} onClick={() => setOpen(false)}>
                            {nav.enroll} <ArrowRight />
                          </Link>
                        </Button>
                        <Button asChild size="lg" variant="outline" className="h-12 rounded-full border-white/25 bg-transparent text-base text-white hover:bg-white/10 hover:text-white">
                          <Link href={href(locale, "/track")} onClick={() => setOpen(false)}>
                            <FileSearch /> {nav.track}
                          </Link>
                        </Button>
                        <InstallButton labels={app} tone="dark" className="h-12 w-full text-base" />
                        <Suspense fallback={<LanguageSwitcherFallback locale={locale} tone="dark" className="mt-3 w-fit" />}>
                          <LanguageSwitcher locale={locale} label={nav.language} tone="dark" className="mt-3 w-fit" />
                        </Suspense>
                      </m.div>
                    </m.nav>
                  )}
                </AnimatePresence>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}

const item = { hidden: { opacity: 0, x: 24 }, show: { opacity: 1, x: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } } } as const;

/** Lime underline for the section containing the current page (reads the URL, so it streams in). */
function ActiveMark({ hrefs, exclude }: { hrefs: string[]; exclude?: string }) {
  const pathname = usePathname() ?? "";
  const active = hrefs.some((h) => h !== exclude && pathname.startsWith(h.split("#")[0]));
  return active ? <span aria-hidden className="absolute inset-x-4 -bottom-0.5 h-0.5 rounded-full bg-lime" /> : null;
}

function MegaItem({ label, items, featured }: { label: string; items: Item[]; featured?: HeaderProps["featured"] }) {
  return (
    <NavigationMenuItem>
      <NavigationMenuTrigger
        className="relative h-9 rounded-full bg-transparent px-3.5 text-sm font-medium text-ink/80 hover:bg-ink/5 hover:text-ink data-open:bg-ink/5 data-open:text-ink"
      >
        <Suspense fallback={null}>
          <ActiveMark hrefs={items.map((i) => i.href)} />
        </Suspense>
        {label}
      </NavigationMenuTrigger>
      <NavigationMenuContent className="!mt-3 rounded-2xl border-0 bg-cream p-0 shadow-[0_30px_60px_-30px_rgb(16_36_28/0.45)] ring-1 ring-ink/10">
        <div className={cn("grid gap-0", featured ? "w-[640px] grid-cols-[1fr_230px]" : "w-[400px]")}>
          <ul className="grid gap-1 p-3">
            {items.map((i) => (
              <li key={i.href}>
                <NavigationMenuLink asChild>
                  <Link href={i.href} className="group flex items-start gap-3 rounded-xl p-3 hover:bg-mist">
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-mint text-pine transition-colors group-hover:bg-forest group-hover:text-lime">
                      <i.icon className="size-5" />
                    </span>
                    <span className="grid gap-0.5">
                      <span className="text-sm font-semibold text-forest">{i.title}</span>
                      <span className="text-xs leading-snug text-stone">{i.hint}</span>
                    </span>
                  </Link>
                </NavigationMenuLink>
              </li>
            ))}
          </ul>
          {featured && (
            <NavigationMenuLink asChild>
              <Link href={featured.href} className="relative m-2 flex flex-col justify-end overflow-hidden rounded-xl bg-forest p-5 text-white hover:bg-forest">
                <Girih className="text-white/[0.06]" size={48} />
                <span className="relative eyebrow text-lime">{featured.eyebrow}</span>
                <span className="relative mt-2 font-display text-xl leading-tight">{featured.title}</span>
                <span className="relative mt-1 text-xs text-white/70">{featured.meta}</span>
                <ArrowRight className="relative mt-4 size-4 text-lime" />
              </Link>
            </NavigationMenuLink>
          )}
        </div>
      </NavigationMenuContent>
    </NavigationMenuItem>
  );
}
