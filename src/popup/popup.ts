import type { FieldResult, FillReport } from "../shared/report";
import { runOnTab } from "../shared/run";
import { isProfileEmpty, loadProfile } from "../shared/storage";

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const hint = $("hint");
const summary = $("summary");
const list = $("results");
const fillBtn = $<HTMLButtonElement>("fill");
const previewBtn = $<HTMLButtonElement>("preview");

const MARK: Record<FieldResult["status"], string> = { filled: "✓", skipped: "–", unmatched: "?" };

function setBusy(busy: boolean) {
  fillBtn.disabled = previewBtn.disabled = busy;
}

function showHint(text: string | null) {
  hint.hidden = text === null;
  hint.textContent = text ?? "";
}

function render(reports: FillReport[], dryRun: boolean) {
  list.replaceChildren();
  const results = reports.flatMap((r) => r.results);
  const count = (s: FieldResult["status"]) => results.filter((r) => r.status === s).length;

  summary.hidden = false;
  if (results.length === 0) {
    summary.textContent = "No form fields found on this page. Open the application form and try again.";
    return;
  }
  const filled = count("filled");
  const adapter = reports[0]?.adapter === "workday" ? " (Workday)" : "";
  summary.textContent = dryRun
    ? `Would fill ${filled} field${filled === 1 ? "" : "s"}${adapter}. Nothing was changed.`
    : `Filled ${filled} field${filled === 1 ? "" : "s"}${adapter}. ${count("unmatched")} need${count("unmatched") === 1 ? "s" : ""} you.`;

  for (const r of results) {
    const li = document.createElement("li");
    li.className = `row ${r.status}`;

    const mark = document.createElement("span");
    mark.className = "mark";
    mark.textContent = MARK[r.status];

    const body = document.createElement("span");
    body.className = "body";
    const label = document.createElement("span");
    label.className = "label";
    label.textContent = r.label;
    const detail = document.createElement("span");
    detail.className = "detail";
    detail.textContent =
      r.status === "filled" ? (r.key === "resume" ? (r.value ?? "") : (r.value ?? "")) : (r.reason ?? "Not recognised, fill this one yourself");
    body.append(label, detail);

    li.append(mark, body);
    list.append(li);
  }
}

async function go(dryRun: boolean) {
  setBusy(true);
  showHint(null);
  summary.hidden = true;
  list.replaceChildren();
  try {
    const profile = await loadProfile();
    if (isProfileEmpty(profile)) {
      showHint("Your profile is empty. Add your details first, then come back.");
      return;
    }
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) throw new Error("no tab");
    render(await runOnTab(tab.id, dryRun), dryRun);
  } catch {
    showHint("This page can't be filled. Browser pages and the Web Store are off limits. Open the application form itself.");
  } finally {
    setBusy(false);
  }
}

fillBtn.addEventListener("click", () => go(false));
previewBtn.addEventListener("click", () => go(true));
$("open-options").addEventListener("click", (e) => {
  e.preventDefault();
  chrome.runtime.openOptionsPage();
});

loadProfile().then((p) => {
  if (isProfileEmpty(p)) showHint("Add your details once in Edit profile, then fill any application in one click.");
});
