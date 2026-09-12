// A missing clipboard API must fail, not resolve as a successful copy.
export async function copyDocumentText(text, clipboard = globalThis.navigator?.clipboard) {
  if (typeof clipboard?.writeText !== 'function') {
    throw new Error('Clipboard writing is unavailable in this browser.');
  }
  await clipboard.writeText(text);
}
