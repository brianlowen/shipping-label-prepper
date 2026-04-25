import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist'
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url'
import type { CropInsetPx, LabelSource, PixelBounds } from './types'

GlobalWorkerOptions.workerSrc = pdfWorkerUrl

const PDF_RENDER_SCALE = 5
const WHITE_THRESHOLD = 246

export const loadLabelSource = async (file: File): Promise<LabelSource> => {
  const renderedCanvas = isPdf(file)
    ? await renderPdfFirstPage(file)
    : await renderImageFile(file)

  return {
    fileName: file.name,
    fileType: file.type || file.name.split('.').pop() || 'unknown',
    renderedCanvas,
    detectedBounds: detectContentBounds(renderedCanvas),
  }
}

export const getCroppedCanvas = (
  canvas: HTMLCanvasElement,
  bounds: PixelBounds,
  paddingPx: number,
  cropInsetPx: CropInsetPx = { top: 0, right: 0, bottom: 0, left: 0 },
) => {
  const crop = getCropRect(canvas, bounds, paddingPx, cropInsetPx)

  const cropped = document.createElement('canvas')
  cropped.width = crop.width
  cropped.height = crop.height

  const ctx = requiredContext(cropped)
  ctx.drawImage(canvas, crop.x, crop.y, crop.width, crop.height, 0, 0, crop.width, crop.height)

  return cropped
}

export const getCropRect = (
  canvas: HTMLCanvasElement,
  bounds: PixelBounds,
  paddingPx: number,
  cropInsetPx: CropInsetPx,
): PixelBounds => {
  const cropX = Math.max(0, Math.floor(bounds.x - paddingPx + cropInsetPx.left))
  const cropY = Math.max(0, Math.floor(bounds.y - paddingPx + cropInsetPx.top))
  const cropRight = Math.min(
    canvas.width,
    Math.ceil(bounds.x + bounds.width + paddingPx - cropInsetPx.right),
  )
  const cropBottom = Math.min(
    canvas.height,
    Math.ceil(bounds.y + bounds.height + paddingPx - cropInsetPx.bottom),
  )

  return {
    x: cropX,
    y: cropY,
    width: Math.max(1, cropRight - cropX),
    height: Math.max(1, cropBottom - cropY),
  }
}

export const supportsFile = (file: File) => {
  if (isPdf(file)) {
    return true
  }

  return ['image/png', 'image/jpeg', 'image/webp'].includes(file.type)
}

const isPdf = (file: File) => {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
}

const renderPdfFirstPage = async (file: File) => {
  const data = new Uint8Array(await file.arrayBuffer())
  const pdf = await getDocument({ data }).promise
  const page = await pdf.getPage(1)
  const viewport = page.getViewport({ scale: PDF_RENDER_SCALE })
  const canvas = document.createElement('canvas')
  canvas.width = Math.ceil(viewport.width)
  canvas.height = Math.ceil(viewport.height)

  const ctx = requiredContext(canvas)
  await page.render({ canvas, canvasContext: ctx, viewport }).promise
  await pdf.destroy()

  return canvas
}

const renderImageFile = async (file: File) => {
  const objectUrl = URL.createObjectURL(file)

  try {
    const image = new Image()
    image.src = objectUrl
    await image.decode()

    const canvas = document.createElement('canvas')
    canvas.width = image.naturalWidth
    canvas.height = image.naturalHeight

    const ctx = requiredContext(canvas)
    ctx.drawImage(image, 0, 0)

    return canvas
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

const detectContentBounds = (canvas: HTMLCanvasElement): PixelBounds => {
  const ctx = requiredContext(canvas)
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const { data, width, height } = imageData
  let minX = width
  let minY = height
  let maxX = -1
  let maxY = -1

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 4
      const alpha = data[i + 3]
      if (alpha === 0) {
        continue
      }

      const r = data[i]
      const g = data[i + 1]
      const b = data[i + 2]
      const hasInk = r < WHITE_THRESHOLD || g < WHITE_THRESHOLD || b < WHITE_THRESHOLD

      if (hasInk) {
        minX = Math.min(minX, x)
        minY = Math.min(minY, y)
        maxX = Math.max(maxX, x)
        maxY = Math.max(maxY, y)
      }
    }
  }

  if (maxX < minX || maxY < minY) {
    return { x: 0, y: 0, width, height }
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  }
}

const requiredContext = (canvas: HTMLCanvasElement) => {
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) {
    throw new Error('Canvas rendering is not available in this browser.')
  }

  return ctx
}
