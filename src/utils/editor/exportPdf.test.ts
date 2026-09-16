import { describe, expect, it } from 'vitest'
import { PDFDocument, StandardFonts } from 'pdf-lib'
import { displayPlacementToPdf, wrapText } from './exportPdf'
import { TextObject } from './types'

const object: TextObject = {
  id: 'text', type: 'text', text: 'A line that should wrap',
  x: .1, y: .2, width: .5, height: .2, rotation: 0, opacity: 1, zIndex: 1,
  scope: { kind: 'single', pageIndex: 0 }, fontFamily: 'helvetica', fontStyle: 'regular',
  fontSize: 12, color: '#000000', alignment: 'left', lineHeight: 1.2,
}

describe('PDF editor export helpers', () => {
  it('maps normalized top-left coordinates into PDF bottom-left coordinates', async () => {
    const document = await PDFDocument.create()
    const page = document.addPage([600, 800])
    expect(displayPlacementToPdf(object, page)).toMatchObject({ x: 60, y: 480, width: 300, height: 160, rotation: 0 })
  })

  it('wraps text within the requested width', async () => {
    const document = await PDFDocument.create()
    const font = await document.embedFont(StandardFonts.Helvetica)
    const lines = wrapText('one two three four', font, 12, 45)
    expect(lines.length).toBeGreaterThan(1)
    lines.forEach((line) => expect(font.widthOfTextAtSize(line, 12)).toBeLessThanOrEqual(45))
  })
})

