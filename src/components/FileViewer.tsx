import { Suspense, lazy } from 'react';
import type { Item } from '../lib/types';
import { ImageViewer } from '../viewers/ImageViewer';
import { TextViewer } from '../viewers/TextViewer';
import { QuoteViewer } from '../viewers/QuoteViewer';
import { UnknownViewer } from '../viewers/UnknownViewer';
import { PdfViewer } from '../viewers/PdfViewer';
import { ViewerLoading } from '../viewers/Status';

const SpreadsheetViewer = lazy(() =>
  import('../viewers/SpreadsheetViewer').then((m) => ({ default: m.SpreadsheetViewer })),
);
const DocumentViewer = lazy(() =>
  import('../viewers/DocumentViewer').then((m) => ({ default: m.DocumentViewer })),
);

export function FileViewer({ item }: { item: Item }) {
  if (item.kind === 'quote') return <QuoteViewer item={item} />;
  switch (item.kind) {
    case 'spreadsheet':
      return (
        <Suspense fallback={<ViewerLoading label="Loading spreadsheet engine…" />}>
          <SpreadsheetViewer item={item} />
        </Suspense>
      );
    case 'document':
      return (
        <Suspense fallback={<ViewerLoading label="Loading document engine…" />}>
          <DocumentViewer item={item} />
        </Suspense>
      );
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
