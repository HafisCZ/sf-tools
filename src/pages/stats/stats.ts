import { computed, inject, nextTick, onBeforeUnmount, onMounted, ref, watch, type InjectionKey, type Ref } from 'vue'
import { type ExpressionSuggestion } from '@utils/components'
import { useDialog } from '@utils/dialogs'
import { type IconName } from '@utils/icons'
import { useLoader } from '@utils/loader'
import { Site } from '~/core/site'
import { Store } from '~/core/store'
import { DatabaseManager, type RemovalData } from '~/data/database-manager'
import { ScriptCommands, type ScriptType } from '~/script/commands'
import { Constants } from '~/script/constants'
import { DEFAULT_EXPRESSION_CONFIG, TABLE_EXPRESSION_CONFIG, type ExpressionConfig } from '~/script/expression-config'
import { ScriptRenderer } from '~/script/renderer'
import { type StoredScript } from '~/script/scripts'
import DataManageDialog from './dialogs/DataManageDialog.vue'

export type StatsView = 'players_grid' | 'player' | 'groups_grid' | 'group' | 'players' | 'groups' | 'scripts' | 'files' | 'settings' | 'profiles'

export type StatsOrigin = {
  view: StatsView
  identifier?: string
}

export type StatsShowParams = {
  origin?: StatsOrigin | null
  identifier?: string
  blank?: boolean
  key?: string
  forceUpdate?: boolean
}

export type StatsViewInstance = {
  show: (params: StatsShowParams) => void
  hide?: () => void
  reload?: () => void
  readonly identifier?: string
}

export type StatsNavigation = {
  show: (view: StatsView, params?: Omit<StatsShowParams, 'origin'>) => void
  returnTo: (view: StatsView) => void
  readonly current: StatsView | null
}

export const STATS_NAVIGATION_KEY: InjectionKey<StatsNavigation> = Symbol('StatsNavigation')

export type ContextMenuItem = {
  /**
   * Text of the item
   */
  label: string
  /**
   * Runs with the element the menu was opened on
   */
  action: (source: HTMLElement) => void
}

export type GridAction = {
  /**
   * Text of the button
   */
  label: string
  /**
   * Icon shown before the text
   */
  icon: IconName
  /**
   * Shows the button without letting it be clicked
   */
  disabled?: boolean
  /**
   * Runs when the button is clicked
   */
  action: () => void
}

export type FileListEntry = {
  /**
   * Timestamp of the file
   */
  timestamp: number
  /**
   * Formatted timestamp
   */
  date: string
  /**
   * Number of players in the file
   */
  playerCount: number
  /**
   * Number of guilds in the file
   */
  groupCount: number
  /**
   * Game version the file was captured with
   */
  version: unknown
  /**
   * Tags used in the file
   */
  tagList: string[]
  /**
   * Tag labels, with the count when not every entry has the tag
   */
  tags: { name: string; label: string }[]
  /**
   * Shows the file greyed out
   */
  hidden: boolean
}

export type EntryListEntry = {
  /**
   * Key of the entry
   */
  key: string
  /**
   * Formatted timestamp
   */
  date: string
  /**
   * Formatted server
   */
  prefix: string
  /**
   * Shows the player icon instead of the guild icon
   */
  player: boolean
  /**
   * Name of the player or guild
   */
  name: string
  /**
   * Guild name of the player
   */
  group: string
  /**
   * Tags of the entry
   */
  tags: string[]
  /**
   * Shows the entry greyed out
   */
  hidden: boolean
}

export type ScriptEditResult = {
  script: Pick<StoredScript, 'name' | 'description'> & { tables: string[]; content?: string }
  source: string | null
}

export const TABLE_VIEWS: StatsView[] = ['players', 'groups', 'groups_grid', 'group', 'players_grid', 'player']

export const PLAYER_CLASS_SEARCH = ['', 'warrior', 'mage', 'scout', 'assassin', 'battle mage', 'berserker', 'demon hunter', 'druid', 'bard', 'necromancer', 'paladin', 'plague doctor']

export function useStatsNavigation() {
  return inject(STATS_NAVIGATION_KEY) as StatsNavigation
}

let starredFilters: Ref<string[]> | undefined

// Read on first use, after the page switched the store to temporary mode
export function useStarredFilters() {
  return (starredFilters ??= ref(Store.get<string[]>('starred', [])))
}

export function saveStarredFilters(filters: string[]) {
  useStarredFilters().value = filters

  Store.set('starred', filters)
}

async function removeWithLoader(data: RemovalData) {
  const loader = useLoader()

  loader.start()

  try {
    await DatabaseManager.removeEntries(data)
  } finally {
    loader.stop()
  }
}

export function safeRemove(data: RemovalData) {
  if (Site.options.unsafe_delete) {
    return removeWithLoader(data).then(() => true)
  } else {
    return new Promise<boolean>((resolve) => {
      useDialog(DataManageDialog, { data }, { callback: (removed: boolean) => resolve(removed) })
    })
  }
}

const SUGGESTION_ICONS: Record<string, IconName> = {
  header: 'heading',
  accessor: 'font',
  function: 'gear',
  variable: 'hashtag',
  enumeration: 'book'
}

export function createScriptSuggestions(scriptType: ScriptType): ExpressionSuggestion[] {
  return [
    ...ScriptCommands.commands()
      .filter((command) => command.type & scriptType && command.metadata.isDeprecated === undefined)
      .map((command) => ({ value: command.syntax.fieldText, label: command.syntax.text, icon: 'code' as const, line: true })),
    ...Array.from(TABLE_EXPRESSION_CONFIG.entries())
      .filter(([, entry]) => !entry.isInternal)
      .map(([name, entry]) => ({ value: entry.syntax.fieldText, label: name, icon: SUGGESTION_ICONS[entry.type] })),
    ...Array.from(Constants.DEFAULT_CONSTANTS_VALUES.keys()).map((name) => ({ value: name, label: name.slice(1), icon: 'at' as const }))
  ]
}

export function highlightScript(scriptType: ScriptType) {
  return (value: string) => ScriptRenderer.render(value, scriptType)
}

export function createAccessorConfig(names: string[]) {
  const config = DEFAULT_EXPRESSION_CONFIG.clone()

  for (const name of names) {
    config.register('accessor', 'none', name, (object: Record<string, unknown>) => object[name])
  }

  return config
}

let playerProfileConfig: ExpressionConfig | undefined
let groupProfileConfig: ExpressionConfig | undefined

export function getPlayerProfileConfig() {
  return (playerProfileConfig ??= createAccessorConfig(['timestamp', 'identifier', 'prefix', 'tag', 'version', 'own', 'name', 'identifier', 'group', 'groupname', 'save']))
}

export function getGroupProfileConfig() {
  return (groupProfileConfig ??= createAccessorConfig(['timestamp', 'identifier', 'prefix', 'own', 'name', 'identifier', 'save']))
}

export function useIncrementalList<TItem>(items: Readonly<Ref<TItem[]>>, blockSize: number, sentinel: Readonly<Ref<HTMLElement | null>>) {
  const count = ref(blockSize)

  const visibleItems = computed(() => items.value.slice(0, count.value))

  let observer: IntersectionObserver | undefined

  function isSentinelVisible() {
    const element = sentinel.value

    return element !== null && element.offsetParent !== null && element.getBoundingClientRect().top <= window.innerHeight
  }

  async function loadMore() {
    while (count.value < items.value.length && isSentinelVisible()) {
      count.value += blockSize

      await nextTick()
    }
  }

  watch(items, () => {
    count.value = blockSize

    void nextTick(loadMore)
  })

  onMounted(() => {
    observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          void loadMore()
        }
      },
      { threshold: 1 }
    )

    if (sentinel.value) {
      observer.observe(sentinel.value)
    }
  })

  onBeforeUnmount(() => {
    observer?.disconnect()
  })

  return { visibleItems, loadMore }
}
