import { FIELD_GROUPS, type FieldDef } from "../shared/fields";
import { ProfileSchema, type Profile, type TextKey } from "../shared/schema";
import { loadProfile, saveProfile } from "../shared/storage";

const MAX_RESUME_BYTES = 4 * 1024 * 1024;

type Attrs = Record<string, string | boolean | undefined>;
function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Attrs = {},
  ...kids: (Node | string)[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === false) continue;
    if (k === "class") el.className = String(v);
    else if (v === true) el.setAttribute(k, "");
    else el.setAttribute(k, v);
  }
  el.append(...kids);
  return el;
}

const form = document.getElementById("form") as HTMLFormElement;
const statusEl = document.getElementById("status") as HTMLElement;
let profile: Profile;
let resume: Profile["resume"] = null;
const experienceBox = h("div", { class: "experiences" });

function toast(msg: string) {
  statusEl.textContent = msg;
  setTimeout(() => (statusEl.textContent = ""), 2500);
}

function control(f: FieldDef): HTMLElement {
  const common = { name: f.key, placeholder: f.placeholder };
  if (f.type === "textarea") return h("textarea", { ...common, rows: "6" });
  if (f.type === "yesno") {
    const sel = h("select", { name: f.key });
    for (const v of ["", "Yes", "No"]) sel.append(h("option", { value: v }, v || "Not set"));
    return sel;
  }
  return h("input", { ...common, type: f.type ?? "text" });
}

function renderFields() {
  for (const group of FIELD_GROUPS) {
    const grid = h("div", { class: "grid" });
    for (const f of group.fields) {
      const c = control(f) as HTMLInputElement;
      c.value = profile[f.key];
      grid.append(h("label", { class: f.wide ? "field wide" : "field" }, h("span", {}, f.label), c));
    }
    form.append(
      h(
        "section",
        { class: "group" },
        h("h2", {}, group.title),
        ...(group.hint ? [h("p", { class: "hint" }, group.hint)] : []),
        grid,
      ),
    );
  }
}

function addExperienceRow(entry: Profile["workExperience"][number] = {
  jobTitle: "",
  company: "",
  location: "",
  currentlyWorking: false,
  from: "",
  to: "",
  description: "",
}) {
  const card = h("article", { class: "experience-card" });
  const title = h("h3", {}, "");
  const remove = h("button", { class: "btn small", type: "button" }, "Delete");
  const heading = h("div", { class: "experience-head" }, title, remove);
  const grid = h("div", { class: "grid" });
  const dates = h("div", { class: "grid" });

  const addField = (label: string, name: string, value: string, type = "text", wide = false) => {
    const input = h("input", { type, name, value });
    grid.append(h("label", { class: wide ? "field wide" : "field" }, h("span", {}, label), input));
    return input;
  };

  addField("Job title *", "jobTitle", entry.jobTitle);
  addField("Company *", "company", entry.company);
  addField("Location", "location", entry.location);

  const currentlyWorking = h("input", { type: "checkbox", name: "currentlyWorking" });
  currentlyWorking.checked = entry.currentlyWorking;
  const currentLabel = h("label", { class: "current-role" }, currentlyWorking, "I currently work here");
  const addDateField = (label: string, name: string, value: string) => {
    const input = h("input", { type: "month", name, value });
    dates.append(h("label", { class: "field" }, h("span", {}, label), input));
    return input;
  };
  addDateField("From *", "from", entry.from);
  const toInput = addDateField("To *", "to", entry.to);
  toInput.disabled = entry.currentlyWorking;
  currentlyWorking.addEventListener("change", () => {
    toInput.disabled = currentlyWorking.checked;
    if (currentlyWorking.checked) toInput.value = "";
  });

  const description = h("textarea", { name: "description", rows: "5" });
  description.value = entry.description;
  const descriptionField = h("label", { class: "field wide" }, h("span", {}, "Role description"), description);

  card.append(heading, grid, currentLabel, dates, descriptionField);
  remove.setAttribute("aria-label", "Delete work experience");
  remove.addEventListener("click", () => {
    card.remove();
    updateExperienceTitles();
  });
  experienceBox.append(card);
  updateExperienceTitles();
}

function updateExperienceTitles() {
  experienceBox.querySelectorAll<HTMLElement>(".experience-card h3").forEach((heading, index) => {
    heading.textContent = `Work Experience ${index + 1}`;
    const remove = heading.parentElement?.querySelector("button");
    remove?.setAttribute("aria-label", `Delete work experience ${index + 1}`);
  });
}

function renderWorkExperience() {
  profile.workExperience.forEach((entry) => addExperienceRow(entry));
  if (profile.workExperience.length === 0) addExperienceRow();
  const add = h("button", { class: "btn small", type: "button" }, "Add Another");
  add.addEventListener("click", () => addExperienceRow());
  form.append(
    h(
      "section",
      { class: "group" },
      h("h2", {}, "Work Experience"),
      h("p", { class: "hint" }, "Save multiple roles to reuse in your profile."),
      experienceBox,
      add,
    ),
  );
}

function renderResume() {
  const current = h("span", { class: "current" }, resume ? resume.name : "No resume saved");
  const remove = h("button", { class: "btn small", type: "button" }, "Remove");
  remove.hidden = !resume;
  const input = h("input", { type: "file", accept: ".pdf,.doc,.docx,application/pdf", hidden: true });

  remove.addEventListener("click", () => {
    resume = null;
    current.textContent = "No resume saved";
    remove.hidden = true;
  });
  input.addEventListener("change", () => {
    const file = input.files?.[0];
    if (!file) return;
    if (file.size > MAX_RESUME_BYTES) return toast("Resume is over 4 MB. Use a smaller file.");
    const reader = new FileReader();
    reader.onload = () => {
      resume = { name: file.name, type: file.type || "application/pdf", dataUrl: String(reader.result) };
      current.textContent = file.name;
      remove.hidden = false;
    };
    reader.readAsDataURL(file);
  });

  const pick = h("label", { class: "btn small file-btn" }, "Choose file", input);
  form.append(
    h(
      "section",
      { class: "group" },
      h("h2", {}, "Resume"),
      h("p", { class: "hint" }, "Attached to resume upload fields. PDF works best."),
      h("div", { class: "resume-row" }, current, pick, remove),
    ),
  );
}

const answersBox = h("div", { class: "answers" });
function addAnswerRow(question = "", answer = "") {
  const q = h("input", { class: "q", placeholder: "Label contains… e.g. why do you want to join", value: question });
  const a = h("textarea", { class: "a", rows: "3", placeholder: "Your answer" });
  a.value = answer;
  const del = h("button", { class: "btn small", type: "button" }, "Remove");
  const row = h("div", { class: "answer-row" }, q, a, del);
  del.addEventListener("click", () => row.remove());
  answersBox.append(row);
}

function renderAnswers() {
  profile.answers.forEach((x) => addAnswerRow(x.question, x.answer));
  const add = h("button", { class: "btn small", type: "button" }, "Add answer");
  add.addEventListener("click", () => addAnswerRow());
  form.append(
    h(
      "section",
      { class: "group" },
      h("h2", {}, "Saved answers"),
      h("p", { class: "hint" }, "Reuse answers to custom questions. A field gets the answer when its label contains the text in the first box."),
      answersBox,
      add,
    ),
  );
}

function collect(): Profile {
  const next: Profile = { ...profile, resume };
  const data = new FormData(form);
  for (const g of FIELD_GROUPS) {
    for (const f of g.fields) next[f.key as TextKey] = String(data.get(f.key) ?? "").trim();
  }
  next.workExperience = Array.from(experienceBox.querySelectorAll<HTMLElement>(".experience-card"))
    .map((card) => ({
      jobTitle: card.querySelector<HTMLInputElement>('input[name="jobTitle"]')!.value.trim(),
      company: card.querySelector<HTMLInputElement>('input[name="company"]')!.value.trim(),
      location: card.querySelector<HTMLInputElement>('input[name="location"]')!.value.trim(),
      currentlyWorking: card.querySelector<HTMLInputElement>('input[name="currentlyWorking"]')!.checked,
      from: card.querySelector<HTMLInputElement>('input[name="from"]')!.value,
      to: card.querySelector<HTMLInputElement>('input[name="to"]')!.value,
      description: card.querySelector<HTMLTextAreaElement>('textarea[name="description"]')!.value.trim(),
    }))
    .filter((entry) =>
      entry.jobTitle ||
      entry.company ||
      entry.location ||
      entry.currentlyWorking ||
      entry.from ||
      entry.to ||
      entry.description,
    );
  next.answers = Array.from(answersBox.querySelectorAll<HTMLElement>(".answer-row"))
    .map((row) => ({
      question: row.querySelector<HTMLInputElement>(".q")!.value.trim(),
      answer: row.querySelector<HTMLTextAreaElement>(".a")!.value.trim(),
    }))
    .filter((a) => a.question && a.answer);
  return next;
}

function render() {
  form.replaceChildren();
  experienceBox.replaceChildren();
  answersBox.replaceChildren();
  resume = profile.resume;
  renderFields();
  renderWorkExperience();
  renderResume();
  renderAnswers();
}

document.getElementById("save")!.addEventListener("click", async () => {
  profile = collect();
  await saveProfile(profile);
  toast("Saved");
});

document.getElementById("export")!.addEventListener("click", () => {
  const blob = new Blob([JSON.stringify({ ...collect(), resume: null }, null, 2)], { type: "application/json" });
  const a = h("a", { href: URL.createObjectURL(blob), download: "job-autofill-profile.json" });
  a.click();
  URL.revokeObjectURL(a.href);
});

document.getElementById("import")!.addEventListener("change", async (e) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  try {
    const parsed = ProfileSchema.parse(JSON.parse(await file.text()));
    profile = { ...parsed, resume: parsed.resume ?? resume };
    render();
    toast("Imported. Save to keep it.");
  } catch {
    toast("That file isn't a valid profile export.");
  }
});

loadProfile().then((p) => {
  profile = p;
  render();
});
