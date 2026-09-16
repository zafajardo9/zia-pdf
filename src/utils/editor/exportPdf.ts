import {
  degrees,
  PDFDocument,
  PDFFont,
  PDFImage,
  PDFPage,
  rgb,
  StandardFonts,
} from 'pdf-lib'
import { appliesToPage, EditorAsset, EditorFontFamily, EditorFontStyle, EditorObject, EditorProjectV1, TextObject } from './types'

const fontNames: Record<EditorFontFamily, Record<EditorFontStyle, StandardFonts>> = {
  helvetica: {
    regular: StandardFonts.Helvetica,
    bold: StandardFonts.HelveticaBold,
    italic: StandardFonts.HelveticaOblique,
    boldItalic: StandardFonts.HelveticaBoldOblique,
  },
  times: {
    regular: StandardFonts.TimesRoman,
    bold: StandardFonts.TimesRomanBold,
    italic: StandardFonts.TimesRomanItalic,
    boldItalic: StandardFonts.TimesRomanBoldItalic,
  },
  courier: {
    regular: StandardFonts.Courier,
    bold: StandardFonts.CourierBold,
    italic: StandardFonts.CourierOblique,
    boldItalic: StandardFonts.CourierBoldOblique,
  },
}

export const hexToPdfColor = (hex: string) => {
  const normalized = /^#[0-9a-f]{6}$/i.test(hex) ? hex : '#111827'
  return rgb(
    parseInt(normalized.slice(1, 3), 16) / 255,
    parseInt(normalized.slice(3, 5), 16) / 255,
    parseInt(normalized.slice(5, 7), 16) / 255,
  )
}

export const wrapText = (text: string, font: PDFFont, fontSize: number, maxWidth: number) => {
  const lines: string[] = []
  for (const paragraph of text.split('\n')) {
    const words = paragraph.split(/\s+/).filter(Boolean)
    if (!words.length) {
      lines.push('')
      continue
    }
    let line = words[0]
    for (const word of words.slice(1)) {
      const candidate = `${line} ${word}`
      if (font.widthOfTextAtSize(candidate, fontSize) <= maxWidth) line = candidate
      else {
        lines.push(line)
        line = word
      }
    }
    lines.push(line)
  }
  return lines
}

interface PdfPlacement {
  x: number
  y: number
  width: number
  height: number
  rotation: number
}

export const displayPlacementToPdf = (object: EditorObject, page: PDFPage): PdfPlacement => {
  const { width, height } = page.getSize()
  const pageRotation = ((page.getRotation().angle % 360) + 360) % 360
  const displayWidth = pageRotation === 90 || pageRotation === 270 ? height : width
  const displayHeight = pageRotation === 90 || pageRotation === 270 ? width : height
  const dx = object.x * displayWidth
  const dy = object.y * displayHeight
  const dw = object.width * displayWidth
  const dh = object.height * displayHeight

  if (pageRotation === 90) {
    return { x: dy, y: dx, width: dh, height: dw, rotation: object.rotation - pageRotation }
  }
  if (pageRotation === 180) {
    return { x: width - dx - dw, y: height - dy - dh, width: dw, height: dh, rotation: object.rotation - pageRotation }
  }
  if (pageRotation === 270) {
    return { x: width - dy - dh, y: height - dx - dw, width: dh, height: dw, rotation: object.rotation - pageRotation }
  }
  return { x: dx, y: height - dy - dh, width: dw, height: dh, rotation: object.rotation }
}

const drawTextObject = (page: PDFPage, object: TextObject, font: PDFFont) => {
  const placement = displayPlacementToPdf(object, page)
  const lines = wrapText(object.text, font, object.fontSize, placement.width)
  const lineStep = object.fontSize * object.lineHeight
  const maxLines = Math.max(1, Math.floor(placement.height / lineStep))
  lines.slice(0, maxLines).forEach((line, index) => {
    const lineWidth = font.widthOfTextAtSize(line, object.fontSize)
    const offset = object.alignment === 'center'
      ? Math.max(0, (placement.width - lineWidth) / 2)
      : object.alignment === 'right'
        ? Math.max(0, placement.width - lineWidth)
        : 0
    const localX = placement.x + offset
    const localY = placement.y + placement.height - object.fontSize - index * lineStep
    const centerX = placement.x + placement.width / 2
    const centerY = placement.y + placement.height / 2
    const angle = placement.rotation * Math.PI / 180
    const x = centerX + Math.cos(angle) * (localX - centerX) - Math.sin(angle) * (localY - centerY)
    const y = centerY + Math.sin(angle) * (localX - centerX) + Math.cos(angle) * (localY - centerY)
    page.drawText(line, {
      x,
      y,
      size: object.fontSize,
      font,
      color: hexToPdfColor(object.color),
      opacity: object.opacity,
      rotate: degrees(placement.rotation),
    })
  })
}

export const exportEditorProject = async (
  sourceBytes: ArrayBuffer,
  project: EditorProjectV1,
  assets: EditorAsset[],
  password?: string,
) => {
  const document = await PDFDocument.load(sourceBytes.slice(0), {
    password: password || undefined,
    ignoreEncryption: true,
  } as any)
  const fontCache = new Map<string, PDFFont>()
  const imageCache = new Map<string, PDFImage>()
  const assetMap = new Map(assets.map((asset) => [asset.id, asset]))

  for (const [pageIndex, page] of document.getPages().entries()) {
    const objects = project.objects
      .filter((object) => appliesToPage(object, pageIndex))
      .sort((a, b) => a.zIndex - b.zIndex)
    for (const object of objects) {
      if (object.type === 'text') {
        const key = `${object.fontFamily}-${object.fontStyle}`
        let font = fontCache.get(key)
        if (!font) {
          font = await document.embedFont(fontNames[object.fontFamily][object.fontStyle])
          fontCache.set(key, font)
        }
        drawTextObject(page, object, font)
        continue
      }
      const asset = assetMap.get(object.assetId)
      if (!asset) continue
      let image = imageCache.get(asset.id)
      if (!image) {
        const bytes = await asset.blob.arrayBuffer()
        image = asset.mimeType === 'image/jpeg'
          ? await document.embedJpg(bytes)
          : await document.embedPng(bytes)
        imageCache.set(asset.id, image)
      }
      const placement = displayPlacementToPdf(object, page)
      const angle = placement.rotation * Math.PI / 180
      const centerX = placement.x + placement.width / 2
      const centerY = placement.y + placement.height / 2
      const x = centerX - (Math.cos(angle) * placement.width / 2 - Math.sin(angle) * placement.height / 2)
      const y = centerY - (Math.sin(angle) * placement.width / 2 + Math.cos(angle) * placement.height / 2)
      page.drawImage(image, {
        x,
        y,
        width: placement.width,
        height: placement.height,
        opacity: object.opacity,
        rotate: degrees(placement.rotation),
      })
    }
  }
  return document.save()
}
