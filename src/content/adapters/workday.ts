import type { Adapter, FieldRef } from "./types";
import { collectGeneric } from "./generic";

/**
 * Workday renders most dropdowns as <button aria-haspopup="listbox"> with the
 * options in a portal. Text inputs carry stable data-automation-id values, which
 * the detector reads (see `ids` in detector.ts).
 *
 * Note: automation ids vary a little between tenants. If a field is missed,
 * inspect it, copy its data-automation-id, and add a pattern to RULES.
 */
export const workday: Adapter = {
  name: "workday",
  matches: (url) => /myworkday(jobs|site)\.com$|(^|\.)workday\.com$/.test(url.hostname),
  collect(doc) {
    const refs: FieldRef[] = collectGeneric(doc);
    doc.querySelectorAll<HTMLElement>('button[aria-haspopup="listbox"]').forEach((el) => {
      if (!(el as HTMLButtonElement).disabled) refs.push({ el, kind: "listbox" });
    });
    return refs;
  },
};
