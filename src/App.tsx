import { useEffect, useMemo, useRef, useState } from 'react'
import type { ChangeEvent, DragEvent, PointerEvent } from 'react'
import {
  ChevronDown,
  Download,
  FileText,
  LayoutTemplate,
  Move,
  Printer,
  RefreshCcw,
  RotateCcw,
  RotateCw,
  Search,
  SlidersHorizontal,
  Star,
  Upload,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import { getCropRect, loadLabelSource, supportsFile } from './labelProcessing'
import {
  ALL_SLOTS_SELECTION,
  TEMPLATE_CATALOG,
  formatSize,
  getDefaultSlotSelection,
  getActiveSlots,
  getTemplateById,
} from './template'
import {
  getDefaultSettings,
  loadFavoriteTemplateIds,
  loadSettings,
  saveFavoriteTemplateIds,
  saveSettings,
} from './settings'
import { createPrintablePdf, renderSheetToCanvas } from './sheetRenderer'
import { getAffiliateLinksForTemplate } from './affiliateLinks'
import type { LabelSource, PlacementSettings, SlotSelection, TemplateDefinition } from './types'

const PREVIEW_SCALE = 1.55
const DEFAULT_PAGE_ZOOM = 1

const formatPx = (value: number) => `${Math.round(value).toLocaleString()} px`
const scaleHandleNames = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w']
type TransformDragType = 'move' | 'scale' | 'rotate'

interface PreviewDragState {
  type: TransformDragType
  point: { xPt: number; yPt: number }
  settings: Pick<PlacementSettings, 'offsetXPt' | 'offsetYPt' | 'scalePercent' | 'rotationDeg'>
  anchor: { xPt: number; yPt: number }
  distance: number
  angleDeg: number
}

interface LabelFrame {
  centerXPercent: number
  centerYPercent: number
  widthPercent: number
  heightPercent: number
  rotationDeg: number
}

function App() {
  const [settings, setSettings] = useState<PlacementSettings>(() => loadSettings())
  const [favoriteTemplateIds, setFavoriteTemplateIds] = useState<string[]>(() =>
    loadFavoriteTemplateIds(),
  )
  const [templateQuery, setTemplateQuery] = useState('')
  const [source, setSource] = useState<LabelSource | null>(null)
  const [status, setStatus] = useState('Ready')
  const [error, setError] = useState('')
  const [isBusy, setIsBusy] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [isMovingLabel, setIsMovingLabel] = useState(false)
  const [pageZoom, setPageZoom] = useState(DEFAULT_PAGE_ZOOM)
  const [pageRotationDeg, setPageRotationDeg] = useState(0)
  const dragStateRef = useRef<PreviewDragState | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const activeTemplate = useMemo(
    () => getTemplateById(settings.templateId),
    [settings.templateId],
  )
  const affiliateLinks = useMemo(
    () => getAffiliateLinksForTemplate(activeTemplate.id),
    [activeTemplate.id],
  )

  const slotOptions = useMemo(() => {
    const options = activeTemplate.slots.map((slot) => ({ value: slot.id, label: slot.name }))
    if (activeTemplate.slots.length > 1) {
      options.push({ value: ALL_SLOTS_SELECTION, label: 'All slots' })
    }

    return options
  }, [activeTemplate])

  const selectedSlotLabel =
    settings.slotSelection === ALL_SLOTS_SELECTION
      ? 'All slots'
      : activeTemplate.slots.find((slot) => slot.id === settings.slotSelection)?.name ?? 'Label'
  const previewInstruction = 'Drag label, handles, or rotate grip'

  const visibleTemplates = useMemo(() => {
    const query = templateQuery.trim().toLowerCase()
    const withIndex = TEMPLATE_CATALOG.map((template, index) => ({ template, index }))
    const filtered = query
      ? withIndex.filter(({ template }) => templateMatchesQuery(template, query))
      : withIndex

    return filtered.sort((a, b) => {
      const aFavorite = favoriteTemplateIds.includes(a.template.id)
      const bFavorite = favoriteTemplateIds.includes(b.template.id)
      if (aFavorite !== bFavorite) {
        return aFavorite ? -1 : 1
      }

      return a.index - b.index
    })
  }, [favoriteTemplateIds, templateQuery])

  const croppedSize = useMemo(() => {
    if (!source) {
      return null
    }

    const crop = getCropRect(
      source.renderedCanvas,
      source.detectedBounds,
      settings.cropPaddingPx,
      settings.cropInsetPx,
    )
    return { width: crop.width, height: crop.height }
  }, [settings.cropInsetPx, settings.cropPaddingPx, source])

  const labelFrame = useMemo(() => {
    if (!source || !croppedSize) {
      return null
    }

    return getLabelFrame(activeTemplate, settings, croppedSize)
  }, [activeTemplate, croppedSize, settings, source])

  useEffect(() => {
    saveSettings(settings)
  }, [settings])

  useEffect(() => {
    saveFavoriteTemplateIds(favoriteTemplateIds)
  }, [favoriteTemplateIds])

  useEffect(() => {
    if (!canvasRef.current) {
      return
    }

    renderSheetToCanvas(canvasRef.current, source, activeTemplate, settings, {
      drawBackground: true,
      scale: PREVIEW_SCALE,
    })
  }, [activeTemplate, settings, source])

  const updateSetting = <Key extends keyof PlacementSettings>(
    key: Key,
    value: PlacementSettings[Key],
  ) => {
    setSettings((current) => ({ ...current, [key]: value }))
  }

  const updateCropInset = (edge: keyof PlacementSettings['cropInsetPx'], value: number) => {
    setSettings((current) => ({
      ...current,
      cropInsetPx: {
        ...current.cropInsetPx,
        [edge]: value,
      },
    }))
  }

  const handleFiles = async (files: FileList | File[]) => {
    const file = files[0]
    if (!file) {
      return
    }

    if (!supportsFile(file)) {
      setError('Use PDF, PNG, JPG, JPEG, or WebP.')
      return
    }

    setIsBusy(true)
    setError('')
    setStatus('Preparing label')

    try {
      const nextSource = await loadLabelSource(file)
      setSource(nextSource)
      setStatus('Label ready')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to prepare this label.')
      setStatus('Ready')
    } finally {
      setIsBusy(false)
    }
  }

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      void handleFiles(event.target.files)
    }
  }

  const handleDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault()
    setIsDragging(false)
    void handleFiles(event.dataTransfer.files)
  }

  const handleExport = async () => {
    if (!source) {
      return
    }

    setIsBusy(true)
    setError('')
    setStatus('Exporting PDF')

    try {
      const prepared = await createPrintablePdf(source, activeTemplate, settings)
      const link = document.createElement('a')
      link.href = prepared.url
      link.download = 'prepared-return-label.pdf'
      link.click()
      setStatus('PDF exported')
      window.setTimeout(() => URL.revokeObjectURL(prepared.url), 30_000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to export the PDF.')
      setStatus('Label ready')
    } finally {
      setIsBusy(false)
    }
  }

  const handlePrint = async () => {
    if (!source) {
      return
    }

    setIsBusy(true)
    setError('')
    setStatus('Opening print')

    try {
      const prepared = await createPrintablePdf(source, activeTemplate, settings)
      const frame = document.createElement('iframe')
      frame.className = 'print-frame'
      frame.src = prepared.url
      document.body.appendChild(frame)
      frame.onload = () => {
        frame.contentWindow?.focus()
        frame.contentWindow?.print()
        window.setTimeout(() => {
          frame.remove()
          URL.revokeObjectURL(prepared.url)
        }, 60_000)
      }
      setStatus('Print ready')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to print the PDF.')
      setStatus('Label ready')
    } finally {
      setIsBusy(false)
    }
  }

  const resetSettings = () => {
    setSettings(getDefaultSettings(activeTemplate.id))
  }

  const selectTemplate = (template: TemplateDefinition) => {
    setSettings((current) => ({
      ...current,
      templateId: template.id,
      slotSelection: getDefaultSlotSelection(template),
      offsetXPt: 0,
      offsetYPt: 0,
      scalePercent: 100,
      rotationDeg: template.defaultRotationDeg,
    }))
  }

  const toggleFavoriteTemplate = (templateId: string) => {
    setFavoriteTemplateIds((current) =>
      current.includes(templateId)
        ? current.filter((id) => id !== templateId)
        : [...current, templateId],
    )
  }

  const changePageZoom = (delta: number) => {
    setPageZoom((current) => clamp(Number((current + delta).toFixed(2)), 0.55, 2))
  }

  const changePageRotation = (delta: number) => {
    setPageRotationDeg((current) => normalizeDegrees(current + delta))
  }

  const getPreviewPoint = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current
    if (!canvas) {
      return null
    }

    const rect = canvas.getBoundingClientRect()
    return {
      xPt: ((clientX - rect.left) / rect.width) * activeTemplate.page.widthPt,
      yPt: ((clientY - rect.top) / rect.height) * activeTemplate.page.heightPt,
    }
  }

  const getInteractionAnchor = () => {
    const slot = getActiveSlots(activeTemplate, settings.slotSelection)[0]
    const xPt = slot.rect.x + slot.rect.width / 2 + settings.offsetXPt
    const yFromBottom = slot.rect.y + slot.rect.height / 2 + settings.offsetYPt

    return {
      xPt,
      yPt: activeTemplate.page.heightPt - yFromBottom,
    }
  }

  const startTransformDrag = (
    type: TransformDragType,
    event: PointerEvent<HTMLElement>,
  ) => {
    if (!source) {
      return
    }

    const point = getPreviewPoint(event.clientX, event.clientY)
    if (!point) {
      return
    }

    event.preventDefault()
    event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)
    const anchor = getInteractionAnchor()
    dragStateRef.current = {
      type,
      point,
      settings: {
        offsetXPt: settings.offsetXPt,
        offsetYPt: settings.offsetYPt,
        scalePercent: settings.scalePercent,
        rotationDeg: settings.rotationDeg,
      },
      anchor,
      distance: Math.max(distanceBetween(point, anchor), 1),
      angleDeg: angleBetween(anchor, point),
    }
    setIsMovingLabel(true)
  }

  const handleTransformPointerMove = (event: PointerEvent<HTMLElement>) => {
    const dragState = dragStateRef.current
    if (!dragState) {
      return
    }

    const nextPoint = getPreviewPoint(event.clientX, event.clientY)
    if (!nextPoint) {
      return
    }

    if (dragState.type === 'move') {
      const dx = nextPoint.xPt - dragState.point.xPt
      const dy = nextPoint.yPt - dragState.point.yPt
      dragStateRef.current = { ...dragState, point: nextPoint }

      setSettings((current) => ({
        ...current,
        offsetXPt: clamp(roundToHalf(current.offsetXPt + dx), -144, 144),
        offsetYPt: clamp(roundToHalf(current.offsetYPt - dy), -144, 144),
      }))
      return
    }

    if (dragState.type === 'scale') {
      const nextDistance = Math.max(distanceBetween(nextPoint, dragState.anchor), 1)
      const nextScale = dragState.settings.scalePercent * (nextDistance / dragState.distance)

      setSettings((current) => ({
        ...current,
        scalePercent: clamp(roundToHalf(nextScale), 70, 130),
      }))
      return
    }

    const nextAngle = angleBetween(dragState.anchor, nextPoint)
    const nextRotation = dragState.settings.rotationDeg + angleDelta(dragState.angleDeg, nextAngle)

    setSettings((current) => ({
      ...current,
      rotationDeg: normalizeDegrees(roundToHalf(nextRotation)),
    }))
  }

  const finishPreviewDrag = (event: PointerEvent<HTMLElement>) => {
    dragStateRef.current = null
    setIsMovingLabel(false)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">{activeTemplate.name}</p>
          <h1>Return Label Prepper</h1>
        </div>
        <div className="topbar-actions">
          <button className="button secondary" type="button" onClick={() => fileInputRef.current?.click()}>
            <Upload size={17} aria-hidden="true" />
            Upload
          </button>
          <button className="button secondary" type="button" onClick={handleExport} disabled={!source || isBusy}>
            <Download size={17} aria-hidden="true" />
            Export PDF
          </button>
          <button className="button primary" type="button" onClick={handlePrint} disabled={!source || isBusy}>
            <Printer size={17} aria-hidden="true" />
            Print
          </button>
        </div>
      </header>

      <section className="workspace">
        <aside className="control-panel">
          <input
            ref={fileInputRef}
            className="file-input"
            type="file"
            accept="application/pdf,image/png,image/jpeg,image/webp"
            onChange={handleInputChange}
          />

          <label
            className={`drop-zone ${isDragging ? 'is-dragging' : ''}`}
            onDragOver={(event) => {
              event.preventDefault()
              setIsDragging(true)
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
          >
            <input
              type="file"
              accept="application/pdf,image/png,image/jpeg,image/webp"
              onChange={handleInputChange}
            />
            <FileText size={28} aria-hidden="true" />
            <span>{source ? source.fileName : 'Drop label file'}</span>
            <small>PDF, PNG, JPG, WebP</small>
          </label>

          <div className="status-row" aria-live="polite">
            <span className={`status-dot ${isBusy ? 'active' : ''}`} />
            <span>{status}</span>
          </div>
          {error ? <p className="error-text">{error}</p> : null}

          <section className="control-section template-browser">
            <div className="section-heading template-heading">
              <LayoutTemplate size={18} aria-hidden="true" />
              <h2>Template</h2>
            </div>

            <label className="search-row">
              <Search size={15} aria-hidden="true" />
              <input
                type="search"
                value={templateQuery}
                placeholder="Search size, brand, code"
                onChange={(event) => setTemplateQuery(event.target.value)}
              />
            </label>

            <div className="template-list">
              {visibleTemplates.map(({ template }) => {
                const isSelected = activeTemplate.id === template.id
                const isFavorite = favoriteTemplateIds.includes(template.id)

                return (
                  <article
                    className={`template-card ${isSelected ? 'selected' : ''}`}
                    key={template.id}
                  >
                    <button
                      className="template-select"
                      type="button"
                      onClick={() => selectTemplate(template)}
                      aria-pressed={isSelected}
                    >
                      <span>
                        <strong>{template.name}</strong>
                        <small>
                          {formatSize(template.labelSizeIn)} · {template.labelsPerSheet} per sheet
                        </small>
                      </span>
                      <em>{template.brand}</em>
                    </button>
                    <button
                      className={`favorite-button ${isFavorite ? 'selected' : ''}`}
                      type="button"
                      title={isFavorite ? 'Remove favorite' : 'Add favorite'}
                      aria-label={isFavorite ? 'Remove favorite' : 'Add favorite'}
                      onClick={() => toggleFavoriteTemplate(template.id)}
                    >
                      <Star size={15} aria-hidden="true" fill={isFavorite ? 'currentColor' : 'none'} />
                    </button>
                  </article>
                )
              })}
            </div>
          </section>

          <details className="control-section placement-details">
            <summary>
              <span className="section-heading">
                <SlidersHorizontal size={18} aria-hidden="true" />
                <span>
                  <strong>Placement</strong>
                  <small>Fine tune only when needed</small>
                </span>
              </span>
              <ChevronDown size={18} aria-hidden="true" />
            </summary>

            {slotOptions.length > 1 ? (
              <div className="segmented" aria-label="Label slot">
                {slotOptions.map((option) => (
                  <button
                    className={settings.slotSelection === option.value ? 'selected' : ''}
                    key={option.value}
                    type="button"
                    onClick={() => updateSetting('slotSelection', option.value as SlotSelection)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            ) : (
              <p className="slot-readout">{slotOptions[0]?.label ?? 'Label'}</p>
            )}

            <Slider
              label="X offset"
              value={settings.offsetXPt}
              min={-72}
              max={72}
              step={0.5}
              suffix="pt"
              onChange={(value) => updateSetting('offsetXPt', value)}
            />
            <Slider
              label="Y offset"
              value={settings.offsetYPt}
              min={-72}
              max={72}
              step={0.5}
              suffix="pt"
              onChange={(value) => updateSetting('offsetYPt', value)}
            />
            <Slider
              label="Scale"
              value={settings.scalePercent}
              min={70}
              max={130}
              step={0.5}
              suffix="%"
              onChange={(value) => updateSetting('scalePercent', value)}
            />
            <Slider
              label="Rotation"
              value={settings.rotationDeg}
              min={-180}
              max={180}
              step={0.5}
              suffix="deg"
              onChange={(value) => updateSetting('rotationDeg', value)}
            />
            <Slider
              label="Crop padding"
              value={settings.cropPaddingPx}
              min={0}
              max={80}
              step={1}
              suffix="px"
              onChange={(value) => updateSetting('cropPaddingPx', value)}
            />
            <Slider
              label="Crop top"
              value={settings.cropInsetPx.top}
              min={0}
              max={2000}
              step={5}
              suffix="px"
              onChange={(value) => updateCropInset('top', value)}
            />
            <Slider
              label="Crop right"
              value={settings.cropInsetPx.right}
              min={0}
              max={2000}
              step={5}
              suffix="px"
              onChange={(value) => updateCropInset('right', value)}
            />
            <Slider
              label="Crop bottom"
              value={settings.cropInsetPx.bottom}
              min={0}
              max={2000}
              step={5}
              suffix="px"
              onChange={(value) => updateCropInset('bottom', value)}
            />
            <Slider
              label="Crop left"
              value={settings.cropInsetPx.left}
              min={0}
              max={2000}
              step={5}
              suffix="px"
              onChange={(value) => updateCropInset('left', value)}
            />

            <label className="toggle-row">
              <input
                type="checkbox"
                checked={settings.showGuides}
                onChange={(event) => updateSetting('showGuides', event.target.checked)}
              />
              <span>Show and export guides</span>
            </label>

            <button className="button secondary full-width" type="button" onClick={resetSettings}>
              <RefreshCcw size={16} aria-hidden="true" />
              Reset auto
            </button>
          </details>

          <section className="control-section metadata">
            <h2>Source</h2>
            <dl>
              <div>
                <dt>Template</dt>
                <dd>{activeTemplate.name}</dd>
              </div>
              <div>
                <dt>Page</dt>
                <dd>{formatSize(activeTemplate.sheetSizeIn)}</dd>
              </div>
              <div>
                <dt>Label</dt>
                <dd>
                  {formatSize(activeTemplate.labelSizeIn)}, {activeTemplate.labelsPerSheet} up
                </dd>
              </div>
              <div>
                <dt>Rendered</dt>
                <dd>
                  {source
                    ? `${formatPx(source.renderedCanvas.width)} x ${formatPx(source.renderedCanvas.height)}`
                    : '-'}
                </dd>
              </div>
              <div>
                <dt>Crop</dt>
                <dd>{croppedSize ? `${formatPx(croppedSize.width)} x ${formatPx(croppedSize.height)}` : '-'}</dd>
              </div>
            </dl>
          </section>

          {affiliateLinks.length > 0 ? (
            <section className="control-section affiliate-panel">
              <h2>Buy Compatible Labels</h2>
              <p>
                Paid links. As an Amazon Associate I earn from qualifying purchases.
              </p>
              <div className="affiliate-links">
                {affiliateLinks.map((link) => (
                  <a
                    href={link.url}
                    key={link.url}
                    target="_blank"
                    rel="noreferrer sponsored"
                  >
                    <span>{link.label}</span>
                    <small>{link.merchant}</small>
                  </a>
                ))}
              </div>
            </section>
          ) : null}
        </aside>

        <section className="preview-panel" aria-label="Sheet preview">
          <div className="preview-toolbar">
            <span className="preview-title">
              <Move size={16} aria-hidden="true" />
              {previewInstruction}
            </span>
            <div className="preview-actions" aria-label="Preview placement controls">
              <button
                className="icon-button"
                type="button"
                title="Zoom page out"
                onClick={() => changePageZoom(-0.1)}
              >
                <ZoomOut size={16} aria-hidden="true" />
              </button>
              <button
                className="icon-button"
                type="button"
                title="Zoom page in"
                onClick={() => changePageZoom(0.1)}
              >
                <ZoomIn size={16} aria-hidden="true" />
              </button>
              <button
                className="icon-button"
                type="button"
                title="Rotate page left"
                onClick={() => changePageRotation(-90)}
              >
                <RotateCcw size={16} aria-hidden="true" />
              </button>
              <button
                className="icon-button"
                type="button"
                title="Rotate page right"
                onClick={() => changePageRotation(90)}
              >
                <RotateCw size={16} aria-hidden="true" />
              </button>
            </div>
            <span>
              {selectedSlotLabel} · {Math.round(pageZoom * 100)}% · {pageRotationDeg}deg
            </span>
          </div>
          <div className="sheet-wrap">
            <div
              className="sheet-stage"
              style={{
                width: `min(100%, ${790 * pageZoom}px)`,
                transform: `rotate(${pageRotationDeg}deg)`,
              }}
            >
              <canvas ref={canvasRef} className="sheet-canvas" />
              {source && labelFrame ? (
                <div
                  className={`transform-box ${isMovingLabel ? 'is-moving' : ''}`}
                  style={{
                    left: `${labelFrame.centerXPercent}%`,
                    top: `${labelFrame.centerYPercent}%`,
                    width: `${labelFrame.widthPercent}%`,
                    height: `${labelFrame.heightPercent}%`,
                    transform: `translate(-50%, -50%) rotate(${labelFrame.rotationDeg}deg)`,
                  }}
                  onPointerDown={(event) => startTransformDrag('move', event)}
                  onPointerMove={handleTransformPointerMove}
                  onPointerUp={finishPreviewDrag}
                  onPointerCancel={finishPreviewDrag}
                  onPointerLeave={(event) => {
                    if (dragStateRef.current) {
                      finishPreviewDrag(event)
                    }
                  }}
                >
                  <button
                    className="rotate-handle"
                    type="button"
                    title="Rotate label"
                    aria-label="Rotate label"
                    onPointerDown={(event) => startTransformDrag('rotate', event)}
                  >
                    <RotateCw size={14} aria-hidden="true" />
                  </button>
                  {scaleHandleNames.map((handle) => (
                    <button
                      className={`scale-handle ${handle}`}
                      key={handle}
                      type="button"
                      title="Scale label"
                      aria-label="Scale label"
                      onPointerDown={(event) => startTransformDrag('scale', event)}
                    />
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </section>
      </section>
    </main>
  )
}

interface SliderProps {
  label: string
  value: number
  min: number
  max: number
  step: number
  suffix: string
  onChange: (value: number) => void
}

function Slider({ label, value, min, max, step, suffix, onChange }: SliderProps) {
  return (
    <label className="slider-row">
      <span>
        {label}
        <strong>
          {value}
          {suffix}
        </strong>
      </span>
      <input
        type="range"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  )
}

export default App

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

const roundToHalf = (value: number) => Math.round(value * 2) / 2

const normalizeDegrees = (value: number) => {
  if (value > 180) {
    return value - 360
  }

  if (value < -180) {
    return value + 360
  }

  return value
}

const getLabelFrame = (
  template: TemplateDefinition,
  settings: PlacementSettings,
  croppedSize: { width: number; height: number },
): LabelFrame => {
  const slot = getActiveSlots(template, settings.slotSelection)[0]
  const angle = (template.defaultRotationDeg * Math.PI) / 180
  const rotatedWidth =
    Math.abs(croppedSize.width * Math.cos(angle)) +
    Math.abs(croppedSize.height * Math.sin(angle))
  const rotatedHeight =
    Math.abs(croppedSize.width * Math.sin(angle)) +
    Math.abs(croppedSize.height * Math.cos(angle))
  const fitScale = Math.min(slot.rect.width / rotatedWidth, slot.rect.height / rotatedHeight)
  const finalScale = fitScale * (settings.scalePercent / 100)
  const centerXPt = slot.rect.x + slot.rect.width / 2 + settings.offsetXPt
  const centerYFromBottom = slot.rect.y + slot.rect.height / 2 + settings.offsetYPt
  const centerYPt = template.page.heightPt - centerYFromBottom

  return {
    centerXPercent: (centerXPt / template.page.widthPt) * 100,
    centerYPercent: (centerYPt / template.page.heightPt) * 100,
    widthPercent: ((croppedSize.width * finalScale) / template.page.widthPt) * 100,
    heightPercent: ((croppedSize.height * finalScale) / template.page.heightPt) * 100,
    rotationDeg: settings.rotationDeg,
  }
}

const distanceBetween = (
  a: { xPt: number; yPt: number },
  b: { xPt: number; yPt: number },
) => Math.hypot(a.xPt - b.xPt, a.yPt - b.yPt)

const angleBetween = (
  anchor: { xPt: number; yPt: number },
  point: { xPt: number; yPt: number },
) => (Math.atan2(point.yPt - anchor.yPt, point.xPt - anchor.xPt) * 180) / Math.PI

const angleDelta = (fromDeg: number, toDeg: number) => {
  let delta = toDeg - fromDeg

  while (delta > 180) {
    delta -= 360
  }

  while (delta < -180) {
    delta += 360
  }

  return delta
}

const templateMatchesQuery = (template: TemplateDefinition, query: string) => {
  const haystack = [
    template.brand,
    template.name,
    formatSize(template.labelSizeIn),
    formatSize(template.sheetSizeIn),
    `${template.labelsPerSheet} per sheet`,
    ...template.compatibleWith,
  ]
    .join(' ')
    .toLowerCase()

  return haystack.includes(query)
}
