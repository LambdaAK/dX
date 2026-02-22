import type { ProcessDef } from '@/types/process'

/**
 * Overdamped Langevin equation: dX_t = -∇V(X_t) dt + √(2β⁻¹) dW_t
 * Implemented with double-well potential V(x) = (a/4)x⁴ − (b/2)x²
 * so -∇V = b·x − a·x³. Diffusion coefficient √(2/β).
 */
export const langevin: ProcessDef = {
  id: 'langevin',
  name: 'Langevin (overdamped)',
  description: 'double-well potential',
  equationLatex: 'dX = -\\nabla V(X)\\,dt + \\sqrt{2\\beta^{-1}}\\,dW',
  about:
    'Used in statistical physics, MCMC (Langevin Monte Carlo), and diffusion models. ' +
    'Very important in modern ML: it underlies sampling algorithms and score-based generative models.',
  params: [
    { id: 'a', name: 'a (x⁴ coefficient)', default: 1, min: 0.01, max: 5, step: 0.01 },
    { id: 'b', name: 'b (x² coefficient)', default: 1, min: 0.01, max: 5, step: 0.01 },
    { id: 'beta', name: 'β (inverse temperature)', default: 1, min: 0.1, max: 10, step: 0.1 },
  ],
  drift: (x, _t, p) => p.b * x - p.a * x * x * x,
  diffusion: (_x, _t, p) => Math.sqrt(2 / p.beta),
}
