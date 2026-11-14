<template>
  <div class="fixed inset-0 flex items-center justify-center bg-black/85 p-4">
    <div
      ref="dialog-ref"
      role="dialog"
      aria-modal="true"
      :aria-label="localize.global(TITLE_KEYS[step])"
      tabindex="-1"
      class="flex max-h-full min-h-[360px] w-full flex-col justify-center-safe gap-4 overflow-y-auto rounded-lg bg-white/5 p-5 text-white/90 shadow-xl backdrop-blur-md outline-none"
      :class="step === 'character' ? 'max-w-[1032px]' : 'max-w-[400px]'"
    >
      <iframe ref="iframe-ref" title="Endpoint" tabindex="-1" aria-hidden="true" class="pointer-events-none fixed opacity-0" />

      <form v-if="step === 'login'" class="flex flex-1 flex-col gap-4" @submit.prevent="submit">
        <SFHeading level="3" class="border-b border-line pb-2 text-center">{{ localize('login') }}</SFHeading>
        <SFInput ref="username-ref" v-model="username" :label="localize('username')" name="username" autocomplete="username" />
        <SFInput ref="password-ref" v-model="password" :label="localize('password')" name="password" type="password" autocomplete="current-password" />
        <SFCheckbox v-if="Store.isPermanent()" v-model="remember" :label="localize('remember')" />
        <div class="mt-auto flex gap-2">
          <SFButton block @click="close(false)">
            {{ localize('cancel') }}
          </SFButton>
          <SFButton variant="primary" type="submit" block :disabled="isSubmitting ? 'loading' : !isLoginValid">
            {{ localize('continue') }}
          </SFButton>
        </div>
      </form>

      <div v-else-if="step === 'loading'" class="flex flex-col items-center gap-4">
        <img src="/res/favicon.png" alt="" width="100" class="animate-[spin_1.2s_linear_infinite] opacity-65 select-none" />
        <SFParagraph size="lg">{{ localize('step4.title') }}</SFParagraph>
      </div>

      <template v-else-if="step === 'progress'">
        <SFHeading level="5" class="text-center">{{ localize('step4.message') }}</SFHeading>
        <SFProgress :percent="percent" />
      </template>

      <template v-else-if="step === 'character'">
        <div class="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-line pb-2">
          <SFHeading level="3">{{ localize('step7.title') }}</SFHeading>
          <div class="min-w-0 flex-[1_1_240px] sm:max-w-75">
            <SFInput v-model="search" type="search" :aria-label="localize('step7.search')" :placeholder="localize('step7.search')" />
          </div>
        </div>
        <ul ref="list-ref" class="-mr-5 grid max-h-[392px] grid-cols-[repeat(auto-fill,192px)] justify-center gap-2 overflow-y-auto pr-5" :style="{ minHeight: listHeight }">
          <li v-for="character in visibleCharacters" :key="`${character.server_id}-${character.id}`">
            <CharacterTile :name="character.name" :level="character.level" :character-class="character.char_class" :world="character.world" :portrait="character.portrait" :favorite="Boolean(character.is_favorite)" :selected="selectedCharacters.includes(character)" :aria-pressed="selectedCharacters.includes(character)" @click="toggleCharacter(character)" />
          </li>
        </ul>
        <SFSelect ref="mode-ref" v-model="mode" :label="localize('mode.title')" :options="modeOptions" />
        <SFCheckbox v-if="props.allowTemporary" ref="temporary-ref" v-model="temporary" :label="localize('temporary')" />
        <div class="grid grid-cols-3 gap-2">
          <SFButton variant="ghost" block @click="useAnotherAccount">
            {{ localize('another_account') }}
          </SFButton>
          <SFButton block @click="close(false)">
            {{ localize('cancel') }}
          </SFButton>
          <SFButton variant="primary" block :disabled="selectedCharacters.length === 0 || !isCharacterValid" @click="selectCharacters">
            {{ localize('continue') }}
          </SFButton>
        </div>
      </template>

      <template v-else-if="step === 'warnings'">
        <SFHeading level="3" class="border-b border-line pb-2 text-center">{{ localize('warnings.title') }}</SFHeading>
        <ul class="flex max-h-[15em] flex-col gap-1 overflow-y-auto text-sm text-amber-500">
          <li v-for="(warning, index) in warnings" :key="index">{{ warning }}</li>
        </ul>
        <SFButton block @click="close(true)">
          {{ localize.global('dialog.shared.close') }}
        </SFButton>
      </template>

      <template v-else-if="step === 'error'">
        <SFHeading level="3" class="text-center">{{ errorText }}</SFHeading>
        <ul v-if="warnings.length > 1" class="flex max-h-[15em] flex-col gap-1 overflow-y-auto text-sm text-amber-500">
          <li v-for="(warning, index) in warnings" :key="index">{{ warning }}</li>
        </ul>
        <SFButton block class="mt-6" @click="step = 'login'">
          {{ localize('continue') }}
        </SFButton>
      </template>

      <ul v-if="warnings.length > 0 && (step === 'loading' || step === 'progress')" class="flex max-h-[15em] flex-col gap-1 overflow-y-auto text-sm text-amber-500">
        <li v-for="(warning, index) in warnings" :key="index">{{ warning }}</li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, shallowRef, useTemplateRef, watch } from 'vue'
import SFButton from '@library/SFButton.vue'
import SFCheckbox from '@library/SFCheckbox.vue'
import SFHeading from '@library/SFHeading.vue'
import SFInput from '@library/SFInput.vue'
import SFParagraph from '@library/SFParagraph.vue'
import SFProgress from '@library/SFProgress.vue'
import SFSelect from '@library/SFSelect.vue'
import { type SelectOption } from '@utils/components'
import { type EndpointAccount, type EndpointCharacter, type EndpointWarning, type EndpointMode, EndpointController } from '@utils/endpoint'
import { formatWorldName } from '@utils/formatting'
import { useLocalize } from '@utils/localization'
import { useErrorToast, useToast } from '@utils/toasts'
import { getErrorMessage, getTimestampOffset, useSubmit } from '@utils/utils'
import { useComponentValidation } from '@utils/validations'
import CharacterTile from '~/components/CharacterTile.vue'
import { Logger } from '~/core/logger'
import type { PlayerModel } from '~/core/models/player'
import { Site } from '~/core/site'
import { Store } from '~/core/store'
import { DatabaseManager } from '~/data/database-manager'
import { parseFaceData } from '~/playa/portraits'
import { Playa } from '~/playa/servers'

defineOptions({
  name: 'EndpointDialog'
})

const props = defineProps<{
  /**
   * Offers to discard the capture when the page is closed
   */
  allowTemporary?: boolean
}>()

const emit = defineEmits<{
  close: [imported: boolean]
}>()

type Step = 'login' | 'loading' | 'progress' | 'character' | 'warnings' | 'error'

type Character = EndpointCharacter & {
  server: string
  world: string
  portrait: Pick<PlayerModel, 'Face' | 'Race' | 'Gender' | 'Class'> | null
}

const SSO_SERVER = 'sso.playa-games.com'

const TITLE_KEYS: Record<Step, string> = {
  login: 'endpoint.login',
  loading: 'endpoint.step4.title',
  progress: 'endpoint.step4.message',
  character: 'endpoint.step7.title',
  warnings: 'endpoint.warnings.title',
  error: 'dialog.warning.title'
}

const MODES: EndpointMode[] = ['own', 'guild', 'friends', 'hall_of_fame', 'guild_friends']

const localize = useLocalize('endpoint')

const step = ref<Step>(getStartStep())

const storedMode = Store.shared.get('endpoint_mode', 'own', true)

const username = ref('')
const password = ref('')
const mode = ref<EndpointMode>(MODES.find((value) => value === storedMode) ?? 'own')
const temporary = ref(false)
const remember = ref(false)

const percent = ref(0)
const errorText = ref('')
const warnings = ref<string[]>([])

const characters = shallowRef<Character[]>([])
const selectedCharacters = shallowRef<Character[]>([])

const search = ref('')

const listHeight = ref<string>()
const listElement = useTemplateRef('list-ref')

const visibleCharacters = computed(() => {
  const query = search.value.trim().toLowerCase()

  return characters.value.filter((character) => `${character.name} ${character.world} ${character.server}`.toLowerCase().includes(query))
})

const dialogElement = useTemplateRef('dialog-ref')
const iframeElement = useTemplateRef('iframe-ref')

let controller: EndpointController | undefined

let resolveCharacters: ((characters: Character[] | null) => void) | undefined

const isLoginValid = useComponentValidation(useTemplateRef('username-ref'), useTemplateRef('password-ref'))

const isCharacterValid = useComponentValidation(useTemplateRef('mode-ref'), useTemplateRef('temporary-ref'))

const { submit, isSubmitting } = useSubmit(login)

const modeOptions = computed<SelectOption<EndpointMode>[]>(() => MODES.map((value) => ({ value, label: localize(`mode.${value}`) })))

watch(mode, (value) => {
  if (Store.isPermanent()) {
    Store.shared.set('endpoint_mode', value, true)
  }
})

watch(search, (value, previous) => {
  if (!value) {
    listHeight.value = undefined
  } else if (!previous && listElement.value) {
    listHeight.value = `${listElement.value.offsetHeight}px`
  }
})

onMounted(() => {
  dialogElement.value?.focus()

  if (step.value === 'loading') {
    void loginRemembered()
  }
})

function getStartStep(): Step {
  return Store.shared.has('endpoint_token') ? 'loading' : 'login'
}

async function login() {
  if (username.value.length < 3 || password.value.length < 3) {
    useToast({ title: localize('user_error.title'), message: localize('user_error.message'), type: 'warning' })

    return
  }

  await runCapture((endpoint) => endpoint.playaAccountLogin(SSO_SERVER, username.value, password.value, remember.value), false)
}

async function loginRemembered() {
  const token = Store.shared.get('endpoint_token', '', true)

  await runCapture((endpoint) => endpoint.playaAccountLoginViaToken(SSO_SERVER, token), true)
}

async function runCapture(signIn: (endpoint: EndpointController) => Promise<EndpointAccount>, remembered: boolean) {
  if (!iframeElement.value) return

  warnings.value = []

  try {
    if (!controller) {
      controller = new EndpointController(iframeElement.value, showProgress, showWarning)

      await controller.load()
    }

    step.value = 'loading'

    let account: EndpointAccount

    try {
      account = await signIn(controller)
    } catch (error) {
      if (remembered && getErrorMessage(error) !== 'error_unreachable') {
        Store.shared.remove('endpoint_token')

        step.value = 'login'

        useToast({ title: localize('remember_expired.title'), message: localize('remember_expired.message'), type: 'warning' })

        return
      }

      throw error
    }

    saveToken(account.token)

    const selected = await waitForCharacters(listCharacters(account))

    if (!selected) return

    step.value = 'loading'

    const capture = await controller.execute(
      selected.map((character) => ({ id: character.id, username: character.name, server: character.server })),
      mode.value
    )

    await importCapture(capture.data)
  } catch (error) {
    showError(error)
  }
}

function saveToken(token: string | undefined) {
  if (token && Store.isPermanent()) {
    Store.shared.set('endpoint_token', token, true)
  } else {
    Store.shared.remove('endpoint_token')
  }
}

function listCharacters(account: EndpointAccount) {
  const available: Character[] = []

  for (const character of account.characters) {
    const url = Playa.getServerUrlById(character.server_id)

    if (url) {
      available.push({ ...character, server: url, world: formatWorldName(url), portrait: getCharacterPortrait(character) })
    }
  }

  available.sort((a, b) => (b.is_favorite ? 1 : 0) - (a.is_favorite ? 1 : 0) || a.order - b.order)

  if (available.length === 0) {
    throw new Error('playa_account_empty')
  }

  return available
}

function getCharacterPortrait(character: EndpointCharacter): Character['portrait'] {
  const face = character.facedata ? parseFaceData(character.facedata) : null

  return face && character.race && character.gender ? { Face: face, Race: character.race, Gender: character.gender, Class: character.char_class } : null
}

function waitForCharacters(available: Character[]) {
  characters.value = available
  selectedCharacters.value = available.length === 1 ? [available[0]] : []
  search.value = ''
  step.value = 'character'

  return new Promise<Character[] | null>((resolve) => {
    resolveCharacters = resolve
  })
}

function useAnotherAccount() {
  Store.shared.remove('endpoint_token')

  resolveCharacters?.(null)

  step.value = 'login'
}

function toggleCharacter(character: Character) {
  if (!Site.options.endpoint_fetch_multiple) {
    selectedCharacters.value = [character]
  } else if (selectedCharacters.value.includes(character)) {
    selectedCharacters.value = selectedCharacters.value.filter((selected) => selected !== character)
  } else {
    selectedCharacters.value = [...selectedCharacters.value, character]
  }
}

function selectCharacters() {
  if (selectedCharacters.value.length > 0) {
    resolveCharacters?.(characters.value.filter((character) => selectedCharacters.value.includes(character)))
  }
}

function showProgress(value: number) {
  step.value = 'progress'
  percent.value = value
}

function showWarning(warning: EndpointWarning) {
  const error = formatError(warning.warning)

  if (warning.target) {
    warnings.value.push(localize('warnings.entry_target', { player: warning.player, server: warning.server, target: warning.target, error }))
  } else {
    warnings.value.push(localize('warnings.entry', { player: warning.player, server: warning.server, error }))
  }
}

function formatError(message: string) {
  return message.length > 50 ? message.slice(message.indexOf(':') + 1) : localize(`errors.${message.toLowerCase().replace(/\s|:/g, '_')}`)
}

function showError(error: unknown) {
  errorText.value = formatError(getErrorMessage(error))
  step.value = 'error'
}

async function importCapture(text: string) {
  try {
    await DatabaseManager.import(text, Date.now(), getTimestampOffset(), { temporary: temporary.value })
  } catch (error) {
    useErrorToast(localize.global('database.import_error'), getErrorMessage(error))
    Logger.error(error, 'Error occured while trying to import a file!')
  }

  if (warnings.value.length > 0) {
    step.value = 'warnings'
  } else {
    close(true)
  }
}

function close(imported: boolean) {
  if (controller) {
    void controller.destroy()

    controller = undefined
  }

  emit('close', imported)
}
</script>
