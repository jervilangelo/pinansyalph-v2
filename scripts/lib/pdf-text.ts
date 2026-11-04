import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'

/** Extract plain text from a PDF, one line per text run that ends a line. */
export async function pdfToText(bytes: Uint8Array): Promise<string> {
  const doc = await getDocument({ data: bytes, useSystemFonts: false, isEvalSupported: false }).promise
  try {
    let out = ''
    for (let p = 1; p <= doc.numPages; p++) {
      const page = await doc.getPage(p)
      const content = await page.getTextContent()
      for (const item of content.items) {
        if ('str' in item) out += item.str + (item.hasEOL ? '\n' : '')
      }
      out += '\n'
    }
    return out
  } finally {
    await doc.cleanup()
  }
}
