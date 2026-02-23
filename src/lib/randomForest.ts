/**
 * Random forest: ensemble of decision trees on bootstrap samples.
 * Each tree is trained on a sample with replacement; prediction by majority vote.
 */

import {
  buildDecisionTree,
  predictTree,
  type TrainingPoint,
  type Point2D,
  type TreeNode,
  type DecisionTreeConfig,
} from '@/lib/decisionTree'

export type RandomForestConfig = DecisionTreeConfig & {
  nTrees: number
}

export type RandomForest = TreeNode[]

/**
 * Sample n indices with replacement from [0, n).
 */
function bootstrapIndices(n: number, rand: () => number): number[] {
  const indices: number[] = []
  for (let i = 0; i < n; i++) {
    indices.push(Math.floor(rand() * n))
  }
  return indices
}

/**
 * Build a random forest from 2D training points.
 * Each tree is trained on a bootstrap sample (with replacement).
 */
export function buildRandomForest(
  points: TrainingPoint[],
  config: RandomForestConfig,
  rand: () => number = Math.random
): RandomForest {
  if (points.length === 0) return []
  const forest: RandomForest = []
  const { nTrees, maxDepth, minSamplesSplit } = config
  const treeConfig: DecisionTreeConfig = { maxDepth, minSamplesSplit }

  for (let t = 0; t < nTrees; t++) {
    const indices = bootstrapIndices(points.length, rand)
    const sample = indices.map((i) => points[i])
    const tree = buildDecisionTree(sample, treeConfig)
    if (tree) forest.push(tree)
  }
  return forest
}

/**
 * Predict class by majority vote over all trees.
 */
export function predictForest(forest: RandomForest, point: Point2D): string {
  if (forest.length === 0) return ''
  const votes: Record<string, number> = {}
  for (const tree of forest) {
    const label = predictTree(tree, point)
    votes[label] = (votes[label] ?? 0) + 1
  }
  let bestLabel = ''
  let bestCount = 0
  for (const [label, count] of Object.entries(votes)) {
    if (count > bestCount) {
      bestCount = count
      bestLabel = label
    }
  }
  return bestLabel
}

/**
 * Decision boundary grid for random forest.
 */
export function randomForestGrid(
  forest: RandomForest,
  xMin: number,
  xMax: number,
  yMin: number,
  yMax: number,
  nX: number,
  nY: number
): { x: number; y: number; label: string }[] {
  if (forest.length === 0) return []
  const dx = (xMax - xMin) / Math.max(1, nX - 1)
  const dy = (yMax - yMin) / Math.max(1, nY - 1)
  const out: { x: number; y: number; label: string }[] = []
  for (let iy = 0; iy < nY; iy++) {
    for (let ix = 0; ix < nX; ix++) {
      const x = xMin + ix * dx
      const y = yMin + iy * dy
      out.push({ x, y, label: predictForest(forest, { x, y }) })
    }
  }
  return out
}

// Re-export for convenience
export { buildDecisionTree, predictTree, decisionTreeGrid } from '@/lib/decisionTree'
