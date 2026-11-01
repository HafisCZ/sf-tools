import { sum } from '@utils/utils'
import { saveSimulatorLog, simulatorConfig, type SimulatorLogTarget } from './debug'
import { type FightLog, type SimulatorRun } from './types'
import { WorkerBatch } from './workers'
import { SimulatorModel } from './workers/base'
import { PetModel, type PetFightResponse, type PetMapResponse, type PetsMessage, type SimulatorPet } from './workers/pets'

type PetResult = {
  chance: number
  pet: SimulatorPet
  boss: SimulatorPet
}

export function usePetSimulator() {
  async function simulateFight(a: SimulatorPet, b: SimulatorPet, { instances, iterations }: SimulatorRun, log?: SimulatorLogTarget) {
    const chances: number[] = []

    let logs: FightLog[] = []

    const batch = new WorkerBatch<PetFightResponse, PetsMessage>('pets')

    for (let index = 0; index < instances; index++) {
      batch.add(
        (data) => {
          chances.push(data.results)

          if (log) {
            logs = logs.concat(data.logs)
          }
        },
        {
          mode: 'pet',
          players: [a, b],
          iterations,
          config: simulatorConfig.value,
          log: !!log
        }
      )
    }

    const duration = await batch.run(instances)

    if (duration === null) return null

    if (log && logs.length > 0) {
      saveSimulatorLog(log, { fights: logs, players: [a, b].map((pet) => SimulatorModel.normalize(PetModel.getPlayer(pet))), config: simulatorConfig.value })
    }

    return { chance: sum(chances) / instances, duration }
  }

  async function generateMaps(a: SimulatorPet, b: SimulatorPet, count: number, { instances, iterations }: SimulatorRun) {
    const maps: { boss: SimulatorPet; data: number[][] }[] = []

    const batch = new WorkerBatch<PetMapResponse, PetsMessage>('pets')

    for (let bossPet = b.Pet; bossPet < Math.min(20, b.Pet + count); bossPet++) {
      const boss = { ...b, Pet: bossPet }

      batch.add(
        (data) => {
          maps[bossPet - b.Pet] = { boss, data: data.results }
        },
        {
          mode: 'map',
          players: [a, boss],
          iterations,
          config: simulatorConfig.value
        }
      )
    }

    const duration = await batch.run(instances)

    if (duration === null) return null

    return { maps, duration }
  }

  async function simulateDungeons(matches: { pet: SimulatorPet; boss: SimulatorPet }[], { instances, iterations }: SimulatorRun) {
    const results: PetResult[] = []

    const batch = new WorkerBatch<PetFightResponse, PetsMessage>('pets')

    for (const { pet, boss } of matches) {
      batch.add(
        (data) => {
          results.push({ chance: data.results, pet, boss })
        },
        {
          mode: 'pet',
          players: [pet, boss],
          iterations,
          config: simulatorConfig.value
        }
      )
    }

    const duration = await batch.run(instances)

    if (duration === null) return null

    return { results, duration }
  }

  return { simulateFight, generateMaps, simulateDungeons }
}
