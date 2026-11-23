export type FieldKind = "text" | "select" | "radio" | "file" | "listbox";

export interface FieldRef {
  el: HTMLElement;
  kind: FieldKind;
}

/** A site adapter says which fields exist on a page. Filling is shared. */
export interface Adapter {
  name: string;
  matches(url: URL): boolean;
  collect(doc: Document): FieldRef[];
}
