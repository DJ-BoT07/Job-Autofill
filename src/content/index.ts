import { resolveProfile } from "../shared/schema";
import { loadProfile } from "../shared/storage";
import type { FillReport } from "../shared/report";
import { fillPage } from "./engine";

declare global {
  interface Window {
    __jobAutofill?: { run(opts: { dryRun: boolean }): Promise<FillReport> };
  }
}

// Nothing happens until the popup or the keyboard shortcut calls run().
window.__jobAutofill = {
  async run({ dryRun }) {
    const profile = resolveProfile(await loadProfile());
    return fillPage(document, profile, { dryRun });
  },
};
