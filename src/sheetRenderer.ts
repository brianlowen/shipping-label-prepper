import { PDFDocument } from 'pdf-lib'
import { getActiveSlots } from './template'
import type { LabelSource, PlacementSettings, PreparedSheet, RectPt } from './types'
import type { TemplateDefinition } from './types'
import { getCroppedCanvas } from './labelProcessing'

const EXPORT_DPI = 300
const POINTS_PER_INCH = 72
const EXPORT_SCALE = EXPORT_DPI / POINTS_PER_INCH

interface RenderOptions {
  drawBackground: boolean
  forceGuides?: boolean
  scale: number
}

export const renderSheetToCanvas = (
  canvas: HTMLCanvasElement,
  source: LabelSource | null,
  template: TemplateDefinition,
  settings: PlacementSettings,
  options: RenderOptions,
) => {
  const { page } = template
  canvas.width = Math.round(page.widthPt * options.scale)
  canvas.height = Math.round(page.heightPt * options.scale)

  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('Canvas rendering is not available in this browser.')
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.save()
  ctx.scale(options.scale, options.scale)

  if (options.drawBackground) {
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, page.widthPt, page.heightPt)
  }

  if (settings.showGuides || options.forceGuides) {
    drawGuides(ctx, template)
  }

  if (source) {
    const labelCanvas = getCroppedCanvas(
      source.renderedCanvas,
      source.detectedBounds,
      settings.cropPaddingPx,
    )

    for (const slot of getActiveSlots(template, settings.slotSelection)) {
      drawLabelInSlot(ctx, labelCanvas, template, slot.rect, settings)
    }
  }

  ctx.restore()
}

export const createPrintablePdf = async (
  source: LabelSource,
  template: TemplateDefinition,
  settings: PlacementSettings,
): Promise<PreparedSheet> => {
  const canvas = document.createElement('canvas')
  renderSheetToCanvas(canvas, source, template, settings, {
    drawBackground: false,
    scale: EXPORT_SCALE,
  })

  const pngBlob = await canvasToPngBlob(canvas)
  const pdfDoc = await PDFDocument.create()
  const page = pdfDoc.addPage([template.page.widthPt, template.page.heightPt])
  const pngBytes = await pngBlob.arrayBuffer()
  const png = await pdfDoc.embedPng(pngBytes)

  page.drawImage(png, {
    x: 0,
    y: 0,
    width: template.page.widthPt,
    height: template.page.heightPt,
  })

  const pdfBytes = await pdfDoc.save()
  const pdfArrayBuffer = pdfBytes.buffer.slice(
    pdfBytes.byteOffset,
    pdfBytes.byteOffset + pdfBytes.byteLength,
  ) as ArrayBuffer
  const blob = new Blob([pdfArrayBuffer], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)

  return { blob, url }
}

const drawLabelInSlot = (
  ctx: CanvasRenderingContext2D,
  labelCanvas: HTMLCanvasElement,
  template: TemplateDefinition,
  slot: RectPt,
  settings: PlacementSettings,
) => {
  const angle = (settings.rotationDeg * Math.PI) / 180
  const fitAngle = (template.defaultRotationDeg * Math.PI) / 180
  const sourceWidth = labelCanvas.width
  const sourceHeight = labelCanvas.height
  const rotatedWidth =
    Math.abs(sourceWidth * Math.cos(fitAngle)) + Math.abs(sourceHeight * Math.sin(fitAngle))
  const rotatedHeight =
    Math.abs(sourceWidth * Math.sin(fitAngle)) + Math.abs(sourceHeight * Math.cos(fitAngle))
  const fitScale = Math.min(slot.width / rotatedWidth, slot.height / rotatedHeight)
  const userScale = settings.scalePercent / 100
  const finalScale = fitScale * userScale
  const centerX = slot.x + slot.width / 2 + settings.offsetXPt
  const centerYFromBottom = slot.y + slot.height / 2 + settings.offsetYPt
  const centerY = template.page.heightPt - centerYFromBottom

  ctx.save()
  ctx.translate(centerX, centerY)
  ctx.rotate(angle)
  ctx.drawImage(
    labelCanvas,
    (-sourceWidth * finalScale) / 2,
    (-sourceHeight * finalScale) / 2,
    sourceWidth * finalScale,
    sourceHeight * finalScale,
  )
  ctx.restore()
}

const drawGuides = (ctx: CanvasRenderingContext2D, template: TemplateDefinition) => {
  ctx.save()
  ctx.strokeStyle = '#2b6cb0'
  ctx.lineWidth = 0.75
  ctx.setLineDash([5, 4])

  for (const slot of template.slots) {
    const y = template.page.heightPt - slot.rect.y - slot.rect.height
    roundRectPath(ctx, slot.rect.x, y, slot.rect.width, slot.rect.height, 5)
    ctx.stroke()
  }

  ctx.restore()
}

const roundRectPath = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) => {
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.lineTo(x + width - radius, y)
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius)
  ctx.lineTo(x + width, y + height - radius)
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
  ctx.lineTo(x + radius, y + height)
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius)
  ctx.lineTo(x, y + radius)
  ctx.quadraticCurveTo(x, y, x + radius, y)
}

const canvasToPngBlob = (canvas: HTMLCanvasElement) => {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob)
      } else {
        reject(new Error('Unable to create printable image.'))
      }
    }, 'image/png')
  })
}
