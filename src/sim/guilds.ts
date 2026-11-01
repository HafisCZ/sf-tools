import { sequence, sum } from '@utils/utils'
import { saveSimulatorLog, simulatorConfig, type SimulatorLogTarget } from './debug'
import { type FightLog, type SimulatorRun } from './types'
import { WorkerBatch } from './workers'
import type { GuildMember, GuildsMessage, GuildsResponse } from './workers/guilds'

export function useGuildSimulator() {
  async function simulate(guildA: GuildMember[], guildB: GuildMember[], gladiator: boolean, { instances, iterations }: SimulatorRun, log?: SimulatorLogTarget) {
    const scores: number[] = []

    let logs: FightLog[] = []

    const batch = new WorkerBatch<GuildsResponse, GuildsMessage>('guilds')

    sequence(instances).forEach(() => {
      batch.add(
        (data) => {
          scores.push(data.results.score)

          if (log) {
            logs = logs.concat(data.logs)
          }
        },
        {
          flags: { Gladiator15: gladiator },
          guildA,
          guildB,
          iterations,
          config: simulatorConfig.value,
          log: !!log
        }
      )
    })

    const duration = await batch.run(instances)

    if (duration === null) return null

    if (log && logs.length > 0) {
      saveSimulatorLog(log, { fights: logs, players: [...guildA, ...guildB].map(({ player }) => player), config: simulatorConfig.value })
    }

    return { score: (100 * sum(scores)) / (instances * iterations), duration }
  }

  return { simulate }
}
