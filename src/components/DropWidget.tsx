import { useEffect, useRef, type ReactNode } from 'react'

interface DropWidgetProps {
  /** Pill content (icon + status text). */
  pill: ReactNode
  /** Highlights the pill while the tool is running. */
  active: boolean
  /** Main pill click — toggles the tool on/off, never the panel. */
  onToggle: () => void
  expanded: boolean
  setExpanded: (v: boolean) => void
  toggleLabel: string
  panelLabel: string
  children: ReactNode
}

/**
 * Header widget: a pill that toggles a tool on/off, with a chevron that drops
 * down a settings panel. Escape / outside-click collapses the panel;
 * collapsing never stops the tool.
 */
export function DropWidget({
  pill,
  active,
  onToggle,
  expanded,
  setExpanded,
  toggleLabel,
  panelLabel,
  children,
}: DropWidgetProps) {
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!expanded) return
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setExpanded(false)
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setExpanded(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [expanded, setExpanded])

  return (
    <div className="widget" ref={rootRef}>
      <div className={`widget-pill${active ? ' active' : ''}`}>
        <button className="widget-toggle" onClick={onToggle} aria-label={toggleLabel}>
          {pill}
        </button>
        <button
          className="widget-chevron"
          onClick={() => setExpanded(!expanded)}
          aria-label={panelLabel}
          aria-expanded={expanded}
        >
          {expanded ? '▴' : '▾'}
        </button>
      </div>
      {expanded && <div className="widget-panel">{children}</div>}
    </div>
  )
}
