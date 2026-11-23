import type { TextKey } from "../shared/schema";

export type FieldKey = TextKey;

export interface Signals {
  /** Visible label / question text, lowercased. */
  label: string;
  name: string;
  id: string;
  placeholder: string;
  autocomplete: string;
  /** Raw lowercased data-automation-id (Workday). */
  automationId: string;
  type: string;
}

const clean = (s: string) =>
  s.toLowerCase().replace(/\*/g, " ").replace(/\brequired\b/g, " ").replace(/\s+/g, " ").trim();

/** "first_name" / "firstName" / "first-name" -> "first name" */
const words = (s: string) =>
  clean(s.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/[_\-.[\]]+/g, " "));

function groupLabel(el: HTMLElement): string {
  const group =
    el.closest("fieldset, [role='radiogroup'], [role='group']") ?? el.parentElement?.parentElement;
  const legend = group?.querySelector("legend");
  return clean((legend ?? group)?.textContent?.slice(0, 300) ?? "");
}

export function getLabel(el: HTMLElement): string {
  const doc = el.ownerDocument;
  const parts: string[] = [];

  if (el.id) {
    for (const l of Array.from(doc.querySelectorAll("label"))) {
      if (l.htmlFor === el.id) parts.push(l.textContent ?? "");
    }
  }
  const labelledBy = el.getAttribute("aria-labelledby");
  if (labelledBy) {
    for (const id of labelledBy.split(/\s+/)) {
      const node = doc.getElementById(id);
      if (node) parts.push(node.textContent ?? "");
    }
  }
  const aria = el.getAttribute("aria-label");
  if (aria) parts.push(aria);
  const wrapping = el.closest("label");
  if (wrapping) parts.push(wrapping.textContent ?? "");

  if (parts.length === 0) {
    const container = el.closest(
      "[data-automation-id^='formField'], .field, .form-group, .form-field, fieldset, [role='group']",
    );
    const l = container?.querySelector("label, legend");
    if (l) parts.push(l.textContent ?? "");
  }
  return clean(parts.join(" "));
}

export function getSignals(el: HTMLElement): Signals {
  const input = el as HTMLInputElement;
  const isRadio = input.type === "radio";
  const ac = (el.getAttribute("autocomplete") ?? "").toLowerCase().split(/\s+/).pop() ?? "";
  return {
    label: isRadio ? groupLabel(el) : getLabel(el),
    name: words(input.name ?? ""),
    id: words(el.id ?? ""),
    placeholder: clean(el.getAttribute("placeholder") ?? ""),
    autocomplete: ac,
    automationId: (el.getAttribute("data-automation-id") ?? "").toLowerCase(),
    type: (input.type ?? "").toLowerCase(),
  };
}

interface Rule {
  key: FieldKey;
  /** Exact autocomplete tokens. */
  autocomplete?: string[];
  /** Matches against data-automation-id (lowercased, unsplit). */
  ids?: RegExp[];
  /** Matches against an <input type=…>. */
  types?: string[];
  /** Matches against label / placeholder / name / id (lowercased words). */
  text?: RegExp[];
  /** Text that disqualifies the text match. */
  not?: RegExp;
}

// Order matters: on equal score the earlier (more specific) rule wins.
export const RULES: Rule[] = [
  { key: "firstName", autocomplete: ["given-name"], ids: [/firstname/], text: [/\bfirst\s*name\b/, /\bgiven\s*name\b/, /\bfname\b/] },
  { key: "middleName", autocomplete: ["additional-name"], ids: [/middlename/], text: [/\bmiddle\s*name\b/] },
  { key: "lastName", autocomplete: ["family-name"], ids: [/lastname|familyname/], text: [/\blast\s*name\b/, /\bfamily\s*name\b/, /\bsurname\b/, /\blname\b/] },
  { key: "fullName", autocomplete: ["name"], text: [/^(your |full |legal |preferred )?name$/, /\bfull\s*name\b/] },
  { key: "email", autocomplete: ["email"], types: ["email"], ids: [/^email/], text: [/e-?mail/] },
  { key: "phoneCountryCode", ids: [/country-?phone-?code/], text: [/country\s*(phone\s*)?code/, /phone\s*code/, /dial\s*code/] },
  { key: "phone", autocomplete: ["tel", "tel-national"], types: ["tel"], ids: [/phone-?number/], text: [/\bphone\b/, /\bmobile\b/, /contact\s*number/], not: /extension|device|type|code/ },
  { key: "addressLine1", autocomplete: ["address-line1", "street-address"], ids: [/addressline1/], text: [/address\s*(line)?\s*1/, /\bstreet\b/, /^address$/] },
  { key: "city", autocomplete: ["address-level2"], ids: [/(^|_)city$/], text: [/\bcity\b/, /\btown\b/] },
  { key: "state", autocomplete: ["address-level1"], ids: [/countryregion/], text: [/\bstate\b/, /\bprovince\b/, /\bregion\b/], not: /country/ },
  { key: "postalCode", autocomplete: ["postal-code"], ids: [/postalcode/], text: [/\bzip\b/, /postal/, /pin\s*code/] },
  { key: "country", autocomplete: ["country", "country-name"], ids: [/countrydropdown/], text: [/\bcountry\b/], not: /code|phone|region/ },
  { key: "linkedin", ids: [/linkedin/], text: [/linkedin/] },
  { key: "github", ids: [/github/], text: [/github/] },
  { key: "portfolio", ids: [/website|portfolio/], types: [], text: [/portfolio/, /personal\s*(web)?site/, /\bwebsite\b/, /other\s*(web\s*)?(link|url)/] },
  { key: "currentCompany", text: [/current\s*(company|employer|organi[sz]ation)/, /most\s*recent\s*(company|employer)/] },
  { key: "currentTitle", text: [/current\s*(job\s*)?(title|role|position)/, /\bjob\s*title\b/] },
  { key: "yearsExperience", text: [/years?\s*of\s*(total\s*|relevant\s*|professional\s*|work\s*)?experience/, /total\s*experience/] },
  { key: "noticePeriod", text: [/notice\s*period/] },
  { key: "currentCtc", text: [/current\s*(ctc|salary|compensation)/] },
  { key: "expectedCtc", text: [/expected\s*(ctc|salary|compensation)/, /salary\s*expectation/] },
  { key: "school", ids: [/school/], text: [/\bschool\b/, /\buniversity\b/, /\bcollege\b/, /\binstitution\b/] },
  { key: "fieldOfStudy", ids: [/fieldofstudy/], text: [/field\s*of\s*study/, /\bmajor\b/, /discipline/, /speciali[sz]ation/] },
  { key: "degree", ids: [/degree/], text: [/\bdegree\b/] },
  { key: "gpa", text: [/\bgpa\b/, /\bcgpa\b/, /grade\s*average/, /overall\s*result/] },
  { key: "graduationYear", text: [/graduation\s*(year|date)/, /year\s*of\s*(graduation|passing)/] },
  { key: "workAuthorized", text: [/authori[sz]ed\s*to\s*work/, /legally\s*(authori[sz]ed|eligible)/, /work\s*authori[sz]ation/, /right\s*to\s*work/] },
  { key: "needsSponsorship", text: [/sponsorship/, /require.*visa/] },
  { key: "coverLetter", text: [/cover\s*letter/] },
];

export interface Match {
  key: FieldKey;
  score: number;
}

const MIN_SCORE = 55;

export function classify(s: Signals): Match | null {
  let best: Match | null = null;

  for (const rule of RULES) {
    let score = 0;
    if (s.autocomplete && rule.autocomplete?.includes(s.autocomplete)) score = Math.max(score, 100);
    if (s.automationId && rule.ids?.some((re) => re.test(s.automationId))) score = Math.max(score, 90);
    if (s.type && rule.types?.includes(s.type)) score = Math.max(score, 80);

    const hits = (t: string) =>
      !!t && !!rule.text?.some((re) => re.test(t)) && !(rule.not && rule.not.test(t));
    if (hits(s.label)) score = Math.max(score, 70);
    if (hits(s.name) || hits(s.id) || hits(s.placeholder)) score = Math.max(score, 55);

    if (score > 0 && (!best || score > best.score)) best = { key: rule.key, score };
  }
  return best && best.score >= MIN_SCORE ? best : null;
}
