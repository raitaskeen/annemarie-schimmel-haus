"use client";

import { useEffect, useRef } from "react";

/**
 * Turns the surrounding admin table into stacked cards on phones (see .data-cards in
 * globals.css). Each cell gets its column title as data-label, the first titled column
 * becomes the card title, selection checkboxes and row menus move up next to it.
 * Without JavaScript the table simply scrolls sideways.
 */
export function TableCardLabels() {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const wrapper = ref.current?.parentElement;
    const table = wrapper?.querySelector("table");
    if (!wrapper || !table) return;
    const label = () => {
      const ths = [...table.querySelectorAll("thead th")];
      const heads = ths.map((th) => th.textContent?.trim() ?? "");
      // A column can claim the card title with <th data-primary>; otherwise the first titled column.
      const marked = ths.findIndex((th) => th.hasAttribute("data-primary"));
      const primary = marked >= 0 ? marked : heads.findIndex((h) => h);
      table.querySelectorAll("tbody tr").forEach((tr) => {
        [...tr.children].forEach((cell, i) => {
          const td = cell as HTMLElement;
          const role = td.querySelector('input[type="checkbox"]') && !heads[i] ? "select" : i === primary ? "primary" : !heads[i] ? "action" : "field";
          if (td.dataset.role !== role) td.dataset.role = role;
          if (td.dataset.label !== heads[i]) td.dataset.label = heads[i] ?? "";
        });
      });
      wrapper.classList.add("data-cards");
    };
    label();
    // Rows change after filtering, paging and router refreshes.
    const observer = new MutationObserver(label);
    observer.observe(table, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);
  return <span ref={ref} hidden />;
}
