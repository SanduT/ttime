/** Copies `text` to the clipboard (the webview's async clipboard; needs a click). */
export const copyText = (text: string): Promise<void> => navigator.clipboard.writeText(text);
