export type SlotSelection = 'all' | string

export interface RectPt {
  x: number
  y: number
  width: number
  height: number
}

export interface TemplateSlot {
  id: string
  name: string
  rect: RectPt
}

export interface TemplateDefinition {
  id: string
  brand: string
  name: string
  compatibleWith: string[]
  category: 'parcel'
  labelSizeIn: {
    width: number
    height: number
  }
  sheetSizeIn: {
    width: number
    height: number
  }
  labelsPerSheet: number
  sourceUrl?: string
  defaultRotationDeg: number
  page: {
    widthPt: number
    heightPt: number
  }
  slots: TemplateSlot[]
}

export interface PixelBounds {
  x: number
  y: number
  width: number
  height: number
}

export interface LabelSource {
  fileName: string
  fileType: string
  renderedCanvas: HTMLCanvasElement
  detectedBounds: PixelBounds
}

export interface PlacementSettings {
  templateId: string
  slotSelection: SlotSelection
  offsetXPt: number
  offsetYPt: number
  scalePercent: number
  rotationDeg: number
  cropPaddingPx: number
  showGuides: boolean
}

export interface PreparedSheet {
  blob: Blob
  url: string
}
