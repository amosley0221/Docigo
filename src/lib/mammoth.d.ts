declare module 'mammoth/mammoth.browser.js' {
  interface ConvertOptions {
    arrayBuffer: ArrayBuffer;
  }
  interface ConvertResult {
    value: string;
    messages: unknown[];
  }
  export function convertToHtml(options: ConvertOptions): Promise<ConvertResult>;
  export function extractRawText(options: ConvertOptions): Promise<ConvertResult>;
}
