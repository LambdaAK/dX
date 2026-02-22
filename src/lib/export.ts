import type { Path } from '@/types/simulation'
import type { Stats } from '@/types/simulation'

function escapeCsvCell(value: number | string): string {
  const s = String(value)
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return '"' + s.replace(/"/g, '""') + '"'
  }
  return s
}

/** CSV string: columns t, x1, x2, ..., xM; one row per time step. */
export function pathsToCsv(paths: Path[]): string {
  if (paths.length === 0) return ''
  const nT = paths[0].t.length
  const header = ['t', ...paths.map((_, i) => `x${i + 1}`)].map(escapeCsvCell).join(',')
  const rows: string[] = [header]
  for (let j = 0; j < nT; j++) {
    const row = [
      paths[0].t[j],
      ...paths.map((p) => p.x[j]),
    ].map((v) => escapeCsvCell(v))
    rows.push(row.join(','))
  }
  return rows.join('\n')
}

/** CSV string: t, mean, std, mean_minus_2sigma, mean_plus_2sigma. */
export function statsToCsv(stats: Stats): string {
  if (stats.t.length === 0) return ''
  const header = 't,mean,std,mean_minus_2sigma,mean_plus_2sigma'
  const rows = stats.t.map((_, i) =>
    [
      stats.t[i],
      stats.mean[i],
      stats.std[i],
      stats.mean[i] - 2 * stats.std[i],
      stats.mean[i] + 2 * stats.std[i],
    ].map(escapeCsvCell).join(',')
  )
  return [header, ...rows].join('\n')
}

export function downloadBlob(
  content: string | Blob,
  filename: string,
  mimeType: string
): void {
  const blob = typeof content === 'string' ? new Blob([content], { type: mimeType }) : content
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/** Get the first SVG element inside a container. */
function getSvgFromContainer(container: HTMLElement | null): SVGElement | null {
  if (!container) return null
  return container.querySelector('svg')
}

/** Serialize SVG to string (including styles needed for fill/stroke). */
function svgToBlob(svg: SVGElement): Blob {
  const clone = svg.cloneNode(true) as SVGElement
  const style = document.createElementNS('http://www.w3.org/2000/svg', 'style')
  style.textContent = `
    .recharts-cartesian-grid line { stroke: #e8e6e3; }
    .recharts-line { stroke: var(--accent, #ea580c); }
    .recharts-area { fill: var(--accent, #ea580c); }
  `
  clone.insertBefore(style, clone.firstChild)
  const s = new XMLSerializer().serializeToString(clone)
  return new Blob([s], { type: 'image/svg+xml;charset=utf-8' })
}

/** Export chart container's SVG as downloadable SVG file. */
export function exportChartSvg(container: HTMLElement | null, filename: string): void {
  const svg = getSvgFromContainer(container)
  if (!svg) return
  const blob = svgToBlob(svg)
  downloadBlob(blob, filename, 'image/svg+xml;charset=utf-8')
}

/** Export chart container's SVG as PNG via canvas. */
export function exportChartPng(container: HTMLElement | null, filename: string): void {
  const svg = getSvgFromContainer(container)
  if (!svg) return
  const clone = svg.cloneNode(true) as SVGElement
  const s = new XMLSerializer().serializeToString(clone)
  const img = new Image()
  const canvas = document.createElement('canvas')
  img.onload = () => {
    canvas.width = img.width
    canvas.height = img.height
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.fillStyle = '#faf9f7'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(img, 0, 0)
    canvas.toBlob((blob) => {
      if (blob) downloadBlob(blob, filename, 'image/png')
    }, 'image/png')
  }
  img.onerror = () => {}
  img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(s)))
}
