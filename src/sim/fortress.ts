import { createFortressBattle, type FortressValues } from './data/fortress'
import { type SimulatorRun } from './types'
import { WorkerBatch } from './workers'
import type { FortressMessage, FortressResponse } from './workers/fortress'

export function useFortressSimulator() {
  async function simulate(setups: { index: number; values: FortressValues }[], { instances, iterations }: SimulatorRun) {
    const scores: FortressResponse[] = []

    const batch = new WorkerBatch<FortressResponse, FortressMessage>('fortress')

    for (const { values, index } of setups) {
      batch.add(
        (data) => {
          scores.push(data)
        },
        {
          index,
          iterations,
          ...createFortressBattle(values)
        }
      )
    }

    const duration = await batch.run(instances)

    if (duration === null) return null

    return { scores, duration }
  }

  return { simulate }
}
