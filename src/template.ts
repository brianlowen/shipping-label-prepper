import type { TemplateDefinition, TemplateSlot } from './types'

const AVERY_8126_SLOTS: TemplateSlot[] = [
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
]

export const AVERY_8126_TEMPLATE: TemplateDefinition = {
  id: 'avery-8126',
  name: 'Avery 8126',
  page: {
    widthPt: 612,
    heightPt: 792,
  },
  slots: AVERY_8126_SLOTS,
}

export const getActiveSlots = (slotMode: 'top' | 'bottom' | 'both') => {
  if (slotMode === 'both') {
    return AVERY_8126_TEMPLATE.slots
  }

  return AVERY_8126_TEMPLATE.slots.filter((slot) => slot.id === slotMode)
}
