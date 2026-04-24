export type SlotMode = 'top' | 'bottom' | 'both'

export interface RectPt {
  x: number
  y: number
  width: number
  height: number
}

export interface TemplateSlot {
  id: Exclude<SlotMode, 'both'>
  name: string
  rect: RectPt
}

export interface TemplateDefinition {
  id: string
  name: string
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
  slotMode: SlotMode
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
