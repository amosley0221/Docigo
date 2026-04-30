export type LocationKind = 'work' | 'school' | 'personal' | 'project' | 'custom';

export interface LocationT {
  id: string;
  name: string;
  kind: LocationKind;
  color: string;
  createdAt: number;
}

export interface GroupT {
  id: string;
  locationId: string;
  name: string;
  createdAt: number;
}

export type ItemKind =
  | 'spreadsheet'
  | 'document'
  | 'pdf'
  | 'image'
  | 'text'
  | 'quote'
  | 'unknown';

export interface BaseItem {
  id: string;
  groupId: string;
  locationId: string;
  name: string;
  kind: ItemKind;
  createdAt: number;
  updatedAt: number;
}

export interface FileItem extends BaseItem {
  kind: Exclude<ItemKind, 'quote'>;
  mime: string;
  size: number;
  /** Stored in IndexedDB blob store, keyed by id */
  blobKey: string;
  /** Cached parsed payload for quick render. Optional; can be re-derived. */
  cache?: unknown;
}

export interface QuoteItem extends BaseItem {
  kind: 'quote';
  text: string;
  source?: string;
}

export type Item = FileItem | QuoteItem;
