import { type SimulatorRun } from './types'
import { WorkerBatch } from './workers'
import type { HydraBoss, HydraMessage, HydraPet, HydraResponse, HydraResult } from './workers/hydra'

export function useHydraSimulator() {
  async function simulate(hydra: HydraBoss, pets: HydraPet[], { instances, iterations }: SimulatorRun) {
    const results: HydraResult[] = []

    const batch = new WorkerBatch<HydraResponse, HydraMessage>('hydra')

    pets.forEach((pet, index) => {
      batch.add(
        (data) => {
          results[index] = data.results
        },
        {
          iterations,
          hydra,
          pet
        }
      )
    })

    const duration = await batch.run(instances)

    if (duration === null) return null

    return { results, duration }
  }

  return { simulate }
}
