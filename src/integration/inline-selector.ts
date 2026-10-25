import { shallowRef } from 'vue'
import { useLoader } from '@utils/loader'
import { globalLocalize } from '@utils/localization'
import { useErrorToast } from '@utils/toasts'
import { sortDescending } from '@utils/utils'
import { Logger } from '~/core/logger'
import { type PlayerModel } from '~/core/models/player'
import { SELF_PROFILE } from '~/core/profiles'
import { DatabaseManager } from '~/data/database-manager'

export const inlineSelectorPlayers = shallowRef<PlayerModel[]>([])

let loading: Promise<void> | undefined

export function loadInlineSelectorPlayers() {
  loading ??= reloadInlineSelectorPlayers()

  return loading
}

export async function reloadInlineSelectorPlayers() {
  const loader = useLoader()

  loader.start()

  try {
    await DatabaseManager.load(SELF_PROFILE)

    inlineSelectorPlayers.value = sortDescending(DatabaseManager.getLatestPlayers(), (entry) => entry.Timestamp)
  } catch (e) {
    useErrorToast(globalLocalize('database.open_error.title'), globalLocalize('database.open_error.message'))
    Logger.error(e, 'Database could not be opened!')
  } finally {
    loader.stop()
  }
}
