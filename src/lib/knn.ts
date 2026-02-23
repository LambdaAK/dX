/**
 * K-Nearest Neighbors: classification and regression in 2D.
 * Uses Euclidean distance; classification by majority vote, regression by mean of k targets.
 */

export type Point2D = { x: number; y: number }

export type TrainingPoint = Point2D & { label: string }

export type TrainingPointRegression = Point2D & { value: number }

function sqEuclidean(a: Point2D, b: Point2D): number {
  const dx = a.x - b.x
  const dy = a.y - b.y
  return dx * dx + dy * dy
}

/**
 * Find indices of k nearest training points to query (by Euclidean distance).
 * Ties in distance are broken by original index (stable sort).
 */
function nearestIndices(
  query: Point2D,
  training: Point2D[],
  k: number
): number[] {
  if (training.length === 0) return []
  const n = Math.min(k, training.length)
  const withDist: { i: number; d2: number }[] = training.map((p, i) => ({
    i,
    d2: sqEuclidean(query, p),
  }))
  withDist.sort((a, b) => a.d2 !== b.d2 ? a.d2 - b.d2 : a.i - b.i)
  return withDist.slice(0, n).map((x) => x.i)
}

/**
 * KNN classification: predict label by majority vote among k nearest neighbors.
 */
export function knnPredict(
  query: Point2D,
  training: TrainingPoint[],
  k: number
): string {
  if (training.length === 0) throw new Error('No training data')
  const indices = nearestIndices(query, training, k)
  const counts: Record<string, number> = {}
  for (const i of indices) {
    const label = training[i].label
    counts[label] = (counts[label] ?? 0) + 1
  }
  let bestLabel = training[indices[0]].label
  let bestCount = 0
  for (const [label, count] of Object.entries(counts)) {
    if (count > bestCount) {
      bestCount = count
      bestLabel = label
    }
  }
  return bestLabel
}

/**
 * KNN regression: predict value as mean of k nearest neighbors' values.
 */
export function knnPredictRegression(
  query: Point2D,
  training: TrainingPointRegression[],
  k: number
): number {
  if (training.length === 0) throw new Error('No training data')
  const indices = nearestIndices(query, training, k)
  let sum = 0
  for (const i of indices) sum += training[i].value
  return sum / indices.length
}

/**
 * Get the k nearest neighbors (points and distances) for a query. Useful for visualization.
 */
export function getKNearest(
  query: Point2D,
  training: TrainingPoint[],
  k: number
): { point: TrainingPoint; dist: number }[] {
  const indices = nearestIndices(query, training, k)
  return indices.map((i) => {
    const p = training[i]
    return {
      point: p,
      dist: Math.sqrt(sqEuclidean(query, p)),
    }
  })
}

/**
 * Compute predicted class for each point on a 2D grid (for decision boundary).
 */
export function knnDecisionGrid(
  training: TrainingPoint[],
  k: number,
  xMin: number,
  xMax: number,
  yMin: number,
  yMax: number,
  nX: number,
  nY: number
): { x: number; y: number; label: string }[] {
  const dx = (xMax - xMin) / (nX - 1)
  const dy = (yMax - yMin) / (nY - 1)
  const out: { x: number; y: number; label: string }[] = []
  for (let iy = 0; iy < nY; iy++) {
    for (let ix = 0; ix < nX; ix++) {
      const x = xMin + ix * dx
      const y = yMin + iy * dy
      const label = knnPredict({ x, y }, training, k)
      out.push({ x, y, label })
    }
  }
  return out
}

/** Generate preset 2D datasets for KNN / decision tree demos. rand in [0,1). */
export function generatePresetDataset(
  preset: 'blobs' | 'xor' | 'circles' | 'moons' | 'three-blobs' | 'stripes' | 'nested',
  nPerClass: number,
  rand: () => number
): TrainingPoint[] {
  const out: TrainingPoint[] = []
  const gaussian = () => Math.sqrt(-2 * Math.log(rand())) * Math.cos(2 * Math.PI * rand())

  if (preset === 'blobs') {
    for (let i = 0; i < nPerClass; i++) {
      out.push({
        x: 2 + 0.8 * gaussian(),
        y: 2 + 0.8 * gaussian(),
        label: 'A',
      })
      out.push({
        x: -2 + 0.8 * gaussian(),
        y: -2 + 0.8 * gaussian(),
        label: 'B',
      })
    }
  } else if (preset === 'xor') {
    const spread = 0.4
    for (let i = 0; i < nPerClass; i++) {
      out.push({
        x: -1.5 + spread * gaussian(),
        y: -1.5 + spread * gaussian(),
        label: '0',
      })
      out.push({
        x: 1.5 + spread * gaussian(),
        y: 1.5 + spread * gaussian(),
        label: '0',
      })
      out.push({
        x: 1.5 + spread * gaussian(),
        y: -1.5 + spread * gaussian(),
        label: '1',
      })
      out.push({
        x: -1.5 + spread * gaussian(),
        y: 1.5 + spread * gaussian(),
        label: '1',
      })
    }
  } else if (preset === 'circles') {
    for (let i = 0; i < nPerClass; i++) {
      const r = 1.5 * rand()
      const th = 2 * Math.PI * rand()
      out.push({
        x: r * Math.cos(th),
        y: r * Math.sin(th),
        label: 'A',
      })
    }
    for (let i = 0; i < nPerClass; i++) {
      const r = 2 + 1.2 * rand()
      const th = 2 * Math.PI * rand()
      out.push({
        x: r * Math.cos(th),
        y: r * Math.sin(th),
        label: 'B',
      })
    }
  } else if (preset === 'moons') {
    // Two interleaving crescents (classic sklearn-style)
    const spread = 0.25
    for (let i = 0; i < nPerClass; i++) {
      const t = rand() * Math.PI
      out.push({
        x: Math.cos(t) + 0.5 + spread * gaussian(),
        y: Math.sin(t) * 0.6 - 0.2 + spread * gaussian(),
        label: 'A',
      })
    }
    for (let i = 0; i < nPerClass; i++) {
      const t = rand() * Math.PI
      out.push({
        x: 1 - Math.cos(t) - 0.5 + spread * gaussian(),
        y: 0.6 - Math.sin(t) * 0.6 + 0.2 + spread * gaussian(),
        label: 'B',
      })
    }
  } else if (preset === 'three-blobs') {
    for (let i = 0; i < nPerClass; i++) {
      out.push({
        x: 0 + 0.6 * gaussian(),
        y: 2 + 0.6 * gaussian(),
        label: 'A',
      })
      out.push({
        x: -1.8 + 0.6 * gaussian(),
        y: -1.2 + 0.6 * gaussian(),
        label: 'B',
      })
      out.push({
        x: 1.8 + 0.6 * gaussian(),
        y: -1.2 + 0.6 * gaussian(),
        label: 'C',
      })
    }
  } else if (preset === 'stripes') {
    // Horizontal stripes: y bands with noise
    const n = nPerClass * 3
    for (let i = 0; i < n; i++) {
      const x = -2.5 + 5 * rand()
      const y = -2.5 + 5 * rand()
      const band = Math.floor((y + 2.5) / (5 / 3))
      const label = band % 2 === 0 ? 'A' : 'B'
      out.push({
        x: x + 0.15 * gaussian(),
        y: y + 0.15 * gaussian(),
        label,
      })
    }
  } else {
    // nested: inner axis-aligned rectangle A, outer frame B
    const nA = nPerClass
    const nB = nPerClass * 2
    for (let i = 0; i < nA; i++) {
      out.push({
        x: -0.8 + 1.6 * rand(),
        y: -0.8 + 1.6 * rand(),
        label: 'A',
      })
    }
    for (let i = 0; i < nB; i++) {
      const side = Math.floor(rand() * 4)
      let x: number, y: number
      if (side === 0) {
        x = -2.5 + 1.2 * rand()
        y = -2.5 + 5 * rand()
      } else if (side === 1) {
        x = 1.3 + 1.2 * rand()
        y = -2.5 + 5 * rand()
      } else if (side === 2) {
        x = -2.5 + 5 * rand()
        y = -2.5 + 1.2 * rand()
      } else {
        x = -2.5 + 5 * rand()
        y = 1.3 + 1.2 * rand()
      }
      out.push({ x, y, label: 'B' })
    }
  }
  return out
}
