import type { ProcessDef } from '@/types/process'
import { brownian } from './brownian'
import { ornsteinUhlenbeck } from './ornsteinUhlenbeck'
import { geometricBrownian } from './geometricBrownian'

const builtIn: ProcessDef[] = [brownian, ornsteinUhlenbeck, geometricBrownian]

export function getBuiltInProcesses(): ProcessDef[] {
  return builtIn
}

export function getProcess(id: string): ProcessDef | undefined {
  return builtIn.find((p) => p.id === id)
}

export { brownian, ornsteinUhlenbeck, geometricBrownian }
