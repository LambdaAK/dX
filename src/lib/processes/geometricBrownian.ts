import type { ProcessDef } from '@/types/process'

export const geometricBrownian: ProcessDef = {
  id: 'geometric-brownian',
  name: 'Geometric Brownian motion',
  description: 'log-normal growth',
  equationLatex: 'dX = \\mu X\\,dt + \\sigma X\\,dW',
  about:
    'Used in finance (e.g. Black–Scholes for stock prices), population dynamics, and any process that stays positive. ' +
    'Solution is log-normally distributed; avoids negative values and is the standard model for asset prices.',
  params: [
    { id: 'mu', name: 'μ (drift)', default: 0.1, min: -1, max: 1, step: 0.01 },
    { id: 'sigma', name: 'σ (volatility)', default: 0.2, min: 0.01, max: 2, step: 0.01 },
  ],
  drift: (x, _t, p) => p.mu * x,
  diffusion: (x, _t, p) => p.sigma * x,
}
