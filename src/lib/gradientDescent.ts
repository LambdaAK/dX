/**
 * Gradient descent on 1D objectives f(x).
 * Supports step size (learning rate) and momentum; returns path (x values) and loss per iteration.
 */

export type ObjectiveId = 'quadratic' | 'quartic' | 'sine'

export interface Objective1D {
  id: ObjectiveId
  f: (x: number) => number
  grad: (x: number) => number
  /** x range for plotting [xMin, xMax] */
  view: [number, number]
  /** Optional y range for plot [yMin, yMax]; if not set, inferred from sampling */
  yView?: [number, number]
}

/** Quadratic: f(x) = x², min at 0. */
export const quadratic1D: Objective1D = {
  id: 'quadratic',
  f: (x) => x * x,
  grad: (x) => 2 * x,
  view: [-2, 2],
  yView: [0, 4],
}

/** Quartic with two local minima: f(x) = x⁴ − 2x², mins at x = ±1. */
export const quartic1D: Objective1D = {
  id: 'quartic',
  f: (x) => x * x * x * x - 2 * x * x,
  grad: (x) => 4 * x * x * x - 4 * x,
  view: [-2, 2],
  yView: [-1.5, 4],
}

/** Sinusoidal with many local minima: f(x) = x² + sin(5x), rough landscape. */
export const sine1D: Objective1D = {
  id: 'sine',
  f: (x) => x * x + Math.sin(5 * x),
  grad: (x) => 2 * x + 5 * Math.cos(5 * x),
  view: [-2.5, 2.5],
  yView: [-2, 8],
}

export const OBJECTIVES_1D: Record<ObjectiveId, Objective1D> = {
  quadratic: quadratic1D,
  quartic: quartic1D,
  sine: sine1D,
}

export interface GD1DResult {
  path: number[]
  losses: number[]
}

/**
 * Run gradient descent in 1D with optional momentum.
 * path[0] = x0; path[i+1] = update from path[i].
 * momentum in [0, 1); 0 = plain GD.
 */
export function runGradientDescent1D(
  obj: Objective1D,
  x0: number,
  stepSize: number,
  momentum: number,
  maxIter: number
): GD1DResult {
  const path: number[] = [x0]
  const losses: number[] = [obj.f(x0)]
  let x = x0
  let v = 0
  const tol = 1e-12

  for (let i = 0; i < maxIter - 1; i++) {
    const g = obj.grad(x)
    if (Math.abs(g) < tol) break

    v = momentum * v + g
    x = x - stepSize * v

    path.push(x)
    losses.push(obj.f(x))

    if (!Number.isFinite(x)) break
  }

  return { path, losses }
}

/** Sample f(x) over a given x-range (defaults to obj.view) for plotting. */
export function sample1D(
  obj: Objective1D,
  n: number,
  view?: [number, number]
): { x: number; y: number }[] {
  const [xMin, xMax] = view ?? obj.view
  const out: { x: number; y: number }[] = []
  for (let i = 0; i < n; i++) {
    const x = xMin + (i / (n - 1)) * (xMax - xMin)
    out.push({ x, y: obj.f(x) })
  }
  return out
}
