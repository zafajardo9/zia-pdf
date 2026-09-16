import { createId, EditorAsset } from './types'

const loadImage = (url: string) => new Promise<HTMLImageElement>((resolve, reject) => {
  const image = new Image()
  image.onload = () => resolve(image)
  image.onerror = () => reject(new Error('The image could not be read.'))
  image.src = url
})

export const normalizeImageAsset = async (file: Blob, name: string): Promise<EditorAsset> => {
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
    throw new Error('Choose a PNG, JPEG, or WebP image.')
  }
  const url = URL.createObjectURL(file)
  try {
    const image = await loadImage(url)
    if (!image.naturalWidth || !image.naturalHeight) throw new Error('The image has no visible dimensions.')
    if (file.type === 'image/png' || file.type === 'image/jpeg') {
      return {
        id: createId('asset'),
        name,
        mimeType: file.type,
        blob: file,
        width: image.naturalWidth,
        height: image.naturalHeight,
      }
    }
    const canvas = document.createElement('canvas')
    canvas.width = image.naturalWidth
    canvas.height = image.naturalHeight
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Image conversion is not available in this browser.')
    context.drawImage(image, 0, 0)
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((result) => result ? resolve(result) : reject(new Error('The image could not be converted.')), 'image/png')
    })
    canvas.width = 0
    canvas.height = 0
    return {
      id: createId('asset'),
      name: name.replace(/\.webp$/i, '.png'),
      mimeType: 'image/png',
      blob,
      width: image.naturalWidth,
      height: image.naturalHeight,
    }
  } finally {
    URL.revokeObjectURL(url)
  }
}

