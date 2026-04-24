import type { PlacementSettings } from './types'
import { DEFAULT_TEMPLATE_ID, getDefaultSlotSelection, getTemplateById } from './template'

const STORAGE_KEY = 'return-label-prepper:settings'
const FAVORITES_STORAGE_KEY = 'return-label-prepper:favorite-templates'

export const getDefaultSettings = (templateId = DEFAULT_TEMPLATE_ID): PlacementSettings => {
  const template = getTemplateById(templateId)

  return {
    templateId: template.id,
    slotSelection: getDefaultSlotSelection(template),
    offsetXPt: 0,
    offsetYPt: 0,
    scalePercent: 100,
    rotationDeg: template.defaultRotationDeg,
    cropPaddingPx: 8,
    showGuides: true,
  }
}

export const loadSettings = (): PlacementSettings => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return getDefaultSettings()
    }

    const parsed = JSON.parse(raw) as Partial<PlacementSettings> & {
      slotMode?: 'top' | 'bottom' | 'both'
    }
    const template = getTemplateById(parsed.templateId ?? DEFAULT_TEMPLATE_ID)
    const defaultSettings = getDefaultSettings(template.id)
    const migratedSlotSelection =
      parsed.slotSelection ??
      (parsed.slotMode === 'both' ? 'all' : parsed.slotMode) ??
      defaultSettings.slotSelection
    const slotSelection =
      migratedSlotSelection === 'all' ||
      template.slots.some((slot) => slot.id === migratedSlotSelection)
        ? migratedSlotSelection
        : defaultSettings.slotSelection

    return {
      ...defaultSettings,
      ...parsed,
      templateId: template.id,
      slotSelection,
    }
  } catch {
    return getDefaultSettings()
  }
}

export const saveSettings = (settings: PlacementSettings) => {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
}

export const loadFavoriteTemplateIds = () => {
  try {
    const raw = window.localStorage.getItem(FAVORITES_STORAGE_KEY)
    if (!raw) {
      return []
    }

    const parsed = JSON.parse(raw)
    return Array.isArray(parsed)
      ? parsed.filter((value): value is string => typeof value === 'string')
      : []
  } catch {
    return []
  }
}

export const saveFavoriteTemplateIds = (templateIds: string[]) => {
  window.localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(templateIds))
}
