import { useEffect, useMemo, useRef, useState } from 'react'
import type { ChangeEvent, DragEvent } from 'react'
import {
  ChevronDown,
  Download,
  FileText,
  Move,
  Printer,
  RefreshCcw,
  RotateCcw,
  RotateCw,
  SlidersHorizontal,
  Upload,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import { loadLabelSource, supportsFile } from './labelProcessing'
import { AVERY_8126_TEMPLATE } from './template'
import { DEFAULT_SETTINGS, loadSettings, saveSettings } from './settings'
import { createPrintablePdf, renderSheetToCanvas } from './sheetRenderer'
import type { LabelSource, PlacementSettings, SlotMode } from './types'

const PREVIEW_SCALE = 1.55

const slotOptions: Array<{ value: SlotMode; label: string }> = [
  { value: 'top', label: 'Top' },
  { value: 'bottom', label: 'Bottom' },
  { value: 'both', label: 'Both' },
]

const formatPx = (value: number) => `${Math.round(value).toLocaleString()} px`

function App() {
  const [settings, setSettings] = useState<PlacementSettings>(() => loadSettings())
  const [source, setSource] = useState<LabelSource | null>(null)
  const [status, setStatus] = useState('Ready')
  const [error, setError] = useState('')
  const [isBusy, setIsBusy] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [isMovingLabel, setIsMovingLabel] = useState(false)
  const dragStateRef = useRef<{ xPt: number; yPt: number } | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const croppedSize = useMemo(() => {
    if (!source) {
      return null
    }

    const pad = settings.cropPaddingPx
    const width = Math.min(source.renderedCanvas.width, source.detectedBounds.width + pad * 2)
    const height = Math.min(source.renderedCanvas.height, source.detectedBounds.height + pad * 2)
    return { width, height }
  }, [settings.cropPaddingPx, source])

  useEffect(() => {
    saveSettings(settings)
  }, [settings])

  useEffect(() => {
    if (!canvasRef.current) {
      return
    }

    renderSheetToCanvas(canvasRef.current, source, settings, {
      drawBackground: true,
      scale: PREVIEW_SCALE,
    })
  }, [settings, source])

  const updateSetting = <Key extends keyof PlacementSettings>(
    key: Key,
    value: PlacementSettings[Key],
  ) => {
    setSettings((current) => ({ ...current, [key]: value }))
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
      const prepared = await createPrintablePdf(source, settings)
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
      const prepared = await createPrintablePdf(source, settings)
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
    setSettings(DEFAULT_SETTINGS)
  }

  const changeScale = (delta: number) => {
    setSettings((current) => ({
      ...current,
      scalePercent: clamp(roundToHalf(current.scalePercent + delta), 70, 130),
    }))
  }

  const changeRotation = (delta: number) => {
    setSettings((current) => ({
      ...current,
      rotationDeg: normalizeDegrees(roundToHalf(current.rotationDeg + delta)),
    }))
  }

  const getPreviewPoint = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current
    if (!canvas) {
      return null
    }

    const rect = canvas.getBoundingClientRect()
    return {
      xPt: ((clientX - rect.left) / rect.width) * AVERY_8126_TEMPLATE.page.widthPt,
      yPt: ((clientY - rect.top) / rect.height) * AVERY_8126_TEMPLATE.page.heightPt,
    }
  }

  const handlePreviewPointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!source) {
      return
    }

    const point = getPreviewPoint(event.clientX, event.clientY)
    if (!point) {
      return
    }

    event.currentTarget.setPointerCapture(event.pointerId)
    dragStateRef.current = point
    setIsMovingLabel(true)
  }

  const handlePreviewPointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const lastPoint = dragStateRef.current
    if (!lastPoint) {
      return
    }

    const nextPoint = getPreviewPoint(event.clientX, event.clientY)
    if (!nextPoint) {
      return
    }

    const dx = nextPoint.xPt - lastPoint.xPt
    const dy = nextPoint.yPt - lastPoint.yPt
    dragStateRef.current = nextPoint

    setSettings((current) => ({
      ...current,
      offsetXPt: clamp(roundToHalf(current.offsetXPt + dx), -144, 144),
      offsetYPt: clamp(roundToHalf(current.offsetYPt - dy), -144, 144),
    }))
  }

  const finishPreviewDrag = (event: React.PointerEvent<HTMLCanvasElement>) => {
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
          <p className="eyebrow">Avery 8126</p>
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

            <div className="segmented" aria-label="Label slot">
              {slotOptions.map((option) => (
                <button
                  className={settings.slotMode === option.value ? 'selected' : ''}
                  key={option.value}
                  type="button"
                  onClick={() => updateSetting('slotMode', option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>

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
                <dd>{AVERY_8126_TEMPLATE.name}</dd>
              </div>
              <div>
                <dt>Page</dt>
                <dd>8.5 in x 11 in</dd>
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
        </aside>

        <section className="preview-panel" aria-label="Sheet preview">
          <div className="preview-toolbar">
            <span className="preview-title">
              <Move size={16} aria-hidden="true" />
              Drag label to adjust
            </span>
            <div className="preview-actions" aria-label="Preview placement controls">
              <button
                className="icon-button"
                type="button"
                title="Scale down"
                onClick={() => changeScale(-2.5)}
                disabled={!source}
              >
                <ZoomOut size={16} aria-hidden="true" />
              </button>
              <button
                className="icon-button"
                type="button"
                title="Scale up"
                onClick={() => changeScale(2.5)}
                disabled={!source}
              >
                <ZoomIn size={16} aria-hidden="true" />
              </button>
              <button
                className="icon-button"
                type="button"
                title="Rotate left"
                onClick={() => changeRotation(-1)}
                disabled={!source}
              >
                <RotateCcw size={16} aria-hidden="true" />
              </button>
              <button
                className="icon-button"
                type="button"
                title="Rotate right"
                onClick={() => changeRotation(1)}
                disabled={!source}
              >
                <RotateCw size={16} aria-hidden="true" />
              </button>
            </div>
            <span>{settings.slotMode === 'both' ? 'Top + bottom' : `${settings.slotMode} slot`}</span>
          </div>
          <div className="sheet-wrap">
            <canvas
              ref={canvasRef}
              className={`sheet-canvas ${source ? 'is-interactive' : ''} ${
                isMovingLabel ? 'is-moving' : ''
              }`}
              onPointerDown={handlePreviewPointerDown}
              onPointerMove={handlePreviewPointerMove}
              onPointerUp={finishPreviewDrag}
              onPointerCancel={finishPreviewDrag}
              onPointerLeave={(event) => {
                if (dragStateRef.current) {
                  finishPreviewDrag(event)
                }
              }}
            />
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
