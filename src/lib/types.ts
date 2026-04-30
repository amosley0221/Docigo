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
  | 'checklist'
  | 'chart'
  | 'unknown';

export type FileKind =
  | 'spreadsheet'
  | 'document'
  | 'pdf'
  | 'image'
  | 'text'
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
  kind: FileKind;
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

export interface ChecklistEntry {
  id: string;
  text: string;
  done: boolean;
}

export interface ChecklistItemT extends BaseItem {
  kind: 'checklist';
  entries: ChecklistEntry[];
}

export type ChartType = 'bar' | 'line' | 'pie';

export interface ChartDataPoint {
  id: string;
  label: string;
  value: number;
}

export interface ChartItemT extends BaseItem {
  kind: 'chart';
  chartType: ChartType;
  data: ChartDataPoint[];
  xLabel?: string;
  yLabel?: string;
}

export type Item = FileItem | QuoteItem | ChecklistItemT | ChartItemT;
