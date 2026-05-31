import { DOMParser, XMLSerializer } from "@xmldom/xmldom";

// Minimal structural typing over @xmldom/xmldom's DOM. The library ships its DOM
// node types as `any`, so we describe just the surface we use to keep the engine
// type-safe without `any`. One cast happens at the parse boundary.

export const ELEMENT_NODE = 1;
export const TEXT_NODE = 3;

export interface XmlNodeList {
  readonly length: number;
  item(index: number): XmlNode | null;
  [index: number]: XmlNode;
}

export interface XmlElementList {
  readonly length: number;
  item(index: number): XmlElement | null;
  [index: number]: XmlElement;
}

export interface XmlNode {
  readonly nodeType: number;
  readonly nodeName: string;
  parentNode: XmlElement | null;
  readonly childNodes: XmlNodeList;
  readonly firstChild: XmlNode | null;
  readonly nextSibling: XmlNode | null;
  readonly previousSibling: XmlNode | null;
  textContent: string | null;
  cloneNode(deep: boolean): XmlNode;
}

export interface XmlElement extends XmlNode {
  readonly tagName: string;
  getAttribute(name: string): string | null;
  setAttribute(name: string, value: string): void;
  removeAttribute(name: string): void;
  hasAttribute(name: string): boolean;
  getElementsByTagName(name: string): XmlElementList;
  appendChild(node: XmlNode): XmlNode;
  insertBefore(node: XmlNode, ref: XmlNode | null): XmlNode;
  removeChild(node: XmlNode): XmlNode;
  replaceChild(newChild: XmlNode, oldChild: XmlNode): XmlNode;
}

export interface XmlDocument extends XmlNode {
  readonly documentElement: XmlElement;
  createElement(tagName: string): XmlElement;
  createTextNode(data: string): XmlNode;
  getElementsByTagName(name: string): XmlElementList;
}

export function parseXml(xml: string): XmlDocument {
  return new DOMParser().parseFromString(xml, "text/xml") as unknown as XmlDocument;
}

export function serializeXml(doc: XmlDocument): string {
  const serializer = new XMLSerializer();
  return serializer.serializeToString(
    doc as unknown as Parameters<XMLSerializer["serializeToString"]>[0],
  );
}

export function isElement(node: XmlNode | null): node is XmlElement {
  return node != null && node.nodeType === ELEMENT_NODE;
}

export function directChildren(parent: XmlElement, tag: string): XmlElement[] {
  const out: XmlElement[] = [];
  const kids = parent.childNodes;
  for (let i = 0; i < kids.length; i += 1) {
    const n = kids[i];
    if (n.nodeType === ELEMENT_NODE && n.nodeName === tag) out.push(n as XmlElement);
  }
  return out;
}

export function firstChild(parent: XmlElement, tag: string): XmlElement | null {
  const kids = parent.childNodes;
  for (let i = 0; i < kids.length; i += 1) {
    const n = kids[i];
    if (n.nodeType === ELEMENT_NODE && n.nodeName === tag) return n as XmlElement;
  }
  return null;
}

export function elementsByTag(
  root: XmlElement | XmlDocument,
  tag: string,
): XmlElement[] {
  const list = root.getElementsByTagName(tag);
  const out: XmlElement[] = [];
  for (let i = 0; i < list.length; i += 1) {
    const e = list.item(i);
    if (e) out.push(e);
  }
  return out;
}

// Highest existing revision id across <w:ins>/<w:del> so new revisions never
// collide with revisions already present in the original document.
export function maxRevisionId(doc: XmlDocument): number {
  let max = 0;
  for (const tag of ["w:ins", "w:del"]) {
    for (const el of elementsByTag(doc, tag)) {
      const id = Number.parseInt(el.getAttribute("w:id") ?? "", 10);
      if (Number.isFinite(id) && id > max) max = id;
    }
  }
  return max;
}

export interface IdAllocator {
  next(): number;
}

export function createIdAllocator(start: number): IdAllocator {
  let n = start;
  return { next: () => n++ };
}

// Set a <w:t>/<w:delText> text node, preserving significant edge whitespace.
export function setWordText(textEl: XmlElement, text: string): void {
  textEl.textContent = text;
  if (text !== text.trim() || text.length === 0) {
    textEl.setAttribute("xml:space", "preserve");
  }
}
