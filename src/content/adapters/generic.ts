import type { Adapter, FieldRef } from "./types";

const TEXT_LIKE = [
  'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"])',
  ':not([type="image"]):not([type="checkbox"]):not([type="password"]):not([type="search"])',
  ':not([type="radio"]):not([type="file"])',
].join("");

export function isUsable(el: HTMLElement): boolean {
  const e = el as HTMLInputElement;
  if (e.disabled || e.readOnly) return false;
  const style = el.ownerDocument.defaultView?.getComputedStyle(el);
  if (style && (style.display === "none" || style.visibility === "hidden")) return false;
  return !el.closest("[hidden], [aria-hidden='true']");
}

export function collectGeneric(doc: Document): FieldRef[] {
  const refs: FieldRef[] = [];

  doc.querySelectorAll<HTMLElement>(`${TEXT_LIKE}, textarea, select`).forEach((el) => {
    if (isUsable(el)) refs.push({ el, kind: el.tagName === "SELECT" ? "select" : "text" });
  });

  // One entry per radio group.
  const seen = new Set<string>();
  doc.querySelectorAll<HTMLInputElement>('input[type="radio"]').forEach((r) => {
    if (!r.name || r.disabled || seen.has(r.name)) return;
    seen.add(r.name);
    refs.push({ el: r, kind: "radio" });
  });

  // File inputs are often visually hidden, so no visibility check.
  doc.querySelectorAll<HTMLInputElement>('input[type="file"]').forEach((el) => {
    if (!el.disabled) refs.push({ el, kind: "file" });
  });
  return refs;
}

export const generic: Adapter = {
  name: "generic",
  matches: () => true,
  collect: collectGeneric,
};
