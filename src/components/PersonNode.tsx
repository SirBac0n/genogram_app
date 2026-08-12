import { NODE_HALF, NODE_SIZE, CONDITION_COLORS } from '../constants'
import type { Person } from '../types'

interface PersonNodeProps {
  person: Person
  selected: boolean
  onPointerDown: (e: React.PointerEvent) => void
  onClick: (e: React.MouseEvent) => void
}

export function PersonNode({ person, selected, onPointerDown, onClick }: PersonNodeProps) {
  const { x, y, sex } = person
  const deceased = Boolean(person.deathDate)
  const strokeColor = selected ? '#2563eb' : '#1f1f1f'
  const strokeWidth = person.isProband ? 3.5 : selected ? 2.5 : 1.75

  return (
    <g
      onPointerDown={onPointerDown}
      onClick={onClick}
      style={{ cursor: 'grab' }}
      data-person-id={person.id}
    >
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
        <>
          <line x1={x - NODE_HALF} y1={y - NODE_HALF} x2={x + NODE_HALF} y2={y + NODE_HALF} stroke={strokeColor} strokeWidth={2} />
          <line x1={x - NODE_HALF} y1={y + NODE_HALF} x2={x + NODE_HALF} y2={y - NODE_HALF} stroke={strokeColor} strokeWidth={2} />
        </>
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

      <text x={x} y={y + NODE_HALF + 16} textAnchor="middle" fontSize={12} fill="#1f1f1f">
        {person.firstName} {person.lastName}
      </text>
      {(person.birthDate || person.deathDate) && (
        <text x={x} y={y + NODE_HALF + 30} textAnchor="middle" fontSize={10} fill="#555">
          {person.birthDate ?? '?'} – {person.deathDate ?? ''}
        </text>
      )}
    </g>
  )
}
