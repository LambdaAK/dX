/**
 * CART-style decision tree for 2D classification.
 * Splits on x or y at the threshold that minimizes weighted Gini impurity.
 */

export type Point2D = { x: number; y: number }

export type TrainingPoint = Point2D & { label: string }

export type TreeNode =
  | { type: 'leaf'; label: string; count: number }
  | {
      type: 'split'
      feature: 0 | 1 // 0 = x, 1 = y
      threshold: number
      left: TreeNode
      right: TreeNode
    }

export type DecisionTreeConfig = {
  maxDepth: number
  minSamplesSplit?: number
}

function gini(counts: Record<string, number>, n: number): number {
  if (n <= 0) return 0
  let sum = 0
  for (const c of Object.values(counts)) {
    const p = c / n
    sum += p * p
  }
  return 1 - sum
}

function countLabels(points: TrainingPoint[]): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const p of points) {
    counts[p.label] = (counts[p.label] ?? 0) + 1
  }
  return counts
}

function majorityLabel(counts: Record<string, number>): string {
  let best = ''
  let bestCount = 0
  for (const [label, c] of Object.entries(counts)) {
    if (c > bestCount) {
      bestCount = c
      best = label
    }
  }
  return best || ''
}

function getFeatureValue(p: TrainingPoint, feature: 0 | 1): number {
  return feature === 0 ? p.x : p.y
}

/**
 * Find best (feature, threshold) split that minimizes weighted Gini.
 */
function findBestSplit(
  points: TrainingPoint[],
  n: number,
  counts: Record<string, number>
): { feature: 0 | 1; threshold: number; leftCounts: Record<string, number>; rightCounts: Record<string, number> } | null {
  if (n < 2) return null
  const parentGini = gini(counts, n)
  let bestFeature: 0 | 1 = 0
  let bestThreshold = 0
  let bestGain = -1
  let bestLeftCounts: Record<string, number> = {}
  let bestRightCounts: Record<string, number> = {}

  for (const feature of [0, 1] as const) {
    const values = points.map((p) => getFeatureValue(p, feature))
    const sorted = [...new Set(values)].sort((a, b) => a - b)
    // Try midpoints between consecutive values as thresholds
    for (let i = 0; i < sorted.length - 1; i++) {
      const threshold = (sorted[i] + sorted[i + 1]) / 2
      const leftCounts: Record<string, number> = {}
      const rightCounts: Record<string, number> = {}
      for (const p of points) {
        const v = getFeatureValue(p, feature)
        if (v <= threshold) {
          leftCounts[p.label] = (leftCounts[p.label] ?? 0) + 1
        } else {
          rightCounts[p.label] = (rightCounts[p.label] ?? 0) + 1
        }
      }
      const nL = Object.values(leftCounts).reduce((a, c) => a + c, 0)
      const nR = Object.values(rightCounts).reduce((a, c) => a + c, 0)
      if (nL === 0 || nR === 0) continue
      const giniL = gini(leftCounts, nL)
      const giniR = gini(rightCounts, nR)
      const weightedGini = (nL / n) * giniL + (nR / n) * giniR
      const gain = parentGini - weightedGini
      if (gain > bestGain) {
        bestGain = gain
        bestFeature = feature
        bestThreshold = threshold
        bestLeftCounts = leftCounts
        bestRightCounts = rightCounts
      }
    }
  }

  if (bestGain <= 0) return null
  return {
    feature: bestFeature,
    threshold: bestThreshold,
    leftCounts: bestLeftCounts,
    rightCounts: bestRightCounts,
  }
}

function buildNode(
  points: TrainingPoint[],
  depth: number,
  config: DecisionTreeConfig
): TreeNode {
  const n = points.length
  const counts = countLabels(points)
  const minSamples = config.minSamplesSplit ?? 2

  const isPure = Object.keys(counts).length <= 1
  const atMaxDepth = depth >= config.maxDepth
  const tooFew = n < minSamples

  if (isPure || atMaxDepth || tooFew) {
    return { type: 'leaf', label: majorityLabel(counts), count: n }
  }

  const split = findBestSplit(points, n, counts)
  if (!split) {
    return { type: 'leaf', label: majorityLabel(counts), count: n }
  }

  const featureKey = split.feature === 0 ? 'x' : 'y'
  const leftPoints = points.filter((p) => p[featureKey] <= split.threshold)
  const rightPoints = points.filter((p) => p[featureKey] > split.threshold)
  if (leftPoints.length === 0 || rightPoints.length === 0) {
    return { type: 'leaf', label: majorityLabel(counts), count: n }
  }

  return {
    type: 'split',
    feature: split.feature,
    threshold: split.threshold,
    left: buildNode(leftPoints, depth + 1, config),
    right: buildNode(rightPoints, depth + 1, config),
  }
}

/**
 * Build a decision tree from 2D training points.
 */
export function buildDecisionTree(
  points: TrainingPoint[],
  config: DecisionTreeConfig
): TreeNode | null {
  if (points.length === 0) return null
  return buildNode(points, 0, config)
}

/**
 * Predict class for a single point.
 */
export function predictTree(node: TreeNode | null, point: Point2D): string {
  if (!node) return ''
  if (node.type === 'leaf') return node.label
  const v = node.feature === 0 ? point.x : point.y
  return v <= node.threshold
    ? predictTree(node.left, point)
    : predictTree(node.right, point)
}

/**
 * Compute predicted class for each cell on a 2D grid (for decision boundary).
 */
export function decisionTreeGrid(
  tree: TreeNode | null,
  xMin: number,
  xMax: number,
  yMin: number,
  yMax: number,
  nX: number,
  nY: number
): { x: number; y: number; label: string }[] {
  if (!tree) return []
  const dx = (xMax - xMin) / Math.max(1, nX - 1)
  const dy = (yMax - yMin) / Math.max(1, nY - 1)
  const out: { x: number; y: number; label: string }[] = []
  for (let iy = 0; iy < nY; iy++) {
    for (let ix = 0; ix < nX; ix++) {
      const x = xMin + ix * dx
      const y = yMin + iy * dy
      out.push({ x, y, label: predictTree(tree, { x, y }) })
    }
  }
  return out
}

/**
 * Return a simple text representation of the tree (for display).
 */
export function treeToString(node: TreeNode | null, indent = ''): string {
  if (!node) return '(empty)'
  if (node.type === 'leaf') return `${indent}→ ${node.label} (n=${node.count})`
  const axis = node.feature === 0 ? 'x' : 'y'
  return (
    `${indent}${axis} ≤ ${node.threshold.toFixed(3)}\n` +
    treeToString(node.left, indent + '  ') +
    '\n' +
    treeToString(node.right, indent + '  ')
  )
}
