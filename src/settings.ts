import type { PlacementSettings } from './types'

const STORAGE_KEY = 'return-label-prepper:settings'

export const DEFAULT_SETTINGS: PlacementSettings = {
  slotMode: 'top',
  offsetXPt: 0,
  offsetYPt: 0,
  scalePercent: 100,
  rotationDeg: -90,
  cropPaddingPx: 8,
  showGuides: true,
}

export const loadSettings = (): PlacementSettings => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return DEFAULT_SETTINGS
    }

    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) }
  } catch {
    return DEFAULT_SETTINGS
  }
}

export const saveSettings = (settings: PlacementSettings) => {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
}
