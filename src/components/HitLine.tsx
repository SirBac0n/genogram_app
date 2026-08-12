interface HitLineProps {
  x1: number
  y1: number
  x2: number
  y2: number
}

const HIT_WIDTH = 20

export function HitLine({ x1, y1, x2, y2 }: HitLineProps) {
  return (
    <line
      x1={x1}
      y1={y1}
      x2={x2}
      y2={y2}
      stroke="transparent"
      strokeWidth={HIT_WIDTH}
      pointerEvents="stroke"
    />
  )
}
