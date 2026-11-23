import type { TextKey } from "./schema";

export interface FieldDef {
  key: TextKey;
  label: string;
  type?: "text" | "email" | "tel" | "url" | "textarea" | "yesno";
  placeholder?: string;
  wide?: boolean;
}

export const FIELD_GROUPS: { title: string; hint?: string; fields: FieldDef[] }[] = [
  {
    title: "Contact",
    fields: [
      { key: "firstName", label: "First name" },
      { key: "middleName", label: "Middle name" },
      { key: "lastName", label: "Last name" },
      { key: "email", label: "Email", type: "email" },
      { key: "phoneCountryCode", label: "Phone country code", placeholder: "+91" },
      { key: "phone", label: "Phone number", type: "tel", placeholder: "Without country code" },
    ],
  },
  {
    title: "Location",
    fields: [
      { key: "addressLine1", label: "Address line 1", wide: true },
      { key: "city", label: "City" },
      { key: "state", label: "State / region" },
      { key: "postalCode", label: "Postal code" },
      { key: "country", label: "Country", placeholder: "India" },
    ],
  },
  {
    title: "Links",
    fields: [
      { key: "linkedin", label: "LinkedIn", type: "url" },
      { key: "github", label: "GitHub", type: "url" },
      { key: "portfolio", label: "Website / portfolio", type: "url" },
    ],
  },
  {
    title: "Work",
    fields: [
      { key: "currentCompany", label: "Current company" },
      { key: "currentTitle", label: "Current job title" },
      { key: "yearsExperience", label: "Years of experience" },
      { key: "noticePeriod", label: "Notice period", placeholder: "e.g. Immediate" },
      { key: "currentCtc", label: "Current CTC" },
      { key: "expectedCtc", label: "Expected CTC" },
    ],
  },
  {
    title: "Education",
    fields: [
      { key: "school", label: "School / university", wide: true },
      { key: "degree", label: "Degree" },
      { key: "fieldOfStudy", label: "Field of study" },
      { key: "gpa", label: "GPA / CGPA" },
      { key: "graduationYear", label: "Graduation year" },
    ],
  },
  {
    title: "Eligibility",
    fields: [
      { key: "workAuthorized", label: "Authorized to work in the job's country?", type: "yesno" },
      { key: "needsSponsorship", label: "Needs visa sponsorship?", type: "yesno" },
    ],
  },
  {
    title: "Cover letter",
    hint: "Used for cover-letter text boxes only.",
    fields: [{ key: "coverLetter", label: "Cover letter text", type: "textarea", wide: true }],
  },
];
