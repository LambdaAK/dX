import type { ProcessDef } from '@/types/process'

export const geometricBrownian: ProcessDef = {
  id: 'geometric-brownian',
  name: 'Geometric Brownian motion',
  description: 'dX = μX dt + σX dW — log-normal growth',
  params: [
    { id: 'mu', name: 'μ (drift)', default: 0.1, min: -1, max: 1, step: 0.01 },
    { id: 'sigma', name: 'σ (volatility)', default: 0.2, min: 0.01, max: 2, step: 0.01 },
  ],
  drift: (x, _t, p) => p.mu * x,
  diffusion: (x, _t, p) => p.sigma * x,
}
