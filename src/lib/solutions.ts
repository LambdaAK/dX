/**
 * Analytical solutions for built-in processes.
 * Returns theoretical E[X_t] and Std(X_t) on a given time grid.
 */

export type TheoreticalSolution = {
  t: number[]
  mean: number[]
  std: number[]
  /** Short formula description for the process. */
  formula: string
  /** Stationary distribution if applicable (e.g. "N(μ, σ²/(2θ))"). */
  stationary?: string
}

function ouSolution(
  t: number[],
  x0: number,
  theta: number,
  mu: number,
  sigma: number
): TheoreticalSolution {
  const mean = t.map((s) => mu + (x0 - mu) * Math.exp(-theta * s))
  const variance = t.map((s) => (sigma * sigma / (2 * theta)) * (1 - Math.exp(-2 * theta * s)))
  const std = variance.map((v) => Math.sqrt(v))
  return {
    t,
    mean,
    std,
    formula: 'E[X_t] = μ + (X₀ − μ)e^{-θt},  Var(X_t) = σ²/(2θ)(1 − e^{-2θt})',
    stationary: `N(μ, σ²/(2θ))`,
  }
}

function brownianSolution(t: number[], x0: number): TheoreticalSolution {
  const mean = t.map(() => x0)
  const std = t.map((s) => Math.sqrt(s))
  return {
    t,
    mean,
    std,
    formula: 'E[X_t] = X₀,  Var(X_t) = t',
    stationary: undefined,
  }
}

function gbmSolution(
  t: number[],
  x0: number,
  mu: number,
  sigma: number
): TheoreticalSolution {
  const mean = t.map((s) => x0 * Math.exp(mu * s))
  const variance = t.map((s) =>
    x0 * x0 * Math.exp(2 * mu * s) * (Math.exp(sigma * sigma * s) - 1)
  )
  const std = variance.map((v) => Math.sqrt(v))
  return {
    t,
    mean,
    std,
    formula: 'E[X_t] = X₀ e^{μt},  Var(X_t) = X₀² e^{2μt}(e^{σ²t} − 1)',
    stationary: undefined,
  }
}

/**
 * Get theoretical mean and std for a process on the given time grid, or null if no closed form.
 */
export function getTheoreticalSolution(
  processId: string,
  params: Record<string, number>,
  x0: number,
  t: number[]
): TheoreticalSolution | null {
  if (t.length === 0) return null
  switch (processId) {
    case 'brownian':
      return brownianSolution(t, x0)
    case 'ornstein-uhlenbeck':
      return ouSolution(t, x0, params.theta, params.mu, params.sigma)
    case 'geometric-brownian':
      return gbmSolution(t, x0, params.mu, params.sigma)
    default:
      return null
  }
}
