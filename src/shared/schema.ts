import { z } from "zod";

const text = () => z.string().default("");

export const ProfileSchema = z.object({
  firstName: text(),
  middleName: text(),
  lastName: text(),
  fullName: text(), // derived from first + last when empty
  email: text(),
  phone: text(),
  phoneCountryCode: text(),

  addressLine1: text(),
  city: text(),
  state: text(),
  postalCode: text(),
  country: text(),

  linkedin: text(),
  github: text(),
  portfolio: text(),

  currentCompany: text(),
  currentTitle: text(),
  yearsExperience: text(),
  noticePeriod: text(),
  currentCtc: text(),
  expectedCtc: text(),
  workExperience: z
    .array(
      z.object({
        jobTitle: text(),
        company: text(),
        location: text(),
        currentlyWorking: z.boolean().default(false),
        from: text(),
        to: text(),
        description: text(),
      }),
    )
    .default([]),

  school: text(),
  degree: text(),
  fieldOfStudy: text(),
  gpa: text(),
  graduationYear: text(),

  workAuthorized: text(), // "Yes" | "No" | ""
  needsSponsorship: text(), // "Yes" | "No" | ""

  coverLetter: text(),

  resume: z
    .object({ name: z.string(), type: z.string(), dataUrl: z.string() })
    .nullable()
    .default(null),

  // Reusable answers to custom questions. `question` matches when the field's
  // label contains that text (case-insensitive).
  answers: z.array(z.object({ question: z.string(), answer: z.string() })).default([]),
});

export type Profile = z.infer<typeof ProfileSchema>;
export type TextKey = Exclude<keyof Profile, "resume" | "answers" | "workExperience">;

export function emptyProfile(): Profile {
  return ProfileSchema.parse({});
}

export function resolveProfile(p: Profile): Profile {
  return {
    ...p,
    fullName: p.fullName || [p.firstName, p.lastName].filter(Boolean).join(" "),
  };
}
