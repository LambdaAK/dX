export type Action = 'up' | 'down' | 'left' | 'right'

export type Position = {
  row: number
  col: number
}

export type CellType = 'empty' | 'wall' | 'goal' | 'pit'

export type GridCell = {
  type: CellType
  reward: number
  symbol?: string // Original symbol from DSL (for display)
}

export type GridWorld = {
  rows: number
  cols: number
  grid: GridCell[][]
  startPos: Position
  discount: number
  noise: number // probability of going in intended direction
}

export type GridWorldParseResult =
  | { ok: true; world: GridWorld }
  | { ok: false; error: string }

export type ValueFunction = number[][]
export type Policy = Action[][]
export type QFunction = Record<string, Record<Action, number>> // "row,col" -> action -> value

export type AlgorithmType = 'value-iteration' | 'q-learning' | 'sarsa'

export type RLResult = {
  algorithm: string
  valueFunction: ValueFunction
  policy: Policy
  qFunction?: QFunction
  iterations?: number
  episodes?: number
  rewardsPerEpisode?: number[]
}
