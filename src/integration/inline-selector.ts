import { shallowRef } from 'vue'
import { useDialog, useFilePicker } from '@utils/dialogs'
import { useLoader } from '@utils/loader'
import { globalLocalize } from '@utils/localization'
import { useErrorToast } from '@utils/toasts'
import { getErrorMessage, sortDescending } from '@utils/utils'
import { Logger } from '~/core/logger'
import { type PlayerModel } from '~/core/models/player'
import { SELF_PROFILE } from '~/core/profiles'
import { DatabaseManager } from '~/data/database-manager'
import EndpointDialog from '~/dialogs/EndpointDialog.vue'

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

export function importInlineSelectorFiles() {
  useFilePicker({
    accept: '.har,.json',
    multiple: true,
    callback: (files) => void readFiles(files)
  })
}

async function readFiles(files: File[]) {
  const loader = useLoader()

  loader.start({ progress: true })

  let filesDone = 0

  await Promise.all(
    files.map(async (file) => {
      try {
        await DatabaseManager.import(await file.text(), file.lastModified)
      } catch (e) {
        useErrorToast(globalLocalize('database.import_error'), getErrorMessage(e))
        Logger.error(e, 'Error occured while trying to import a file!')
      }

      loader.progress(++filesDone / files.length)
    })
  )

  await reloadInlineSelectorPlayers()
}

export function importInlineSelectorEndpoint() {
  useDialog(
    EndpointDialog,
    { allowTemporary: true },
    {
      callback: (imported) => {
        if (imported) {
          void reloadInlineSelectorPlayers()
        }
      }
    }
  )
}
