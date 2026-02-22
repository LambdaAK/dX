export type ParamDef = {
  id: string
  name: string
  default: number
  min?: number
  max?: number
  step?: number
  description?: string
}

export type ProcessDef = {
  id: string
  name: string
  description?: string
  params: ParamDef[]
  drift: (x: number, t: number, p: Record<string, number>) => number
  diffusion: (x: number, t: number, p: Record<string, number>) => number
}

export type CustomProcessInput = {
  driftExpr: string
  diffusionExpr: string
  params: ParamDef[]
}
