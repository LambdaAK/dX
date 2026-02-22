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
  /** LaTeX for the SDE equation (e.g. "dX = \\mu X \\, dt + \\sigma X \\, dW"). When set, shown with KaTeX; description is used as tagline after " — ". */
  equationLatex?: string
  /** Brief description of what the process is used for and its significance. */
  about?: string
  params: ParamDef[]
  drift: (x: number, t: number, p: Record<string, number>) => number
  diffusion: (x: number, t: number, p: Record<string, number>) => number
}

export type CustomProcessInput = {
  driftExpr: string
  diffusionExpr: string
  params: ParamDef[]
}
