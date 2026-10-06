
export function round2(v: number): number {
  return Math.round(v * 100) / 100
}

export function roundRect(r: number[]): number[] {
  return r.map(round2)
}

export function toPDFRect(pageScale: number, cssX: number, cssY: number, cssW: number, cssH: number): number[] {
  return roundRect([
    cssX / pageScale,
    cssY / pageScale,
    cssW / pageScale,
    cssH / pageScale,
  ])
}

export function toCSSPixel(pageScale: number, v: number): number {
  return v * pageScale
}

export function rectStyle(pageScale: number, f: any, selectedIndex: number | null): Record<string, string> {
  const selected = selectedIndex === f._index
  const c = f._def.color
  return {
    left: toCSSPixel(pageScale, f.rect[0]) + 'px',
    top: toCSSPixel(pageScale, f.rect[1]) + 'px',
    width: toCSSPixel(pageScale, f.rect[2]) + 'px',
    height: toCSSPixel(pageScale, f.rect[3]) + 'px',
    borderColor: c,
    backgroundColor: c + (selected ? '26' : '14'),
    boxShadow: selected ? `0 0 0 2px ${c}40` : 'none',
  }
}