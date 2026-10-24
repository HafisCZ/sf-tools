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

      <template v-if="step === 'terms'">
        <SFHeading level="2" class="border-b border-line pb-1 text-center">{{ localize.global('terms.title') }}</SFHeading>
        <SFList>
          <li>Endpoint is an application bundled with the tool that allows you to log into the game and collect limited game data without the lengthy process of creating a HAR file.</li>
          <li>All data entered is sent directly to the game server without involvement of any 3rd party.</li>
          <li>It is not possible to capture any other players than those explicitly stated within the application.</li>
          <li>All data collection is done using normal means, without any use of forbidden actions.</li>
        </SFList>
        <SFHeading level="2" class="border-b border-line pb-1 text-center">{{ localize.global('terms.title2') }}</SFHeading>
        <SFList>
          <li>You can access your S&F Account using your username and password.</li>
          <li>Ticking Remember me stores a token in your browser that can be later used to access your S&F Account. You can press Use another account to delete it.</li>
        </SFList>
        <div class="flex gap-2">
          <SFButton block @click="rejectTerms">
            {{ localize.global('terms.button.reject') }}
          </SFButton>
          <SFButton variant="primary" block @click="acceptTerms">
            {{ localize.global('terms.button.accept') }}
          </SFButton>
        </div>
      </template>

      <form v-else-if="step === 'login'" class="flex flex-1 flex-col gap-4" @submit.prevent="submit">
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
        <SFIcon name="spinner" class="animate-spin text-3xl" />
        <SFParagraph size="lg">{{ localize('step4.title') }}</SFParagraph>
      </div>

      <template v-else-if="step === 'progress'">
        <SFHeading level="5" class="text-center">{{ localize('step4.message') }}</SFHeading>
        <SFProgress :percent="percent" />
      </template>

      <template v-else-if="step === 'character'">
        <SFHeading level="3" class="border-b border-line pb-2 text-center">{{ localize('step7.title') }}</SFHeading>
        <ul class="-mr-5 grid max-h-[392px] grid-cols-[repeat(auto-fill,192px)] justify-center gap-2 overflow-y-auto pr-5">
          <li v-for="character in characters" :key="`${character.server_id}-${character.id}`">
            <button
              type="button"
              class="@container relative block aspect-square w-full cursor-pointer overflow-hidden text-left text-white outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              :aria-pressed="selectedCharacters.includes(character)"
              @click="toggleCharacter(character)"
            >
              <img src="/res/endpoint/tile.webp" alt="" class="absolute inset-0 size-full" />
              <span class="absolute inset-0 bg-[radial-gradient(closest-side,rgb(5_121_160/0.95),rgb(5_121_160/0))] opacity-75" />
              <span class="absolute inset-[3px]">
                <CharacterRenderer v-if="character.portrait" :data="character.portrait" />
                <img v-else src="/res/endpoint/noface.webp" alt="" class="size-full" />
              </span>
              <span class="absolute inset-x-0 top-0 h-1/4 bg-linear-to-b from-[rgb(9_26_34/0.69)] to-[rgb(9_26_34/0)]" />
              <span class="absolute inset-x-0 bottom-0 h-[42%] bg-linear-to-t from-[rgb(9_26_34/0.69)] to-[rgb(9_26_34/0)]" />
              <span class="absolute inset-[3px] rounded-[2px] border shadow-[0_0_0_1px_rgb(0_0_0/0.35)]" :class="selectedCharacters.includes(character) ? 'border-accent' : 'border-line'" />
              <span class="absolute inset-x-[10px] top-[10px] truncate text-[length:max(9px,8.5cqw)] leading-none font-bold text-[#7fc8e0] uppercase text-shadow-[0_1px_2px_rgb(0_0_0/0.9)]">{{ character.world }}</span>
              <img :src="getClassImageUrl(character.char_class)" :alt="localize.global(`general.class${character.char_class}`)" class="absolute bottom-[8px] left-[8px] size-[22%]" />
              <span class="absolute right-[8px] bottom-[25px] left-[56px] truncate text-[length:max(10px,8.5cqw)] leading-[1.1] font-bold text-shadow-[0_2px_0_rgb(0_0_0/0.6)]">{{ character.name }}</span>
              <span class="absolute right-[8px] bottom-[10px] left-[56px] truncate text-[length:max(8px,6.5cqw)] leading-none font-bold text-[#f0c042] uppercase text-shadow-[0_1px_0_rgb(0_0_0/0.6)]">{{ localize.global('general.level') }} {{ character.level }}</span>
            </button>
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
import SFIcon from '@library/SFIcon.vue'
import SFInput from '@library/SFInput.vue'
import SFList from '@library/SFList.vue'
import SFParagraph from '@library/SFParagraph.vue'
import SFProgress from '@library/SFProgress.vue'
import SFSelect from '@library/SFSelect.vue'
import { type SelectOption } from '@utils/components'
import { type EndpointAccount, type EndpointCharacter, type EndpointWarning, type EndpointMode, EndpointController } from '@utils/endpoint'
import { useLocalize } from '@utils/localization'
import { useErrorToast, useToast } from '@utils/toasts'
import { getClassImageUrl, getErrorMessage, getTimestampOffset, useSubmit } from '@utils/utils'
import { useComponentValidation } from '@utils/validations'
import CharacterRenderer from '~/components/CharacterRenderer.vue'
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

type Step = 'terms' | 'login' | 'loading' | 'progress' | 'character' | 'warnings' | 'error'

type Character = EndpointCharacter & {
  server: string
  world: string
  portrait: Pick<PlayerModel, 'Face' | 'Race' | 'Gender' | 'Class'> | null
}

const TERMS_VERSION = 3

const SSO_SERVER = 'sso.playa-games.com'

const TITLE_KEYS: Record<Step, string> = {
  terms: 'terms.title',
  login: 'endpoint.login',
  loading: 'endpoint.step4.title',
  progress: 'endpoint.step4.message',
  character: 'endpoint.step7.title',
  warnings: 'endpoint.warnings.title',
  error: 'dialog.warning.title'
}

const MODES: EndpointMode[] = ['own', 'guild', 'friends', 'hall_of_fame', 'guild_friends']

const localize = useLocalize('endpoint')

const step = ref<Step>(Site.options.endpoint_terms_accepted === TERMS_VERSION ? getStartStep() : 'terms')

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

onMounted(() => {
  dialogElement.value?.focus()

  if (step.value === 'loading') {
    void loginRemembered()
  }
})

function getStartStep(): Step {
  return Store.shared.has('endpoint_token') ? 'loading' : 'login'
}

function acceptTerms() {
  Site.options.endpoint_terms_accepted = TERMS_VERSION

  step.value = getStartStep()

  if (step.value === 'loading') {
    void loginRemembered()
  }
}

function rejectTerms() {
  useToast({ title: localize.global('terms.toast.rejected.title'), message: localize.global('terms.toast.rejected.message') })

  close(false)
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
      available.push({ ...character, server: url, world: getWorldName(url), portrait: getCharacterPortrait(character) })
    }
  }

  available.sort((a, b) => a.order - b.order)

  if (available.length === 0) {
    throw new Error('playa_account_empty')
  }

  return available
}

// Country servers are named after their domain, s9.sfgame.eu is EU9
function getWorldName(server: string) {
  const [prefix, ...domain] = server.split('.')
  const number = /^s(\d+)$/.exec(prefix)?.[1]

  return number ? `${domain.at(-1)}${number}` : prefix
}

function getCharacterPortrait(character: EndpointCharacter): Character['portrait'] {
  const face = character.facedata ? parseFaceData(character.facedata) : null

  return face && character.race && character.gender ? { Face: face, Race: character.race, Gender: character.gender, Class: character.char_class } : null
}

function waitForCharacters(available: Character[]) {
  characters.value = available
  selectedCharacters.value = available.length === 1 ? [available[0]] : []
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
