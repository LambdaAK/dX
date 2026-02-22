import type { ProcessDef } from '@/types/process'

export const brownian: ProcessDef = {
  id: 'brownian',
  name: 'Brownian motion',
  description: 'dX = dW — continuous random walk',
  about:
    'Used as a model for random walk, particle diffusion, and as the building block of more complex SDEs. ' +
    'Foundation of stochastic calculus (Itô, Stratonovich) and of many models in finance and physics.',
  params: [],
  drift: () => 0,
  diffusion: () => 1,
}
