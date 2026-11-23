import { ProfileSchema, emptyProfile, type Profile } from "./schema";

const KEY = "profile";

export async function loadProfile(): Promise<Profile> {
  const stored = await chrome.storage.local.get(KEY);
  const parsed = ProfileSchema.safeParse(stored[KEY] ?? {});
  return parsed.success ? parsed.data : emptyProfile();
}

export async function saveProfile(profile: Profile): Promise<void> {
  await chrome.storage.local.set({ [KEY]: ProfileSchema.parse(profile) });
}

export const isProfileEmpty = (p: Profile): boolean => !p.firstName && !p.email;
