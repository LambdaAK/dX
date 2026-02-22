import type { ProcessDef } from '@/types/process'

export const brownian: ProcessDef = {
  id: 'brownian',
  name: 'Brownian motion',
  description: 'dX = dW — continuous random walk',
  params: [],
  drift: () => 0,
  diffusion: () => 1,
}
