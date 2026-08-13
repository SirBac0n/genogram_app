import { CHILD_DROP, NODE_HALF } from '../constants'
import { HitLine } from './HitLine'
import type { Person, RelationshipQuality, Union } from '../types'

interface UnionLinesProps {
  union: Union
  peopleById: Map<string, Person>
  selected: boolean
  selectedChildId?: string | null
  onClick: (e: React.MouseEvent) => void
  onChildClick: (e: React.MouseEvent, childId: string) => void
}

export function UnionLines({ union, peopleById, selected, selectedChildId, onClick, onChildClick }: UnionLinesProps) {
  const partners = union.partnerIds.map((id) => peopleById.get(id)).filter((p): p is Person => Boolean(p))
  const children = union.children
    .map((c) => peopleById.get(c.childId))
    .filter((p): p is Person => Boolean(p))

  if (partners.length === 0) return null

  const anchor =
    partners.length === 2
      ? { x: (partners[0].x + partners[1].x) / 2, y: (partners[0].y + partners[1].y) / 2 }
      : { x: partners[0].x, y: partners[0].y + NODE_HALF }

  const strokeColor = selected ? '#2563eb' : '#1f1f1f'
  const dash =
    union.type === 'partnered' ? '6,4' : union.type === 'affair' ? '2,4' : undefined

  const busY = anchor.y + CHILD_DROP

  return (
    <g onClick={onClick} style={{ cursor: 'pointer' }}>
      {partners.length === 2 && (
        <>
          <HitLine x1={partners[0].x} y1={partners[0].y} x2={partners[1].x} y2={partners[1].y} />
          <line
            x1={partners[0].x}
            y1={partners[0].y}
            x2={partners[1].x}
            y2={partners[1].y}
            stroke={strokeColor}
            strokeWidth={selected ? 2.5 : 1.75}
            strokeDasharray={dash}
          />
        </>
      )}

      {(union.type === 'separated' || union.type === 'divorced') && partners.length === 2 && (
        <SlashMarks x={anchor.x} y={anchor.y} count={union.type === 'divorced' ? 2 : 1} />
      )}

      {union.quality && partners.length === 2 && (
        <QualityLine
          x1={partners[0].x}
          y1={partners[0].y}
          x2={partners[1].x}
          y2={partners[1].y}
          quality={union.quality}
        />
      )}

      {children.length > 0 && (
        <>
          <HitLine x1={anchor.x} y1={anchor.y} x2={anchor.x} y2={busY} />
          <line x1={anchor.x} y1={anchor.y} x2={anchor.x} y2={busY} stroke={strokeColor} strokeWidth={1.5} />
          <HitLine
            x1={Math.min(anchor.x, ...children.map((c) => c.x))}
            y1={busY}
            x2={Math.max(anchor.x, ...children.map((c) => c.x))}
            y2={busY}
          />
          <line
            x1={Math.min(anchor.x, ...children.map((c) => c.x))}
            y1={busY}
            x2={Math.max(anchor.x, ...children.map((c) => c.x))}
            y2={busY}
            stroke={strokeColor}
            strokeWidth={1.5}
          />
          {children.map((child, i) => {
            const link = union.children.find((c) => c.childId === child.id)
            const childDash = link?.outOfWedlock
              ? '5,2,1,2'
              : link?.type === 'foster'
                ? '4,3'
                : link?.type === 'adopted'
                  ? '1,3'
                  : undefined
            const childSelected = selectedChildId === child.id
            const childColor = childSelected ? '#2563eb' : strokeColor
            return (
              <g
                key={i}
                onClick={(e) => {
                  e.stopPropagation()
                  onChildClick(e, child.id)
                }}
                style={{ cursor: 'pointer' }}
              >
                <HitLine x1={child.x} y1={busY} x2={child.x} y2={child.y - NODE_HALF} />
                <line
                  x1={child.x}
                  y1={busY}
                  x2={child.x}
                  y2={child.y - NODE_HALF}
                  stroke={childColor}
                  strokeWidth={childSelected ? 2.5 : 1.5}
                  strokeDasharray={childDash}
                />
                {link?.quality && (
                  <QualityLine
                    x1={child.x}
                    y1={busY}
                    x2={child.x}
                    y2={child.y - NODE_HALF}
                    quality={link.quality}
                  />
                )}
              </g>
            )
          })}
        </>
      )}
    </g>
  )
}

function SlashMarks({ x, y, count }: { x: number; y: number; count: number }) {
  const marks = []
  for (let i = 0; i < count; i++) {
    const offset = (i - (count - 1) / 2) * 10
    marks.push(
      <line
        key={i}
        x1={x + offset - 6}
        y1={y + 8}
        x2={x + offset + 6}
        y2={y - 8}
        stroke="#1f1f1f"
        strokeWidth={2}
      />,
    )
  }
  return <>{marks}</>
}

function getPerpendicular(x1: number, y1: number, x2: number, y2: number) {
  const dx = x2 - x1
  const dy = y2 - y1
  const len = Math.hypot(dx, dy) || 1
  return { x: -dy / len, y: dx / len }
}

function zigzagPath(x1: number, y1: number, x2: number, y2: number, amplitude = 3.5, segments = 10): string {
  const perp = getPerpendicular(x1, y1, x2, y2)
  let d = `M ${x1} ${y1}`
  for (let i = 1; i <= segments; i++) {
    const t = i / segments
    const px = x1 + (x2 - x1) * t
    const py = y1 + (y2 - y1) * t
    const offset = i === segments ? 0 : (i % 2 === 0 ? 1 : -1) * amplitude
    d += ` L ${px + perp.x * offset} ${py + perp.y * offset}`
  }
  return d
}

function ParallelLines({ x1, y1, x2, y2, color }: { x1: number; y1: number; x2: number; y2: number; color: string }) {
  const perp = getPerpendicular(x1, y1, x2, y2)
  const offsets = [-3.5, 0, 3.5]
  return (
    <>
      {offsets.map((o) => (
        <line
          key={o}
          x1={x1 + perp.x * o}
          y1={y1 + perp.y * o}
          x2={x2 + perp.x * o}
          y2={y2 + perp.y * o}
          stroke={color}
          strokeWidth={1.5}
        />
      ))}
    </>
  )
}

interface QualityLineProps {
  x1: number
  y1: number
  x2: number
  y2: number
  quality: RelationshipQuality
}

export function QualityLine({ x1, y1, x2, y2, quality }: QualityLineProps) {
  const perp = getPerpendicular(x1, y1, x2, y2)
  const offset = 8
  const qx1 = x1 + perp.x * offset
  const qy1 = y1 + perp.y * offset
  const qx2 = x2 + perp.x * offset
  const qy2 = y2 + perp.y * offset
  const color = '#1f1f1f'

  switch (quality) {
    case 'distant':
      return <line x1={qx1} y1={qy1} x2={qx2} y2={qy2} stroke={color} strokeWidth={1.5} strokeDasharray="2,3" />
    case 'cutoff':
      return (
        <>
          <line x1={qx1} y1={qy1} x2={qx2} y2={qy2} stroke={color} strokeWidth={1.5} strokeDasharray="2,3" />
          <SlashMarks x={(qx1 + qx2) / 2} y={(qy1 + qy2) / 2} count={2} />
        </>
      )
    case 'conflict':
      return <path d={zigzagPath(qx1, qy1, qx2, qy2)} stroke={color} strokeWidth={1.5} fill="none" />
    case 'enmeshed':
      return <ParallelLines x1={qx1} y1={qy1} x2={qx2} y2={qy2} color={color} />
    case 'abuse':
      return (
        <>
          <ParallelLines x1={qx1} y1={qy1} x2={qx2} y2={qy2} color={color} />
          <path d={zigzagPath(qx1, qy1, qx2, qy2, 5, 10)} stroke={color} strokeWidth={1.5} fill="none" />
        </>
      )
    default:
      return null
  }
}
