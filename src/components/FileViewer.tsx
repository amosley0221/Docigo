import type { Item } from '../lib/types';
import { SpreadsheetViewer } from '../viewers/SpreadsheetViewer';
import { DocumentViewer } from '../viewers/DocumentViewer';
import { PdfViewer } from '../viewers/PdfViewer';
import { ImageViewer } from '../viewers/ImageViewer';
import { TextViewer } from '../viewers/TextViewer';
import { QuoteViewer } from '../viewers/QuoteViewer';
import { UnknownViewer } from '../viewers/UnknownViewer';

export function FileViewer({ item }: { item: Item }) {
  if (item.kind === 'quote') return <QuoteViewer item={item} />;
  switch (item.kind) {
    case 'spreadsheet':
      return <SpreadsheetViewer item={item} />;
    case 'document':
      return <DocumentViewer item={item} />;
    case 'pdf':
      return <PdfViewer item={item} />;
    case 'image':
      return <ImageViewer item={item} />;
    case 'text':
      return <TextViewer item={item} />;
    default:
      return <UnknownViewer item={item} />;
  }
}
