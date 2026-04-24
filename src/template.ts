import type { TemplateDefinition } from './types'

export const DEFAULT_TEMPLATE_ID = 'avery-8126'
export const ALL_SLOTS_SELECTION = 'all'

const pt = (inches: number) => inches * 72

const letterPage = {
  widthPt: pt(8.5),
  heightPt: pt(11),
}

const sizeIn = (width: number, height: number) => ({ width, height })
const rectIn = (x: number, y: number, width: number, height: number) => ({
  x: pt(x),
  y: pt(y),
  width: pt(width),
  height: pt(height),
})

export const TEMPLATE_CATALOG: TemplateDefinition[] = [
  {
    id: DEFAULT_TEMPLATE_ID,
    brand: 'Avery',
    name: 'Avery 8126 / 5126 compatible',
    compatibleWith: [
      '8126',
      '5126',
      '18126',
      '15516',
      '48126',
      '48808',
      '5138',
      '5526',
      '5912',
      '5917',
      '6440',
      '8426',
      '95526',
    ],
    category: 'parcel',
    labelSizeIn: sizeIn(8.5, 5.5),
    sheetSizeIn: sizeIn(8.5, 11),
    labelsPerSheet: 2,
    sourceUrl: 'https://www.avery.com/templates/8126',
    defaultRotationDeg: -90,
    page: letterPage,
    slots: [
      {
        id: 'top',
        name: 'Top',
        rect: { x: 2.85, y: 396.03, width: 606.24, height: 393.12 },
      },
      {
        id: 'bottom',
        name: 'Bottom',
        rect: { x: 2.85, y: 2.88, width: 606.24, height: 393.12 },
      },
    ],
  },
  {
    id: 'letter-half-sheet',
    brand: 'Generic',
    name: 'Letter half-sheet shipping labels',
    compatibleWith: ['half sheet', '2-up', '8.5x5.5'],
    category: 'parcel',
    labelSizeIn: sizeIn(8.5, 5.5),
    sheetSizeIn: sizeIn(8.5, 11),
    labelsPerSheet: 2,
    defaultRotationDeg: -90,
    page: letterPage,
    slots: [
      { id: 'top', name: 'Top', rect: rectIn(0, 5.5, 8.5, 5.5) },
      { id: 'bottom', name: 'Bottom', rect: rectIn(0, 0, 8.5, 5.5) },
    ],
  },
  {
    id: 'ol131-8x5',
    brand: 'OnlineLabels',
    name: 'OL131 compatible 8 x 5',
    compatibleWith: ['OL131', '8x5', 'eBay shipping labels'],
    category: 'parcel',
    labelSizeIn: sizeIn(8, 5),
    sheetSizeIn: sizeIn(8.5, 11),
    labelsPerSheet: 2,
    sourceUrl: 'https://www.onlinelabels.com/templates/blank/ol131',
    defaultRotationDeg: -90,
    page: letterPage,
    slots: [
      { id: 'top', name: 'Top', rect: rectIn(0.25, 5.75, 8, 5) },
      { id: 'bottom', name: 'Bottom', rect: rectIn(0.25, 0.25, 8, 5) },
    ],
  },
  {
    id: 'ol145-wl145-6x4',
    brand: 'OnlineLabels / WorldLabel',
    name: 'OL145 / WL-145 compatible 6 x 4',
    compatibleWith: ['OL145', 'WL-145', 'ShippingEasy', '4x6 2-up'],
    category: 'parcel',
    labelSizeIn: sizeIn(6, 4),
    sheetSizeIn: sizeIn(8.5, 11),
    labelsPerSheet: 2,
    sourceUrl: 'https://www.onlinelabels.com/OL145.htm',
    defaultRotationDeg: -90,
    page: letterPage,
    slots: [
      { id: 'top', name: 'Top', rect: rectIn(1.25, 5.625, 6, 4) },
      { id: 'bottom', name: 'Bottom', rect: rectIn(1.25, 1.375, 6, 4) },
    ],
  },
  {
    id: 'avery-5292-5454',
    brand: 'Avery',
    name: 'Avery 5292 / 5454 compatible',
    compatibleWith: ['5292', '5454', '5614', '4x6 sheet'],
    category: 'parcel',
    labelSizeIn: sizeIn(4, 6),
    sheetSizeIn: sizeIn(4, 6),
    labelsPerSheet: 1,
    sourceUrl: 'https://www.avery.com/templates/5292',
    defaultRotationDeg: 0,
    page: {
      widthPt: pt(4),
      heightPt: pt(6),
    },
    slots: [{ id: 'label', name: 'Label', rect: rectIn(0, 0, 4, 6) }],
  },
  {
    id: 'thermal-4x6',
    brand: 'Generic',
    name: '4 x 6 thermal / single-label page',
    compatibleWith: ['USPS', 'UPS', 'FedEx', 'Amazon', '4x6'],
    category: 'parcel',
    labelSizeIn: sizeIn(4, 6),
    sheetSizeIn: sizeIn(4, 6),
    labelsPerSheet: 1,
    defaultRotationDeg: 0,
    page: {
      widthPt: pt(4),
      heightPt: pt(6),
    },
    slots: [{ id: 'label', name: 'Label', rect: rectIn(0, 0, 4, 6) }],
  },
  {
    id: 'letter-full-page',
    brand: 'Generic',
    name: 'Full-page label / plain paper',
    compatibleWith: ['8.5x11', 'full sheet', 'plain paper'],
    category: 'parcel',
    labelSizeIn: sizeIn(8.5, 11),
    sheetSizeIn: sizeIn(8.5, 11),
    labelsPerSheet: 1,
    defaultRotationDeg: 0,
    page: letterPage,
    slots: [{ id: 'full-page', name: 'Full page', rect: rectIn(0, 0, 8.5, 11) }],
  },
]

export const getTemplateById = (templateId: string) =>
  TEMPLATE_CATALOG.find((template) => template.id === templateId) ?? TEMPLATE_CATALOG[0]

export const getActiveSlots = (
  template: TemplateDefinition,
  slotSelection: string,
) => {
  if (slotSelection === ALL_SLOTS_SELECTION) {
    return template.slots
  }

  const selectedSlot = template.slots.find((slot) => slot.id === slotSelection)
  return selectedSlot ? [selectedSlot] : [template.slots[0]]
}

export const getDefaultSlotSelection = (template: TemplateDefinition) => template.slots[0].id

export const formatInches = (value: number) => Number(value.toFixed(3)).toString()

export const formatSize = (size: { width: number; height: number }) =>
  `${formatInches(size.width)}" x ${formatInches(size.height)}"`
