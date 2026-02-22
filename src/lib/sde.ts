import type { ProcessDef } from '@/types/process'
import type { SimConfig, Path } from '@/types/simulation'
import { normal } from './random'

/**
 * Euler–Maruyama: one step.
 * x_next = x + f(x,t)*dt + g(x,t)*sqrt(dt)*N(0,1)
 */
function step(
  x: number,
  t: number,
  dt: number,
  process: ProcessDef,
  params: Record<string, number>
): number {
  const f = process.drift(x, t, params)
  const g = process.diffusion(x, t, params)
  const dW = normal() * Math.sqrt(dt)
  return x + f * dt + g * dW
}

/**
 * Simulate M paths from t0 to T with step dt using the given process and params.
 */
export function eulerMaruyama(
  config: SimConfig,
  process: ProcessDef,
  params: Record<string, number>
): Path[] {
  const { t0, T, dt, M, x0 } = config
  const N = Math.max(1, Math.round((T - t0) / dt))
  const paths: Path[] = []

  for (let m = 0; m < M; m++) {
    const tArr: number[] = new Array(N + 1)
    const xArr: number[] = new Array(N + 1)
    tArr[0] = t0
    xArr[0] = x0

    let t = t0
    let x = x0
    for (let i = 0; i < N; i++) {
      x = step(x, t, dt, process, params)
      t += dt
      tArr[i + 1] = t
      xArr[i + 1] = x
    }
    paths.push({ t: tArr, x: xArr })
  }

  return paths
}
