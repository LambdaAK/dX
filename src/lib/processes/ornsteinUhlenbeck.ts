import type { ProcessDef } from '@/types/process'

export const ornsteinUhlenbeck: ProcessDef = {
  id: 'ornstein-uhlenbeck',
  name: 'Ornstein–Uhlenbeck',
  description: 'dX = θ(μ − X)dt + σ dW — mean-reverting',
  about:
    'Used to model mean-reverting quantities such as interest rates, volatility, and commodity prices. ' +
    'Has a closed-form solution and a Gaussian stationary distribution, so it is widely used in theory and calibration.',
  params: [
    { id: 'theta', name: 'θ (mean reversion)', default: 1, min: 0.01, max: 10, step: 0.01 },
    { id: 'mu', name: 'μ (long-term mean)', default: 0, min: -20, max: 20, step: 0.1 },
    { id: 'sigma', name: 'σ (noise strength)', default: 1, min: 0.01, max: 5, step: 0.01 },
  ],
  drift: (x, _t, p) => p.theta * (p.mu - x),
  diffusion: (_x, _t, p) => p.sigma,
}
