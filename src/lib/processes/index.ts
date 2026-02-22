import type { ProcessDef } from '@/types/process'
import { brownian } from './brownian'
import { ornsteinUhlenbeck } from './ornsteinUhlenbeck'
import { geometricBrownian } from './geometricBrownian'
import { langevin } from './langevin'

const builtIn: ProcessDef[] = [brownian, ornsteinUhlenbeck, geometricBrownian, langevin]

export function getBuiltInProcesses(): ProcessDef[] {
  return builtIn
}

export function getProcess(id: string): ProcessDef | undefined {
  return builtIn.find((p) => p.id === id)
}

export { brownian, ornsteinUhlenbeck, geometricBrownian, langevin }
