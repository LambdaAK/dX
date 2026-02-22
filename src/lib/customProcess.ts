import { Parser } from 'expr-eval'
import type { ProcessDef, CustomProcessInput, ParamDef } from '@/types/process'

function collectParamIds(params: ParamDef[]): Set<string> {
  const s = new Set<string>(['x', 't'])
  params.forEach((p) => s.add(p.id))
  return s
}

/**
 * Compile drift and diffusion expressions into (x, t, params) => number.
 * Only variables in param list plus x, t are allowed.
 */
export function compileCustomProcess(input: CustomProcessInput): ProcessDef | { error: string } {
  const { driftExpr, diffusionExpr, params } = input
  const allowed = collectParamIds(params)
  const parser = new Parser()

  try {
    const driftAst = parser.parse(driftExpr.trim() || '0')
    const diffusionAst = parser.parse(diffusionExpr.trim() || '0')

    const driftVars = driftAst.variables()
    const diffusionVars = diffusionAst.variables()
    for (const v of [...driftVars, ...diffusionVars]) {
      if (!allowed.has(v)) {
        return { error: `Unknown variable: ${v}. Use x, t, and your parameter names only.` }
      }
    }

    const drift = (x: number, t: number, p: Record<string, number>) => {
      const scope: Record<string, number> = { x, t, ...p }
      return driftAst.evaluate(scope)
    }
    const diffusion = (x: number, t: number, p: Record<string, number>) => {
      const scope: Record<string, number> = { x, t, ...p }
      const g = diffusionAst.evaluate(scope)
      if (typeof g !== 'number' || g < 0) return 0
      return g
    }

    return {
      id: 'custom',
      name: 'Custom',
      description: 'Your own dX = f(x,t)dt + g(x,t)dW',
      params,
      drift,
      diffusion,
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return { error: msg }
  }
}
