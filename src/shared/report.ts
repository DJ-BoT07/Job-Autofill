import type { TextKey } from "./schema";

export type FieldStatus = "filled" | "skipped" | "unmatched";

export interface FieldResult {
  label: string;
  key: TextKey | "resume" | "answer" | null;
  status: FieldStatus;
  /** Why a field was skipped. */
  reason?: string;
  value?: string;
}

export interface FillReport {
  site: string;
  adapter: string;
  dryRun: boolean;
  results: FieldResult[];
}
