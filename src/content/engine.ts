import type { Profile } from "../shared/schema";
import type { FieldResult, FillReport } from "../shared/report";
import { pickAdapter } from "./adapters";
import type { FieldRef } from "./adapters/types";
import { classify, getSignals, type Signals } from "./detector";
import {
  attachFile,
  clickRadio,
  flash,
  pickFromListbox,
  radiosOf,
  selectOption,
  setNativeValue,
} from "./filler";

export interface FillOptions {
  dryRun: boolean;
  /** Fill passes. Extra passes catch fields that appear after earlier ones (e.g. state after country). */
  passes?: number;
  passDelayMs?: number;
}

const PLACEHOLDER_TEXT = /^(select one|select|choose|--.*--)?$/i;

export function findAnswer(answers: Profile["answers"], label: string): string {
  const l = label.toLowerCase();
  return answers.find((a) => a.question.trim() && l.includes(a.question.trim().toLowerCase()))?.answer ?? "";
}

function isFilled(ref: FieldRef): boolean {
  const el = ref.el as HTMLInputElement;
  switch (ref.kind) {
    case "radio":
      return radiosOf(el).some((r) => r.checked);
    case "listbox":
      return !PLACEHOLDER_TEXT.test((el.textContent ?? "").trim());
    case "file":
      return (el.files?.length ?? 0) > 0;
    default:
      return (el.value ?? "").trim() !== "";
  }
}

function isResumeInput(s: Signals, doc: Document): boolean {
  const text = `${s.label} ${s.name} ${s.id} ${s.automationId}`;
  if (/cover/.test(text)) return false;
  if (/resume|\bcv\b|curriculum|file-upload-input-ref/.test(text)) return true;
  return doc.querySelectorAll('input[type="file"]').length === 1;
}

async function fillRef(ref: FieldRef, value: string): Promise<boolean> {
  switch (ref.kind) {
    case "text":
      setNativeValue(ref.el as HTMLInputElement | HTMLTextAreaElement, value);
      return true;
    case "select":
      return selectOption(ref.el as HTMLSelectElement, value);
    case "radio":
      return clickRadio(radiosOf(ref.el as HTMLInputElement), value);
    case "listbox":
      return pickFromListbox(ref.el, value);
    default:
      return false;
  }
}

async function processField(
  ref: FieldRef,
  profile: Profile,
  opts: FillOptions,
  doc: Document,
): Promise<FieldResult | null> {
  const s = getSignals(ref.el);
  const label = s.label || s.placeholder || s.name || s.automationId;

  if (ref.kind === "file") {
    if (!isResumeInput(s, doc)) return null;
    const result = { label: "Resume", key: "resume" as const };
    if (!profile.resume) return { ...result, status: "skipped", reason: "No resume saved in your profile" };
    if (isFilled(ref)) return { ...result, status: "skipped", reason: "Already has a file" };
    if (opts.dryRun) return { ...result, status: "filled", value: profile.resume.name };
    return attachFile(ref.el as HTMLInputElement, profile.resume)
      ? { ...result, status: "filled", value: profile.resume.name }
      : { ...result, status: "skipped", reason: "Couldn't attach the file" };
  }

  const match = classify(s);
  let key: FieldResult["key"] = match?.key ?? null;
  const savedAnswer = findAnswer(profile.answers, s.label);
  let value = match ? profile[match.key] : "";

  const isCoverLetterOnNonTextarea = key === "coverLetter" && ref.el.tagName !== "TEXTAREA";
  if (isCoverLetterOnNonTextarea) value = "";
  if (!value && savedAnswer) {
    key = "answer";
    value = savedAnswer;
  }
  if (!value) {
    if (!label || isFilled(ref)) return null;
    return match
      ? { label, key, status: "skipped", reason: "Nothing saved for this in your profile" }
      : { label, key: null, status: "unmatched" };
  }
  if (isFilled(ref)) return { label, key, status: "skipped", reason: "Already has a value" };
  if (opts.dryRun) return { label, key, status: "filled", value };

  const ok = await fillRef(ref, value);
  if (!ok) return { label, key, status: "skipped", reason: `No option matching “${value}”` };
  flash(ref.el);
  return { label, key, status: "filled", value };
}

export async function fillPage(
  doc: Document,
  profile: Profile,
  opts: FillOptions,
  url: URL = new URL(doc.location?.href ?? "about:blank"),
): Promise<FillReport> {
  const adapter = pickAdapter(url);
  const results = new Map<HTMLElement, FieldResult>();
  const passes = opts.dryRun ? 1 : (opts.passes ?? 2);

  for (let pass = 0; pass < passes; pass++) {
    if (pass > 0) await new Promise((r) => setTimeout(r, opts.passDelayMs ?? 500));
    for (const ref of adapter.collect(doc)) {
      const r = await processField(ref, profile, opts, doc);
      if (!r) continue;
      const prev = results.get(ref.el);
      if (prev?.status === "filled" && r.status !== "filled") continue; // keep earlier success
      results.set(ref.el, r);
    }
  }

  const order = { filled: 0, skipped: 1, unmatched: 2 } as const;
  return {
    site: url.hostname,
    adapter: adapter.name,
    dryRun: opts.dryRun,
    results: [...results.values()].sort((a, b) => order[a.status] - order[b.status]),
  };
}
