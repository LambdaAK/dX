import { useMemo } from 'react'
import type { TreeNode } from '@/lib/decisionTree'

type LayoutNode = {
  node: TreeNode
  x: number
  y: number
  depth: number
  left?: LayoutNode
  right?: LayoutNode
}

const NODE_WIDTH = 72
const NODE_HEIGHT = 36
const LEVEL_GAP = 48
const HORIZONTAL_UNIT = 56
const PAD = 20

/**
 * Assign x positions via in-order traversal (leaves get consecutive indices),
 * then center parents over children. y = depth.
 */
function layoutTree(node: TreeNode, depth: number, leafIndex: { value: number }): LayoutNode {
  if (node.type === 'leaf') {
    const x = leafIndex.value
    leafIndex.value += 1
    return { node, x, y: depth, depth }
  }
  const left = layoutTree(node.left, depth + 1, leafIndex)
  const right = layoutTree(node.right, depth + 1, leafIndex)
  const x = (left.x + right.x) / 2
  return { node, x, y: depth, depth, left, right }
}

function getTreeBounds(layout: LayoutNode): { minX: number; maxX: number } {
  let minX = layout.x
  let maxX = layout.x
  function walk(n: LayoutNode) {
    minX = Math.min(minX, n.x)
    maxX = Math.max(maxX, n.x)
    if (n.left) walk(n.left)
    if (n.right) walk(n.right)
  }
  walk(layout)
  return { minX, maxX }
}

function maxDepth(layout: LayoutNode): number {
  if (layout.node.type === 'leaf') return layout.depth
  const dLeft = layout.left ? maxDepth(layout.left) : layout.depth
  const dRight = layout.right ? maxDepth(layout.right) : layout.depth
  return Math.max(dLeft, dRight)
}

function collectEdges(layout: LayoutNode): { from: LayoutNode; to: LayoutNode }[] {
  const edges: { from: LayoutNode; to: LayoutNode }[] = []
  function walk(n: LayoutNode) {
    if (n.left) {
      edges.push({ from: n, to: n.left })
      walk(n.left)
    }
    if (n.right) {
      edges.push({ from: n, to: n.right })
      walk(n.right)
    }
  }
  walk(layout)
  return edges
}

function collectNodes(layout: LayoutNode): LayoutNode[] {
  const nodes: LayoutNode[] = []
  function walk(n: LayoutNode) {
    nodes.push(n)
    if (n.left) walk(n.left)
    if (n.right) walk(n.right)
  }
  walk(layout)
  return nodes
}

type Props = {
  tree: TreeNode
  getColor: (label: string) => string
}

export function TreeVisualization({ tree, getColor }: Props) {
  const { layout, width, height, xOffset } = useMemo(() => {
    const leafIndex = { value: 0 }
    const root = layoutTree(tree, 0, leafIndex)
    const { minX, maxX } = getTreeBounds(root)
    const xOffset = PAD - minX * HORIZONTAL_UNIT
    const depth = maxDepth(root)
    const w = Math.max(120, (maxX - minX) * HORIZONTAL_UNIT + NODE_WIDTH + PAD * 2)
    const h = PAD + (depth + 1) * (NODE_HEIGHT + LEVEL_GAP) - LEVEL_GAP + PAD
    return { layout: root, width: w, height: h, xOffset }
  }, [tree])

  const edges = useMemo(() => collectEdges(layout), [layout])
  const nodes = useMemo(() => collectNodes(layout), [layout])

  const toPx = (n: LayoutNode) => ({
    x: xOffset + n.x * HORIZONTAL_UNIT + NODE_WIDTH / 2,
    y: PAD + n.y * (NODE_HEIGHT + LEVEL_GAP) + NODE_HEIGHT / 2,
  })

  return (
    <div style={{ overflow: 'auto', maxHeight: '420px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--bg-input)' }}>
      <svg
        width={width}
        height={height}
        style={{ display: 'block' }}
      >
        {/* Edges */}
        <g stroke="var(--text-muted)" strokeWidth="1.5" fill="none">
          {edges.map(({ from, to }, i) => {
            const pFrom = toPx(from)
            const pTo = toPx(to)
            const midY = (pFrom.y + pTo.y) / 2
            return (
              <path
                key={i}
                d={`M ${pFrom.x} ${pFrom.y} C ${pFrom.x} ${midY}, ${pTo.x} ${midY}, ${pTo.x} ${pTo.y}`}
              />
            )
          })}
        </g>
        {/* Nodes */}
        {nodes.map((n, i) => {
          const { x, y } = toPx(n)
          const nx = x - NODE_WIDTH / 2
          const ny = y - NODE_HEIGHT / 2
          const node = n.node
          const isLeaf = node.type === 'leaf'
          const fill = isLeaf ? getColor(node.label) : 'var(--glass-bg)'
          const stroke = isLeaf ? 'var(--text)' : 'var(--border)'
          const label =
            node.type === 'leaf'
              ? `${node.label} (${node.count})`
              : `${node.feature === 0 ? 'x' : 'y'} ≤ ${node.threshold.toFixed(2)}`
          return (
            <g key={i}>
              <rect
                x={nx}
                y={ny}
                width={NODE_WIDTH}
                height={NODE_HEIGHT}
                rx={6}
                ry={6}
                fill={fill}
                stroke={stroke}
                strokeWidth={1.5}
              />
              <text
                x={x}
                y={y + 1}
                textAnchor="middle"
                dominantBaseline="middle"
                fill={isLeaf ? 'var(--text)' : 'var(--text-muted)'}
                fontSize={isLeaf ? 11 : 10}
                fontWeight={isLeaf ? 600 : 500}
              >
                {label}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
