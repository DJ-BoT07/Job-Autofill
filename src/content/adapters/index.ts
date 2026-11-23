import type { Adapter } from "./types";
import { generic } from "./generic";
import { workday } from "./workday";

// Add new site adapters here; the first one that matches wins.
const ADAPTERS: Adapter[] = [workday];

export function pickAdapter(url: URL): Adapter {
  return ADAPTERS.find((a) => a.matches(url)) ?? generic;
}
