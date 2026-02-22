export type SimConfig = {
  t0: number
  T: number
  dt: number
  M: number
  x0: number
}

export type Path = { t: number[]; x: number[] }

export type SimResult = {
  paths: Path[]
  config: SimConfig
}

export type Stats = {
  t: number[]
  mean: number[]
  variance: number[]
  std: number[]
  quantiles?: { p: number; values: number[] }[]
}
