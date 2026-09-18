import { unique } from '@utils/utils'
import { ProfileManager } from '~/site/profiles'
import { Store } from '~/site/store'
import { DatabaseManager } from './database-manager'
import { DatabaseUtils } from './indexed-db'

type RecoverySlot = {
  players: unknown[]
  groups: unknown[]
  trackers: unknown[]
  metadata: unknown[]
  links?: unknown[]
}

export type RecoveryDump = {
  timestamp: number
  preferences: Record<string, unknown>
  data: Record<string, RecoverySlot>
}

export async function recoverDump(json: RecoveryDump) {
  const { preferences, data } = json

  await DatabaseManager.reset()

  for (const [key, value] of Object.entries(preferences)) {
    Store.shared.set(key, value, true)
  }

  for (const [slot, { players, groups, trackers, metadata, links }] of Object.entries(data)) {
    const db = await DatabaseUtils.createSession(parseInt(slot || '0'))

    await db.clear('players')
    await db.clear('groups')
    await db.clear('trackers')
    await db.clear('metadata')
    await db.clear('links')

    for (const player of players) {
      await db.set('players', player)
    }

    for (const group of groups) {
      await db.set('groups', group)
    }

    for (const tracker of trackers) {
      await db.set('trackers', tracker)
    }

    for (const entry of metadata) {
      await db.set('metadata', entry)
    }

    for (const link of links ?? []) {
      await db.set('links', link)
    }
  }
}

export async function createDump(): Promise<RecoveryDump> {
  const preferences = Store.shared.all()
  const slots = unique(Object.values(ProfileManager.profiles).map((profile) => profile.slot || 0))
  const dumps: Record<string, RecoverySlot> = {}

  await Promise.all(
    slots.map(async (slot) => {
      const db = await DatabaseUtils.createSession(parseInt(String(slot || '0')))

      dumps[slot] = {
        players: await db.where('players'),
        groups: await db.all('groups'),
        trackers: await db.all('trackers'),
        metadata: await db.all('metadata'),
        links: await db.all('links')
      }
    })
  )

  return {
    timestamp: Date.now(),
    preferences,
    data: dumps
  }
}
