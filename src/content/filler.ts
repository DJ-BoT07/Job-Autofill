const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();

type ValueEl = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

/**
 * Sets a value the way a user would, so React/Angular-controlled inputs (Workday)
 * notice it. Assigning `.value` directly is ignored by React's change tracking, so
 * we call the native prototype setter and then dispatch the events frameworks watch.
 */
export function setNativeValue(el: ValueEl, value: string): void {
  el.focus?.();
  const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), "value")?.set;
  if (setter) setter.call(el, value);
  else el.value = value;

  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
  el.dispatchEvent(new FocusEvent("blur"));
  el.dispatchEvent(new FocusEvent("focusout", { bubbles: true }));
}

/** Index of the option that best matches `wanted`, or -1. */
export function bestMatch(options: { text: string; value?: string }[], wanted: string): number {
  const w = norm(wanted);
  if (!w) return -1;
  const texts = options.map((o) => norm(o.text));
  const values = options.map((o) => norm(o.value ?? ""));

  let i = texts.findIndex((t, n) => t === w || values[n] === w);
  if (i >= 0) return i;
  i = texts.findIndex((t) => t.startsWith(w) || (t.length > 1 && w.startsWith(t)));
  if (i >= 0) return i;
  i = texts.findIndex((t) => t.length > 1 && (t.includes(w) || w.includes(t)));
  return i;
}

export function selectOption(select: HTMLSelectElement, wanted: string): boolean {
  const options = Array.from(select.options).map((o) => ({ text: o.text, value: o.value }));
  const i = bestMatch(options, wanted);
  if (i < 0) return false;
  setNativeValue(select, select.options[i]!.value);
  return true;
}

export function radiosOf(radio: HTMLInputElement): HTMLInputElement[] {
  return Array.from(radio.ownerDocument.querySelectorAll<HTMLInputElement>('input[type="radio"]')).filter(
    (r) => r.name === radio.name,
  );
}

function radioText(r: HTMLInputElement): string {
  const doc = r.ownerDocument;
  const byFor = Array.from(doc.querySelectorAll("label")).find((l) => l.htmlFor === r.id && r.id);
  return (byFor ?? r.closest("label"))?.textContent ?? r.value;
}

export function clickRadio(group: HTMLInputElement[], wanted: string): boolean {
  const i = bestMatch(group.map((r) => ({ text: radioText(r), value: r.value })), wanted);
  if (i < 0) return false;
  realClick(group[i]!);
  return true;
}

/** pointer + mouse + click sequence, for widgets that ignore a bare click(). */
export function realClick(el: HTMLElement): void {
  for (const type of ["pointerdown", "mousedown", "pointerup", "mouseup"]) {
    el.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true }));
  }
  el.click();
}

export function waitFor<T>(fn: () => T | null | undefined, timeoutMs = 1500, stepMs = 50): Promise<T | null> {
  return new Promise((resolve) => {
    const start = Date.now();
    const tick = () => {
      const v = fn();
      if (v) return resolve(v);
      if (Date.now() - start >= timeoutMs) return resolve(null);
      setTimeout(tick, stepMs);
    };
    tick();
  });
}

/** Custom dropdowns (Workday): open the trigger, pick the matching option. */
export async function pickFromListbox(trigger: HTMLElement, wanted: string): Promise<boolean> {
  const doc = trigger.ownerDocument;
  realClick(trigger);
  const list = await waitFor(() => doc.querySelector<HTMLElement>('[role="listbox"]'));
  if (!list) return false;

  const options = Array.from(
    list.querySelectorAll<HTMLElement>('[role="option"], [data-automation-id="promptOption"]'),
  );
  const i = bestMatch(options.map((o) => ({ text: o.textContent ?? "" })), wanted);
  if (i < 0) {
    trigger.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    return false;
  }
  realClick(options[i]!);
  return true;
}

export function dataUrlToFile(r: { name: string; type: string; dataUrl: string }): File {
  const b64 = r.dataUrl.split(",")[1] ?? "";
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new File([bytes], r.name, { type: r.type });
}

export function attachFile(input: HTMLInputElement, resume: { name: string; type: string; dataUrl: string }): boolean {
  try {
    const dt = new DataTransfer();
    dt.items.add(dataUrlToFile(resume));
    input.files = dt.files;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  } catch {
    return false;
  }
}

/** Brief outline so the user can see what was touched. */
export function flash(el: HTMLElement): void {
  const prev = el.style.outline;
  el.style.outline = "2px solid #2646ff";
  setTimeout(() => (el.style.outline = prev), 2500);
}
