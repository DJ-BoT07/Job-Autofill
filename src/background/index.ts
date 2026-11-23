import { runOnTab } from "../shared/run";

import { isProfileEmpty, loadProfile } from "../shared/storage";

// First install: open the profile page so there is something to fill with.
chrome.runtime.onInstalled.addListener(async ({ reason }) => {
  if (reason === "install") chrome.runtime.openOptionsPage();
});

// Alt+Shift+F: fill the active tab without opening the popup.
chrome.commands.onCommand.addListener(async (command) => {
  if (command !== "fill-page") return;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;

  const profile = await loadProfile();
  if (isProfileEmpty(profile)) {
    chrome.runtime.openOptionsPage();
    return;
  }

  let text = "!";
  try {
    const reports = await runOnTab(tab.id, false);
    const filled = reports.flatMap((r) => r.results).filter((r) => r.status === "filled").length;
    text = String(filled);
  } catch {
    // Browser-internal pages can't be scripted.
  }
  await chrome.action.setBadgeBackgroundColor({ tabId: tab.id, color: "#2646ff" });
  await chrome.action.setBadgeText({ tabId: tab.id, text });
  setTimeout(() => chrome.action.setBadgeText({ tabId: tab.id!, text: "" }), 4000);
});
