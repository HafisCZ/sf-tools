<template>
  <Page :width="pageWidth">
    <template #nav-left>
      <span v-if="temporary" class="text-xs text-accent">{{ localize('topbar.temporary_flag') }}</span>
      <SFButton
        v-for="item in NAV_ITEMS"
        :key="item.view"
        variant="ghost"
        :disabled="item.view === 'profiles' && temporary"
        :class="{ 'text-accent!': activeButton === item.view, 'text-[#ffd17c]!': historyButton === item.view }"
        :aria-current="activeButton === item.view ? 'page' : undefined"
        @click="clickNav(item.view)"
      >
        <SFIcon :name="item.icon" />
        {{ localize(item.label) }}
      </SFButton>
    </template>

    <template #nav-right>
      <a
        href="stats.html?temp"
        target="_blank"
        class="inline-flex min-h-9.5 items-center justify-center gap-2 rounded-md border border-transparent px-4 py-2 leading-5 font-bold text-white/90 transition outline-none hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <SFIcon name="user-secret" />
        {{ localize('topbar.temporary') }}
      </a>
    </template>

    <template v-if="ready">
      <PlayersGridView v-if="mounted.has('players_grid')" v-show="current === 'players_grid'" ref="players-grid-ref" />
      <PlayerView v-if="mounted.has('player')" v-show="current === 'player'" ref="player-ref" />
      <GroupsGridView v-if="mounted.has('groups_grid')" v-show="current === 'groups_grid'" ref="groups-grid-ref" />
      <GroupView v-if="mounted.has('group')" v-show="current === 'group'" ref="group-ref" />
      <PlayersView v-if="mounted.has('players')" v-show="current === 'players'" ref="players-ref" />
      <GroupsView v-if="mounted.has('groups')" v-show="current === 'groups'" ref="groups-ref" />
      <ScriptsView v-if="mounted.has('scripts')" v-show="current === 'scripts'" ref="scripts-ref" />
      <FilesView v-if="mounted.has('files')" v-show="current === 'files'" ref="files-ref" />
      <SettingsView v-if="mounted.has('settings')" v-show="current === 'settings'" ref="settings-ref" />
      <ProfilesView v-if="mounted.has('profiles')" v-show="current === 'profiles'" ref="profiles-ref" />
    </template>
  </Page>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, provide, reactive, ref, useTemplateRef, watch } from 'vue'
import SFButton from '@library/SFButton.vue'
import SFIcon from '@library/SFIcon.vue'
import { useDialog } from '@utils/dialogs'
import { type IconName } from '@utils/icons'
import { useLoader } from '@utils/loader'
import { currentLocale, useLocalize } from '@utils/localization'
import { getErrorMessage } from '@utils/utils'
import { DatabaseManager } from '~/data/database-manager'
import Page from '~/pages/Page.vue'
import FilesView from '~/pages/stats/components/FilesView.vue'
import GroupsGridView from '~/pages/stats/components/GroupsGridView.vue'
import GroupsView from '~/pages/stats/components/GroupsView.vue'
import GroupView from '~/pages/stats/components/GroupView.vue'
import PlayersGridView from '~/pages/stats/components/PlayersGridView.vue'
import PlayersView from '~/pages/stats/components/PlayersView.vue'
import PlayerView from '~/pages/stats/components/PlayerView.vue'
import ProfilesView from '~/pages/stats/components/ProfilesView.vue'
import ScriptsView from '~/pages/stats/components/ScriptsView.vue'
import SettingsView from '~/pages/stats/components/SettingsView.vue'
import BackupReminderDialog from '~/pages/stats/dialogs/BackupReminderDialog.vue'
import StatsErrorDialog from '~/pages/stats/dialogs/StatsErrorDialog.vue'
import { STATS_NAVIGATION_KEY, type StatsShowParams, type StatsView, type StatsViewInstance } from '~/pages/stats/stats'
import { Logger } from '~/site/logger'
import { type DatabaseProfile, ProfileManager } from '~/site/profiles'
import { Site } from '~/site/site'
import { Store } from '~/site/store'

defineOptions({
  name: 'StatsPage'
})

const NAV_ITEMS: { view: StatsView; icon: IconName; label: string }[] = [
  { view: 'players_grid', icon: 'user', label: 'topbar.players_grid' },
  { view: 'groups_grid', icon: 'box-archive', label: 'topbar.groups_grid' },
  { view: 'players', icon: 'database', label: 'topbar.players' },
  { view: 'scripts', icon: 'pen-to-square', label: 'topbar.scripts' },
  { view: 'files', icon: 'folder-open', label: 'topbar.files' },
  { view: 'profiles', icon: 'wrench', label: 'topbar.profile' },
  { view: 'settings', icon: 'gear', label: 'topbar.settings' }
]

const NAV_BUTTONS: Record<StatsView, StatsView> = {
  players_grid: 'players_grid',
  player: 'players_grid',
  groups_grid: 'groups_grid',
  group: 'groups_grid',
  players: 'players',
  groups: 'groups_grid',
  scripts: 'scripts',
  files: 'files',
  settings: 'settings',
  profiles: 'profiles'
}

const CLICKABLE_VIEWS: StatsView[] = ['players_grid', 'groups_grid', 'players', 'scripts', 'files', 'settings', 'profiles']

const HISTORY_VIEWS: StatsView[] = ['players_grid', 'player', 'groups_grid', 'group', 'players', 'groups']

const BACKUP_REMINDER_INTERVALS = [0, 2592000000, 604800000]

const params = new URLSearchParams(window.location.search)

const temporary = params.has('temp')

if (temporary) {
  Store.temporary()
}

const localize = useLocalize('stats')

const loader = useLoader()

const ready = ref(false)
const current = ref<StatsView | null>(null)
const previous = ref<StatsView | null>(null)
const mounted = reactive(new Set<StatsView>())

const views = {
  players_grid: useTemplateRef('players-grid-ref'),
  player: useTemplateRef('player-ref'),
  groups_grid: useTemplateRef('groups-grid-ref'),
  group: useTemplateRef('group-ref'),
  players: useTemplateRef('players-ref'),
  groups: useTemplateRef('groups-ref'),
  scripts: useTemplateRef('scripts-ref'),
  files: useTemplateRef('files-ref'),
  settings: useTemplateRef('settings-ref'),
  profiles: useTemplateRef('profiles-ref')
}

const pageWidth = computed(() => (current.value === 'files' ? '85vw' : current.value === 'scripts' ? '95vw' : undefined))

const activeButton = computed(() => (current.value ? NAV_BUTTONS[current.value] : null))

const historyButton = computed(() => (current.value === 'scripts' && previous.value && HISTORY_VIEWS.includes(previous.value) ? NAV_BUTTONS[previous.value] : null))

provide(STATS_NAVIGATION_KEY, {
  show,
  returnTo,
  get current() {
    return current.value
  }
})

watch(currentLocale, () => {
  if (current.value) {
    getView(current.value)?.reload?.()
  }
})

onMounted(() => {
  void initialize()
})

function getView(view: StatsView): StatsViewInstance | null {
  return views[view].value as StatsViewInstance | null
}

async function initialize() {
  let profile: DatabaseProfile = ProfileManager.getProfile(params.get('profile'))

  if (temporary) {
    profile = { temporary: true }
  } else if (params.has('slot')) {
    profile = { ...profile, slot: params.get('slot') as string }
  }

  loader.start()

  try {
    await DatabaseManager.load(profile)
  } catch (error) {
    loader.stop()

    useDialog(StatsErrorDialog, { message: getErrorMessage(error) })
    Logger.error(error, 'Database could not be opened!')

    return
  }

  ready.value = true

  const activeTab = temporary ? 'files' : Store.session.get<string>('activeTab', params.get('tab') || Site.options.tab)

  await show(CLICKABLE_VIEWS.includes(activeTab as StatsView) ? (activeTab as StatsView) : 'groups_grid')

  loader.stop()

  if (!profile.temporary && Site.options.backup_reminder_frequency && Site.options.backup_reminder_timestamp < Date.now()) {
    useDialog(BackupReminderDialog, {})

    Site.options.backup_reminder_timestamp = Date.now() + BACKUP_REMINDER_INTERVALS[Site.options.backup_reminder_frequency]
  }
}

async function showScreen(view: StatsView) {
  previous.value = current.value
  current.value = view

  window.scrollTo(0, 0)

  mounted.add(view)

  await nextTick()
}

async function show(view: StatsView, params: Omit<StatsShowParams, 'origin'> = {}) {
  const origin = current.value
  const originView = origin ? getView(origin) : null

  originView?.hide?.()

  await showScreen(view)

  getView(view)?.show({ origin: origin ? { view: origin, identifier: originView?.identifier } : null, ...params })

  if (CLICKABLE_VIEWS.includes(view)) {
    Store.session.set('activeTab', view)
  }
}

async function returnTo(view: StatsView) {
  if (current.value) {
    getView(current.value)?.hide?.()
  }

  await showScreen(view)

  getView(view)?.reload?.()
}

function clickNav(view: StatsView) {
  if (view === 'groups_grid' && current.value === 'group' && previous.value === 'groups') {
    void show('groups')
  } else {
    void show(view)
  }
}
</script>
