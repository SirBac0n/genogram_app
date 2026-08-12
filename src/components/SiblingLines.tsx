import { QualityLine } from './UnionLines'
import { HitLine } from './HitLine'
import type { Person, SiblingLink } from '../types'

interface SiblingLinesProps {
  link: SiblingLink
  peopleById: Map<string, Person>
  selected: boolean
  onClick: (e: React.MouseEvent) => void
}

export function SiblingLines({ link, peopleById, selected, onClick }: SiblingLinesProps) {
  const a = peopleById.get(link.personAId)
  const b = peopleById.get(link.personBId)
  if (!a || !b) return null

  const strokeColor = selected ? '#2563eb' : '#c9c9c9'

  return (
    <g onClick={onClick} style={{ cursor: 'pointer' }}>
      <HitLine x1={a.x} y1={a.y} x2={b.x} y2={b.y} />
      <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={strokeColor} strokeWidth={selected ? 2.5 : 1} strokeDasharray="3,3" />
      {link.quality && <QualityLine x1={a.x} y1={a.y} x2={b.x} y2={b.y} quality={link.quality} />}
    </g>
  )
}
