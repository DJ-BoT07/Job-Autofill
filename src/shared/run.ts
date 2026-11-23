import type { FillReport } from "./report";

/**
 * Runs the content script's filler in every frame of a tab and returns the
 * reports from frames that had anything to report.
 */
export async function runOnTab(tabId: number, dryRun: boolean): Promise<FillReport[]> {
  const frames = await chrome.scripting.executeScript({
    target: { tabId, allFrames: true },
    func: (dry: boolean) =>
      (window as unknown as { __jobAutofill?: { run(o: { dryRun: boolean }): Promise<unknown> } })
        .__jobAutofill?.run({ dryRun: dry }) ?? null,
    args: [dryRun],
  });
  return frames
    .map((f) => f.result as FillReport | null)
    .filter((r): r is FillReport => !!r && r.results.length > 0);
}
