# Job Autofill

Chrome extension (Manifest V3, plain HTML + TypeScript) that fills job application forms on Workday and most other career sites from a profile stored only in your browser.

## Run it

```bash
npm install
npm run build        # outputs dist/
```

1. Open `chrome://extensions`, turn on **Developer mode**.
2. **Load unpacked** and pick the `dist/` folder.
3. The profile page opens on first install. Fill it in, add your resume, save.
4. On an application form, click the toolbar icon, then **Preview** (changes nothing) or **Fill this page**. `Alt+Shift+F` fills without opening the popup.

On multi-step forms (Workday), run it again on each step.

`npm run dev` rebuilds the scripts on change. Re-run `npm run build` after editing HTML, CSS or the manifest, then press reload on the extension card.

## How it works

| Part | File | Job |
| --- | --- | --- |
| Detector | `src/content/detector.ts` | Scores each field's label, `name`, `id`, `autocomplete`, placeholder and Workday `data-automation-id` against `RULES` |
| Filler | `src/content/filler.ts` | Sets values so React inputs notice (native setter + events), picks `<select>` options, clicks radios, drives Workday listboxes, attaches the resume |
| Adapters | `src/content/adapters/` | Say which fields a site has. `workday.ts` adds its custom dropdowns |
| Engine | `src/content/engine.ts` | Runs adapter, detector and filler; skips fields that already have a value; reports results |
| Popup / options | `src/popup/`, `src/options/` | Preview, fill, and edit the profile |

## Extending

- **A field isn't recognised:** inspect it, then add a pattern to `RULES` in `detector.ts` (label text, or its `data-automation-id` in `ids`).
- **A new profile field:** add it to `schema.ts`, `fields.ts` (for the form), and a rule.
- **Work history:** the profile page supports multiple saved roles, including company, location, dates, current-role status, and a description. These entries are stored/exported with the profile but are not currently filled into repeating job-site sections.
- **A site that needs special handling:** add `src/content/adapters/<site>.ts` and register it in `adapters/index.ts`.
- **Saved answers:** in the profile page, add a phrase (e.g. "why do you want") and an answer. Any field whose label contains the phrase gets that answer.

## Known limits

- Workday `data-automation-id` values and dropdown markup differ a little between tenants. They're best-effort; check each new tenant and patch `RULES` if something's missed.
- Search-style Workday pickers (skills, multi-select with typing) aren't handled.
- Repeating sections (several jobs or schools) only fill the first block for now.
- Fields that already contain a value are never overwritten.
- The extension never clicks Next or Submit. Review each step yourself.
- `host_permissions` is `<all_urls>` so it works on any career site. Narrow it before publishing to the Web Store.
- The profile, including the resume, is stored unencrypted in `chrome.storage.local` on your device.
- Some employers' terms restrict automated form filling; check before using it on a site that does.
