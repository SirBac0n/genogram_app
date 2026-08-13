import { NODE_HALF, NODE_SIZE, CONDITION_COLORS } from '../constants'
import type { Person } from '../types'

interface PersonNodeProps {
  person: Person
  selected: boolean
  multiSelected?: boolean
  onPointerDown: (e: React.PointerEvent) => void
  onClick: (e: React.MouseEvent) => void
}

const MULTI_SELECT_RING_PAD = 7
const MULTI_SELECT_COLOR = '#f59e0b'
const PREMATURE_DEATH_COLOR = '#dc2626'

// Gives labels a white halo so a relationship line passing behind the text
// doesn't visually cut through the letters.
const labelHaloStyle: React.CSSProperties = {
  paintOrder: 'stroke',
  stroke: '#ffffff',
  strokeWidth: 4,
  strokeLinejoin: 'round',
}

export function PersonNode({ person, selected, multiSelected = false, onPointerDown, onClick }: PersonNodeProps) {
  const { x, y, sex } = person
  const deceased = Boolean(person.deathDate)
  const strokeColor = selected ? '#2563eb' : '#1f1f1f'
  const strokeWidth = person.isProband ? 3.5 : selected ? 2.5 : 1.75
  const ringHalf = NODE_HALF + MULTI_SELECT_RING_PAD

  return (
    <g
      onPointerDown={onPointerDown}
      onClick={onClick}
      style={{ cursor: 'grab' }}
      data-person-id={person.id}
    >
      {multiSelected && sex === 'male' && (
        <rect
          x={x - ringHalf}
          y={y - ringHalf}
          width={ringHalf * 2}
          height={ringHalf * 2}
          fill="none"
          stroke={MULTI_SELECT_COLOR}
          strokeWidth={2}
          strokeDasharray="4,3"
        />
      )}
      {multiSelected && sex === 'female' && (
        <circle cx={x} cy={y} r={ringHalf} fill="none" stroke={MULTI_SELECT_COLOR} strokeWidth={2} strokeDasharray="4,3" />
      )}
      {multiSelected && sex === 'unknown' && (
        <polygon
          points={`${x},${y - ringHalf} ${x + ringHalf},${y} ${x},${y + ringHalf} ${x - ringHalf},${y}`}
          fill="none"
          stroke={MULTI_SELECT_COLOR}
          strokeWidth={2}
          strokeDasharray="4,3"
        />
      )}

      {sex === 'male' && (
        <rect
          x={x - NODE_HALF}
          y={y - NODE_HALF}
          width={NODE_SIZE}
          height={NODE_SIZE}
          fill="#ffffff"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
        />
      )}
      {sex === 'female' && (
        <circle cx={x} cy={y} r={NODE_HALF} fill="#ffffff" stroke={strokeColor} strokeWidth={strokeWidth} />
      )}
      {sex === 'unknown' && (
        <polygon
          points={`${x},${y - NODE_HALF} ${x + NODE_HALF},${y} ${x},${y + NODE_HALF} ${x - NODE_HALF},${y}`}
          fill="#ffffff"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
        />
      )}

      {deceased && (
        <g stroke={person.prematureDeath ? PREMATURE_DEATH_COLOR : strokeColor} strokeWidth={2}>
          {person.prematureDeath && <title>Premature / unexpected death</title>}
          <line x1={x - NODE_HALF} y1={y - NODE_HALF} x2={x + NODE_HALF} y2={y + NODE_HALF} />
          <line x1={x - NODE_HALF} y1={y + NODE_HALF} x2={x + NODE_HALF} y2={y - NODE_HALF} />
        </g>
      )}

      {person.isProband && (
        <path
          d={`M ${x - NODE_HALF - 22} ${y + 14} L ${x - NODE_HALF - 4} ${y + 2}`}
          stroke="#2563eb"
          strokeWidth={2.5}
          markerEnd="url(#proband-arrow)"
          fill="none"
        />
      )}

      {person.conditions.slice(0, 6).map((c, i) => {
        const angle = (i / 6) * Math.PI * 2 - Math.PI / 2
        const r = NODE_HALF + 9
        const cx = x + Math.cos(angle) * r
        const cy = y + Math.sin(angle) * r
        return (
          <circle key={c.id} cx={cx} cy={cy} r={5} fill={CONDITION_COLORS[c.category] ?? '#888'}>
            <title>{c.label}</title>
          </circle>
        )
      })}

      <text x={x} y={y + NODE_HALF + 16} textAnchor="middle" fontSize={12} fill="#1f1f1f" style={labelHaloStyle}>
        {person.firstName} {person.lastName}
      </text>
      {(person.birthDate || person.deathDate) && (
        <text x={x} y={y + NODE_HALF + 30} textAnchor="middle" fontSize={10} fill="#555" style={labelHaloStyle}>
          {person.birthDate ?? '?'} – {person.deathDate ?? ''}
        </text>
      )}
    </g>
  )
}
