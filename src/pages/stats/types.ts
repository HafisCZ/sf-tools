import type { PlayerModel } from '~/core/models/player'

export type PlayerDetailRow = {
  label: string
  value: string
  icon?: `/${string}`
  read?: (player: PlayerModel) => number | undefined
  placeholder?: string
}

export type PlayerDetailContext = {
  readonly player: PlayerModel
  readonly compare: PlayerModel
  getHistory: () => PlayerModel[]
}
