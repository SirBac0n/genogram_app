import { useEffect, useMemo, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { PersonNode } from './PersonNode'
import { UnionLines } from './UnionLines'
import { SiblingLines } from './SiblingLines'
import type { Selection } from '../types'
import type { useGenogramStore } from '../state/useGenogramStore'

export type Mode =
  | 'select'
  | 'multi-select'
  | 'add-male'
  | 'add-female'
  | 'add-unknown'
  | 'link-partner'
  | 'link-child'
  | 'link-sibling'

interface CanvasProps {
  store: ReturnType<typeof useGenogramStore>
  mode: Mode
  onModeConsumed: () => void
  selection: Selection
  onSelect: (selection: Selection) => void
  multiSelectedIds: Set<string>
  onToggleMultiSelect: (id: string) => void
  onClearMultiSelect: () => void
}

interface ViewState {
  x: number
  y: number
  scale: number
}

const DRAG_THRESHOLD = 4

function safeSetPointerCapture(el: Element, pointerId: number) {
  try {
    el.setPointerCapture(pointerId)
  } catch {
    // Pointer capture can fail (e.g. pointer already released); the SVG's own
    // listeners still receive move/up events as long as the pointer stays inside it.
  }
}

export function Canvas({
  store,
  mode,
  onModeConsumed,
  selection,
  onSelect,
  multiSelectedIds,
  onToggleMultiSelect,
  onClearMultiSelect,
}: CanvasProps) {
  const { state } = store
  const svgRef = useRef<SVGSVGElement>(null)
  const [view, setView] = useState<ViewState>({ x: 0, y: 0, scale: 1 })
  const [pendingLink, setPendingLink] = useState<string | null>(null)

  const panState = useRef<{ startX: number; startY: number; viewX: number; viewY: number } | null>(null)
  const dragState = useRef<{
    personIds: string[]
    startClientX: number
    startClientY: number
    startPositions: Map<string, { x: number; y: number }>
    moved: boolean
  } | null>(null)
  const activePointers = useRef<Map<number, { x: number; y: number }>>(new Map())
  const pinchState = useRef<{
    startDist: number
    startCenter: { x: number; y: number }
    startView: ViewState
  } | null>(null)

  const peopleById = useMemo(() => new Map(state.people.map((p) => [p.id, p])), [state.people])

  function clientToWorld(clientX: number, clientY: number) {
    const svg = svgRef.current
    if (!svg) return { x: 0, y: 0 }
    const rect = svg.getBoundingClientRect()
    const sx = clientX - rect.left
    const sy = clientY - rect.top
    return { x: (sx - view.x) / view.scale, y: (sy - view.y) / view.scale }
  }

  function handleBackgroundPointerDown(e: ReactPointerEvent<SVGSVGElement>) {
    if (e.target !== svgRef.current) return
    activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    safeSetPointerCapture(e.target as Element, e.pointerId)

    if (activePointers.current.size === 2) {
      panState.current = null
      const [p1, p2] = Array.from(activePointers.current.values())
      pinchState.current = {
        startDist: Math.hypot(p1.x - p2.x, p1.y - p2.y),
        startCenter: { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 },
        startView: view,
      }
      return
    }
    if (activePointers.current.size > 2) return

    if (mode.startsWith('add-')) {
      const sex = mode === 'add-male' ? 'male' : mode === 'add-female' ? 'female' : 'unknown'
      const { x, y } = clientToWorld(e.clientX, e.clientY)
      store.addPerson(sex, x, y)
      onModeConsumed()
      return
    }
    if (mode === 'select') onSelect({ kind: null, id: null })
    panState.current = { startX: e.clientX, startY: e.clientY, viewX: view.x, viewY: view.y }
  }

  function handleBackgroundPointerMove(e: ReactPointerEvent<SVGSVGElement>) {
    if (activePointers.current.has(e.pointerId)) {
      activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    }

    if (pinchState.current && activePointers.current.size === 2) {
      const svg = svgRef.current
      const pinch = pinchState.current
      if (svg && pinch.startDist > 0) {
        const [p1, p2] = Array.from(activePointers.current.values())
        const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y)
        const center = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 }
        const rect = svg.getBoundingClientRect()
        const newScale = Math.min(3, Math.max(0.3, pinch.startView.scale * (dist / pinch.startDist)))
        const startCenterLocal = { x: pinch.startCenter.x - rect.left, y: pinch.startCenter.y - rect.top }
        const worldX = (startCenterLocal.x - pinch.startView.x) / pinch.startView.scale
        const worldY = (startCenterLocal.y - pinch.startView.y) / pinch.startView.scale
        const currentCenterLocal = { x: center.x - rect.left, y: center.y - rect.top }
        setView({
          scale: newScale,
          x: currentCenterLocal.x - worldX * newScale,
          y: currentCenterLocal.y - worldY * newScale,
        })
      }
      return
    }

    if (panState.current) {
      const { startX, startY, viewX, viewY } = panState.current
      const dx = e.clientX - startX
      const dy = e.clientY - startY
      setView((v) => ({ ...v, x: viewX + dx, y: viewY + dy }))
    }
    if (dragState.current) {
      const d = dragState.current
      const dx = e.clientX - d.startClientX
      const dy = e.clientY - d.startClientY
      if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) d.moved = true
      if (d.moved) {
        for (const id of d.personIds) {
          const start = d.startPositions.get(id)
          if (start) store.movePerson(id, start.x + dx / view.scale, start.y + dy / view.scale)
        }
      }
    }
  }

  function handleBackgroundPointerUp(e: ReactPointerEvent<SVGSVGElement>) {
    activePointers.current.delete(e.pointerId)
    if (activePointers.current.size < 2) {
      pinchState.current = null
    }
    if (activePointers.current.size === 1) {
      const [[, pos]] = Array.from(activePointers.current.entries())
      panState.current = { startX: pos.x, startY: pos.y, viewX: view.x, viewY: view.y }
    } else {
      if (mode === 'multi-select' && panState.current) {
        const dx = e.clientX - panState.current.startX
        const dy = e.clientY - panState.current.startY
        if (Math.abs(dx) <= DRAG_THRESHOLD && Math.abs(dy) <= DRAG_THRESHOLD) {
          onClearMultiSelect()
        }
      }
      panState.current = null
    }
    dragState.current = null
  }

  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    function onWheel(e: WheelEvent) {
      e.preventDefault()
      const rect = svg!.getBoundingClientRect()
      const cx = e.clientX - rect.left
      const cy = e.clientY - rect.top
      const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1
      setView((v) => {
        const newScale = Math.min(3, Math.max(0.3, v.scale * factor))
        const worldX = (cx - v.x) / v.scale
        const worldY = (cy - v.y) / v.scale
        return { scale: newScale, x: cx - worldX * newScale, y: cy - worldY * newScale }
      })
    }
    svg.addEventListener('wheel', onWheel, { passive: false })
    return () => svg.removeEventListener('wheel', onWheel)
  }, [])

  function handlePersonPointerDown(e: ReactPointerEvent, personId: string) {
    e.stopPropagation()
    if (mode === 'select' || mode === 'multi-select') {
      const isGroup = multiSelectedIds.has(personId) && multiSelectedIds.size >= 2
      const ids = isGroup ? Array.from(multiSelectedIds) : [personId]
      const startPositions = new Map<string, { x: number; y: number }>()
      for (const id of ids) {
        const p = peopleById.get(id)
        if (p) startPositions.set(id, { x: p.x, y: p.y })
      }
      if (startPositions.size === 0) return
      dragState.current = {
        personIds: ids,
        startClientX: e.clientX,
        startClientY: e.clientY,
        startPositions,
        moved: false,
      }
      safeSetPointerCapture(e.target as Element, e.pointerId)
    }
  }

  function handlePersonClick(e: React.MouseEvent, personId: string) {
    e.stopPropagation()
    if (dragState.current?.moved) return
    if (mode === 'select') {
      onSelect({ kind: 'person', id: personId })
      return
    }
    if (mode === 'multi-select') {
      onToggleMultiSelect(personId)
      return
    }
    if (mode === 'link-partner') {
      if (!pendingLink) {
        setPendingLink(personId)
      } else if (pendingLink !== personId) {
        store.addUnion(pendingLink, personId)
        setPendingLink(null)
        onModeConsumed()
      }
      return
    }
    if (mode === 'link-child') {
      if (!pendingLink) {
        setPendingLink(personId)
      } else if (pendingLink !== personId) {
        store.linkParentChild(pendingLink, personId, 'biological')
        setPendingLink(null)
        onModeConsumed()
      }
      return
    }
    if (mode === 'link-sibling') {
      if (!pendingLink) {
        setPendingLink(personId)
      } else if (pendingLink !== personId) {
        store.addSiblingLink(pendingLink, personId)
        setPendingLink(null)
        onModeConsumed()
      }
      return
    }
  }

  function handleUnionClick(e: React.MouseEvent, unionId: string) {
    e.stopPropagation()
    if (mode === 'select') onSelect({ kind: 'union', id: unionId })
  }

  function handleChildLinkClick(e: React.MouseEvent, unionId: string, childId: string) {
    e.stopPropagation()
    if (mode === 'select') onSelect({ kind: 'child-link', id: unionId, childId })
  }

  function handleSiblingLinkClick(e: React.MouseEvent, linkId: string) {
    e.stopPropagation()
    if (mode === 'select') onSelect({ kind: 'sibling-link', id: linkId })
  }

  const cursor = mode.startsWith('add-') ? 'crosshair' : mode !== 'select' ? 'pointer' : 'default'

  return (
    <svg
      ref={svgRef}
      style={{ width: '100%', height: '100%', touchAction: 'none', cursor }}
      onPointerDown={handleBackgroundPointerDown}
      onPointerMove={handleBackgroundPointerMove}
      onPointerUp={handleBackgroundPointerUp}
    >
      <defs>
        <marker id="proband-arrow" markerWidth={8} markerHeight={8} refX={6} refY={4} orient="auto">
          <path d="M0,0 L8,4 L0,8 Z" fill="#2563eb" />
        </marker>
        <pattern id="bg-dots" width={24} height={24} patternUnits="userSpaceOnUse">
          <circle cx={1} cy={1} r={1} fill="#e2e2e2" />
        </pattern>
      </defs>
      <rect x={-5000} y={-5000} width={10000} height={10000} fill="url(#bg-dots)" pointerEvents="none" />
      <g transform={`translate(${view.x} ${view.y}) scale(${view.scale})`}>
        {state.siblingLinks.map((l) => (
          <SiblingLines
            key={l.id}
            link={l}
            peopleById={peopleById}
            selected={selection.kind === 'sibling-link' && selection.id === l.id}
            onClick={(e) => handleSiblingLinkClick(e, l.id)}
          />
        ))}
        {state.unions.map((u) => (
          <UnionLines
            key={u.id}
            union={u}
            peopleById={peopleById}
            selected={selection.kind === 'union' && selection.id === u.id}
            selectedChildId={selection.kind === 'child-link' && selection.id === u.id ? selection.childId : null}
            onClick={(e) => handleUnionClick(e, u.id)}
            onChildClick={(e, childId) => handleChildLinkClick(e, u.id, childId)}
          />
        ))}
        {state.people.map((p) => (
          <PersonNode
            key={p.id}
            person={p}
            selected={
              (selection.kind === 'person' && selection.id === p.id) || pendingLink === p.id
            }
            multiSelected={multiSelectedIds.has(p.id)}
            onPointerDown={(e) => handlePersonPointerDown(e, p.id)}
            onClick={(e) => handlePersonClick(e, p.id)}
          />
        ))}
      </g>
    </svg>
  )
}
