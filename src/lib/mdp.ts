import type {
  GridWorld,
  GridWorldParseResult,
  Position,
  Action,
  ValueFunction,
  Policy,
  QFunction,
  RLResult,
  GridCell,
} from '@/types/mdp'

const ACTIONS: Action[] = ['up', 'down', 'left', 'right']

/**
 * Parse a grid world DSL:
 *
 * Size: 5x5
 * Start: 0,0
 * Grid:
 * . . . W G
 * . # # . .
 * . . F . .
 * Rewards: G:10, P:-10, W:-2, F:-5
 * Terminal: G, P
 * Discount: 0.9
 * Noise: 0.2
 *
 * Legend: . = empty, # = wall
 * Any other symbol maps to a reward and can be terminal or non-terminal.
 * If Terminal: is not specified, symbols with |reward| >= 10 are terminal.
 */
export function parseGridWorldDSL(text: string): GridWorldParseResult {
  const trimmed = text.trim()
  if (!trimmed) {
    return { ok: false, error: 'Definition is empty.' }
  }

  const lines = trimmed.split(/\n/).map(l => l.trim()).filter(Boolean)

  let rows = 5
  let cols = 5
  let startPos: Position = { row: 0, col: 0 }
  let discount = 0.9
  let noise = 0.2
  let rewards: Record<string, number> = { G: 10, P: -10 }
  let terminalSymbols: Set<string> | null = null
  const gridLines: string[] = []
  let inGridSection = false

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Parse Size: RxC
    const sizeMatch = line.match(/^Size:\s*(\d+)\s*x\s*(\d+)\s*$/i)
    if (sizeMatch) {
      rows = parseInt(sizeMatch[1])
      cols = parseInt(sizeMatch[2])
      continue
    }

    // Parse Start: r,c
    const startMatch = line.match(/^Start:\s*(\d+)\s*,\s*(\d+)\s*$/i)
    if (startMatch) {
      startPos = { row: parseInt(startMatch[1]), col: parseInt(startMatch[2]) }
      continue
    }

    // Parse Discount: 0.9
    const discountMatch = line.match(/^Discount:\s*([\d.]+)\s*$/i)
    if (discountMatch) {
      discount = parseFloat(discountMatch[1])
      continue
    }

    // Parse Noise: 0.2
    const noiseMatch = line.match(/^Noise:\s*([\d.]+)\s*$/i)
    if (noiseMatch) {
      noise = parseFloat(noiseMatch[1])
      continue
    }

    // Parse Rewards: G:10, P:-10
    const rewardsMatch = line.match(/^Rewards:\s*(.+)$/i)
    if (rewardsMatch) {
      const rewardPairs = rewardsMatch[1].split(',')
      for (const pair of rewardPairs) {
        const [key, val] = pair.split(':').map(s => s.trim())
        if (key && val) {
          rewards[key] = parseFloat(val)
        }
      }
      continue
    }

    // Parse Terminal: G, P
    const terminalMatch = line.match(/^Terminal:\s*(.+)$/i)
    if (terminalMatch) {
      const symbols = terminalMatch[1].split(',').map(s => s.trim())
      terminalSymbols = new Set(symbols)
      continue
    }

    // Parse Grid:
    if (/^Grid:\s*$/i.test(line)) {
      inGridSection = true
      continue
    }

    // Grid data lines
    if (inGridSection) {
      gridLines.push(line)
    }
  }

  // Parse grid
  if (gridLines.length !== rows) {
    return { ok: false, error: `Expected ${rows} grid lines, got ${gridLines.length}` }
  }

  const grid: GridCell[][] = []
  for (let r = 0; r < rows; r++) {
    const row: GridCell[] = []
    const cells = gridLines[r].split(/\s+/)
    if (cells.length !== cols) {
      return { ok: false, error: `Row ${r} has ${cells.length} cells, expected ${cols}` }
    }
    for (let c = 0; c < cols; c++) {
      const symbol = cells[c]
      let type: GridCell['type'] = 'empty'
      let reward = -1 // default step cost
      let displaySymbol: string | undefined = undefined

      if (symbol === '#') {
        // Wall
        type = 'wall'
        reward = 0
      } else if (symbol === '.') {
        // Empty cell
        type = 'empty'
        reward = -1
      } else {
        // Custom symbol - check if it has a defined reward
        if (symbol in rewards) {
          reward = rewards[symbol]
          displaySymbol = symbol

          // Determine if terminal
          let isTerminal = false
          if (terminalSymbols !== null) {
            // Explicit terminal list provided
            isTerminal = terminalSymbols.has(symbol)
          } else {
            // Heuristic: |reward| >= 10 means terminal
            isTerminal = Math.abs(reward) >= 10
          }

          if (isTerminal) {
            // Determine goal vs pit
            type = reward > 0 ? 'goal' : 'pit'
          } else {
            // Non-terminal custom cell
            type = 'empty'
          }
        } else {
          // Symbol not defined in rewards - treat as empty with default -1
          type = 'empty'
          reward = -1
        }
      }

      row.push({ type, reward, symbol: displaySymbol })
    }
    grid.push(row)
  }

  return {
    ok: true,
    world: { rows, cols, grid, startPos, discount, noise },
  }
}

/**
 * Get next position after taking an action.
 */
function getNextPosition(pos: Position, action: Action, world: GridWorld): Position {
  let { row, col } = pos
  switch (action) {
    case 'up':
      row = Math.max(0, row - 1)
      break
    case 'down':
      row = Math.min(world.rows - 1, row + 1)
      break
    case 'left':
      col = Math.max(0, col - 1)
      break
    case 'right':
      col = Math.min(world.cols - 1, col + 1)
      break
  }

  // If hit a wall, stay in place
  if (world.grid[row][col].type === 'wall') {
    return pos
  }

  return { row, col }
}

/**
 * Get actual action taken (with noise).
 * With probability (1-noise), take intended action.
 * With probability noise/2, slip to perpendicular direction.
 */
function getActualAction(intended: Action, rand: () => number, noise: number): Action {
  const u = rand()
  if (u < 1 - noise) {
    return intended
  }

  // Slip to perpendicular direction
  const perp = intended === 'up' || intended === 'down'
    ? (u < 1 - noise/2 ? 'left' : 'right')
    : (u < 1 - noise/2 ? 'up' : 'down')
  return perp as Action
}

/**
 * Check if a position is terminal (goal or pit).
 */
function isTerminal(pos: Position, world: GridWorld): boolean {
  const cell = world.grid[pos.row][pos.col]
  return cell.type === 'goal' || cell.type === 'pit'
}

/**
 * Value Iteration algorithm.
 * Iterate until convergence: V(s) = max_a Σ P(s'|s,a)[r + γV(s')]
 */
export function valueIteration(world: GridWorld, maxIterations = 1000, theta = 0.001): RLResult {
  const V: ValueFunction = Array.from({ length: world.rows }, () =>
    new Array(world.cols).fill(0)
  )
  const policy: Policy = Array.from({ length: world.rows }, () =>
    new Array(world.cols).fill('up')
  )

  let iterations = 0

  for (let iter = 0; iter < maxIterations; iter++) {
    iterations++
    let delta = 0

    for (let r = 0; r < world.rows; r++) {
      for (let c = 0; c < world.cols; c++) {
        const pos = { row: r, col: c }
        const cell = world.grid[r][c]

        // Skip walls and terminals
        if (cell.type === 'wall' || isTerminal(pos, world)) {
          continue
        }

        const v = V[r][c]
        let maxValue = -Infinity
        let bestAction: Action = 'up'

        // Try each action
        for (const action of ACTIONS) {
          let value = 0

          // With probability (1-noise), intended action
          const intendedNext = getNextPosition(pos, action, world)
          const intendedReward = world.grid[intendedNext.row][intendedNext.col].reward
          value += (1 - world.noise) * (intendedReward + world.discount * V[intendedNext.row][intendedNext.col])

          // With probability noise/2 each, slip to perpendicular
          const perp = action === 'up' || action === 'down'
            ? ['left', 'right'] as Action[]
            : ['up', 'down'] as Action[]

          for (const slipAction of perp) {
            const slipNext = getNextPosition(pos, slipAction, world)
            const slipReward = world.grid[slipNext.row][slipNext.col].reward
            value += (world.noise / 2) * (slipReward + world.discount * V[slipNext.row][slipNext.col])
          }

          if (value > maxValue) {
            maxValue = value
            bestAction = action
          }
        }

        V[r][c] = maxValue
        policy[r][c] = bestAction
        delta = Math.max(delta, Math.abs(v - V[r][c]))
      }
    }

    if (delta < theta) {
      break
    }
  }

  return {
    algorithm: 'Value Iteration',
    valueFunction: V,
    policy,
    iterations,
  }
}

/**
 * Sample an episode starting from start position.
 */
function sampleEpisode(
  world: GridWorld,
  getAction: (pos: Position) => Action,
  rand: () => number,
  maxSteps = 100
): { states: Position[]; actions: Action[]; rewards: number[] } {
  const states: Position[] = [world.startPos]
  const actions: Action[] = []
  const rewards: number[] = []

  let pos = world.startPos
  let steps = 0

  while (!isTerminal(pos, world) && steps < maxSteps) {
    const action = getAction(pos)
    const actualAction = getActualAction(action, rand, world.noise)
    const nextPos = getNextPosition(pos, actualAction, world)
    const reward = world.grid[nextPos.row][nextPos.col].reward

    actions.push(action)
    rewards.push(reward)
    states.push(nextPos)

    pos = nextPos
    steps++
  }

  return { states, actions, rewards }
}

/**
 * Q-Learning algorithm.
 * Off-policy TD: Q(s,a) ← Q(s,a) + α[r + γ max_a' Q(s',a') - Q(s,a)]
 */
export function qLearning(
  world: GridWorld,
  episodes = 1000,
  alpha = 0.1,
  epsilon = 0.1,
  rand: () => number = Math.random
): RLResult {
  // Initialize Q-table
  const Q: QFunction = {}

  const getQ = (pos: Position, action: Action): number => {
    const key = `${pos.row},${pos.col}`
    if (!Q[key]) Q[key] = { up: 0, down: 0, left: 0, right: 0 }
    return Q[key][action]
  }

  const setQ = (pos: Position, action: Action, value: number) => {
    const key = `${pos.row},${pos.col}`
    if (!Q[key]) Q[key] = { up: 0, down: 0, left: 0, right: 0 }
    Q[key][action] = value
  }

  const getGreedyAction = (pos: Position): Action => {
    let bestAction: Action = 'up'
    let bestValue = -Infinity
    for (const action of ACTIONS) {
      const value = getQ(pos, action)
      if (value > bestValue) {
        bestValue = value
        bestAction = action
      }
    }
    return bestAction
  }

  const getEpsilonGreedyAction = (pos: Position): Action => {
    if (rand() < epsilon) {
      return ACTIONS[Math.floor(rand() * ACTIONS.length)]
    }
    return getGreedyAction(pos)
  }

  const rewardsPerEpisode: number[] = []

  for (let ep = 0; ep < episodes; ep++) {
    const { states, actions, rewards } = sampleEpisode(
      world,
      getEpsilonGreedyAction,
      rand
    )

    let totalReward = 0

    for (let t = 0; t < states.length - 1; t++) {
      const s = states[t]
      const a = actions[t]
      const r = rewards[t]
      const sNext = states[t + 1]

      totalReward += r

      // Q-learning update: use max over next actions
      const maxQNext = Math.max(...ACTIONS.map(a => getQ(sNext, a)))
      const currentQ = getQ(s, a)
      const newQ = currentQ + alpha * (r + world.discount * maxQNext - currentQ)
      setQ(s, a, newQ)
    }

    rewardsPerEpisode.push(totalReward)
  }

  // Extract value function and policy
  const V: ValueFunction = Array.from({ length: world.rows }, () =>
    new Array(world.cols).fill(0)
  )
  const policy: Policy = Array.from({ length: world.rows }, () =>
    new Array(world.cols).fill('up')
  )

  for (let r = 0; r < world.rows; r++) {
    for (let c = 0; c < world.cols; c++) {
      const pos = { row: r, col: c }
      const bestAction = getGreedyAction(pos)
      policy[r][c] = bestAction
      V[r][c] = getQ(pos, bestAction)
    }
  }

  return {
    algorithm: `Q-Learning (ε=${epsilon})`,
    valueFunction: V,
    policy,
    qFunction: Q,
    episodes,
    rewardsPerEpisode,
  }
}

/**
 * SARSA algorithm.
 * On-policy TD: Q(s,a) ← Q(s,a) + α[r + γQ(s',a') - Q(s,a)]
 */
export function sarsa(
  world: GridWorld,
  episodes = 1000,
  alpha = 0.1,
  epsilon = 0.1,
  rand: () => number = Math.random
): RLResult {
  // Initialize Q-table
  const Q: QFunction = {}

  const getQ = (pos: Position, action: Action): number => {
    const key = `${pos.row},${pos.col}`
    if (!Q[key]) Q[key] = { up: 0, down: 0, left: 0, right: 0 }
    return Q[key][action]
  }

  const setQ = (pos: Position, action: Action, value: number) => {
    const key = `${pos.row},${pos.col}`
    if (!Q[key]) Q[key] = { up: 0, down: 0, left: 0, right: 0 }
    Q[key][action] = value
  }

  const getGreedyAction = (pos: Position): Action => {
    let bestAction: Action = 'up'
    let bestValue = -Infinity
    for (const action of ACTIONS) {
      const value = getQ(pos, action)
      if (value > bestValue) {
        bestValue = value
        bestAction = action
      }
    }
    return bestAction
  }

  const getEpsilonGreedyAction = (pos: Position): Action => {
    if (rand() < epsilon) {
      return ACTIONS[Math.floor(rand() * ACTIONS.length)]
    }
    return getGreedyAction(pos)
  }

  const rewardsPerEpisode: number[] = []

  for (let ep = 0; ep < episodes; ep++) {
    const { states, actions, rewards } = sampleEpisode(
      world,
      getEpsilonGreedyAction,
      rand
    )

    let totalReward = 0

    for (let t = 0; t < states.length - 1; t++) {
      const s = states[t]
      const a = actions[t]
      const r = rewards[t]
      const sNext = states[t + 1]
      const aNext = t + 1 < actions.length ? actions[t + 1] : getEpsilonGreedyAction(sNext)

      totalReward += r

      // SARSA update: use actual next action
      const qNext = getQ(sNext, aNext)
      const currentQ = getQ(s, a)
      const newQ = currentQ + alpha * (r + world.discount * qNext - currentQ)
      setQ(s, a, newQ)
    }

    rewardsPerEpisode.push(totalReward)
  }

  // Extract value function and policy
  const V: ValueFunction = Array.from({ length: world.rows }, () =>
    new Array(world.cols).fill(0)
  )
  const policy: Policy = Array.from({ length: world.rows }, () =>
    new Array(world.cols).fill('up')
  )

  for (let r = 0; r < world.rows; r++) {
    for (let c = 0; c < world.cols; c++) {
      const pos = { row: r, col: c }
      const bestAction = getGreedyAction(pos)
      policy[r][c] = bestAction
      V[r][c] = getQ(pos, bestAction)
    }
  }

  return {
    algorithm: `SARSA (ε=${epsilon})`,
    valueFunction: V,
    policy,
    qFunction: Q,
    episodes,
    rewardsPerEpisode,
  }
}
