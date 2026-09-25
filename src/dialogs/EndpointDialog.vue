<template>
  <div class="fixed inset-0 flex items-center justify-center bg-black/85 p-4">
    <div ref="dialog-ref" role="dialog" aria-modal="true" :aria-label="localize.global(TITLE_KEYS[step])" tabindex="-1" class="flex max-h-full min-h-[360px] w-full max-w-[400px] flex-col justify-center-safe gap-4 overflow-y-auto rounded-lg bg-white/5 p-5 text-white/90 shadow-xl backdrop-blur-md outline-none">
      <iframe ref="iframe-ref" title="Endpoint" tabindex="-1" aria-hidden="true" class="pointer-events-none fixed opacity-0" />

      <template v-if="step === 'terms'">
        <SFHeading level="2" class="border-b border-line pb-1 text-center">{{ localize.global('terms.title') }}</SFHeading>
        <SFList>
          <li>Endpoint is a small Unity application bundled with the tool that allows you to log into the game and collect limited game data without the lengthy process of creating a HAR file.</li>
          <li>All data entered is sent directly to the game server without involvement of any 3rd party.</li>
          <li>It is not possible to capture any other players than those explicitly stated within the application.</li>
          <li>All data collection is done using normal means, without any use of forbidden actions.</li>
        </SFList>
        <SFHeading level="2" class="border-b border-line pb-1 text-center">{{ localize.global('terms.title2') }}</SFHeading>
        <SFList>
          <li>You can access your S&F Account using your username and password.</li>
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

      <form v-else-if="step === 'login'" class="flex flex-1 flex-col gap-4" @submit.prevent="login">
        <SFHeading level="3" class="border-b border-line pb-2 text-center">{{ localize('login') }}</SFHeading>
        <SFInput ref="username-ref" v-model="username" :label="localize('username')" name="username" autocomplete="username" />
        <SFInput ref="password-ref" v-model="password" :label="localize('password')" name="password" type="password" autocomplete="current-password" />
        <SFCheckbox v-if="props.allowTemporary" ref="temporary-ref" v-model="temporary" :label="localize('temporary')" />
        <div class="mt-auto flex gap-2">
          <SFButton block @click="close(false)">
            {{ localize('cancel') }}
          </SFButton>
          <SFButton variant="primary" type="submit" block :disabled="!isLoginValid">
            {{ localize('continue') }}
          </SFButton>
        </div>
      </form>

      <template v-else-if="step === 'unity'">
        <img src="/endpoint/logo.png" alt="" class="mx-auto animate-pulse" />
        <SFHeading level="5" class="text-center">{{ localize('step2.title') }}</SFHeading>
      </template>

      <div v-else-if="step === 'loading'" class="flex flex-col items-center gap-4">
        <SFIcon name="spinner" class="animate-spin text-3xl" />
        <SFParagraph size="lg">{{ localize('step4.title') }}</SFParagraph>
      </div>

      <template v-else-if="step === 'progress'">
        <SFHeading level="5" class="text-center">{{ localize('step4.message') }}</SFHeading>
        <SFProgress :percent="percent" />
      </template>

      <template v-else-if="step === 'select'">
        <SFHeading level="3" class="border-b border-line pb-2 text-center">{{ localize('step3.title') }}</SFHeading>
        <SFCheckbox ref="all-targets-ref" v-model="allTargetsSelected" :indeterminate="someTargetsSelected" :label="localize('step3.toggle')" />
        <ul class="flex h-[30em] flex-col gap-2 overflow-y-auto border-t border-line pt-3">
          <li v-for="(target, index) in targets" :key="index">
            <SFCheckbox ref="targets-ref" v-model="target.selected">
              <span class="flex flex-1 items-center justify-between gap-2">
                {{ target.name }}
                <SFIcon :name="target.icon" class="text-white/60" />
              </span>
            </SFCheckbox>
          </li>
        </ul>
        <div class="flex gap-2">
          <SFButton block @click="close(false)">
            {{ localize('cancel') }}
          </SFButton>
          <SFButton variant="primary" block :disabled="!isSelectionValid" @click="selectTargets">
            {{ localize('continue') }}
          </SFButton>
        </div>
      </template>

      <template v-else-if="step === 'character'">
        <SFHeading level="3" class="border-b border-line pb-2 text-center">{{ localize('step7.title') }}</SFHeading>
        <ul class="flex h-[30em] flex-col gap-2 overflow-y-auto">
          <li v-for="character in characters" :key="`${character.server_id}-${character.id}`">
            <button type="button" class="w-full cursor-pointer rounded-md border p-4 text-left transition" :class="character === selectedCharacter ? 'border-accent' : 'border-line hover:bg-surface-hover'" :aria-pressed="character === selectedCharacter" @click="selectedCharacter = character">
              <span class="block">
                {{ character.name }}
                <span class="ml-2 text-xs text-white/60">({{ localize.global(`general.class${character.char_class}`) }} - {{ localize.global('general.level') }} {{ character.level }})</span>
              </span>
              <span class="block text-white/60">{{ character.server }}</span>
            </button>
          </li>
        </ul>
        <SFSelect ref="mode-ref" v-model="mode" :label="localize('mode.title')" :options="modeOptions" />
        <div class="flex gap-2">
          <SFButton block @click="close(false)">
            {{ localize('cancel') }}
          </SFButton>
          <SFButton variant="primary" block :disabled="!selectedCharacter || !isCharacterValid" @click="selectCharacter">
            {{ localize('continue') }}
          </SFButton>
        </div>
      </template>

      <template v-else-if="step === 'error'">
        <SFHeading level="3" class="text-center">{{ errorText }}</SFHeading>
        <SFButton block class="mt-6" @click="step = 'login'">
          {{ localize('continue') }}
        </SFButton>
      </template>
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
import { type EndpointCharacter, type EndpointLogin, EndpointController } from '@utils/endpoint'
import { type IconName } from '@utils/icons'
import { useLocalize } from '@utils/localization'
import { useErrorToast, useToast } from '@utils/toasts'
import { getErrorMessage, getTimestampOffset } from '@utils/utils'
import { useComponentValidation } from '@utils/validations'
import { Logger } from '~/core/logger'
import { Site } from '~/core/site'
import { Store } from '~/core/store'
import { DatabaseManager } from '~/data/database-manager'
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

type Step = 'terms' | 'login' | 'unity' | 'loading' | 'progress' | 'select' | 'character' | 'error'

type Target = {
  name: string
  icon: IconName
  selected: boolean
}

type Character = EndpointCharacter & {
  server: string
}

const TERMS_VERSION = 2

const TITLE_KEYS: Record<Step, string> = {
  terms: 'terms.title',
  login: 'endpoint.login',
  unity: 'endpoint.step2.title',
  loading: 'endpoint.step4.title',
  progress: 'endpoint.step4.message',
  select: 'endpoint.step3.title',
  character: 'endpoint.step7.title',
  error: 'dialog.warning.title'
}

const MODES = ['own', 'default', 'guild', 'friends', 'hall_of_fame']

const localize = useLocalize('endpoint')

const step = ref<Step>(Site.options.endpoint_terms_accepted === TERMS_VERSION ? 'login' : 'terms')

const username = ref('')
const password = ref('')
const mode = ref(Store.shared.get('endpoint_mode', 'default', true))
const temporary = ref(false)

const percent = ref(0)
const errorText = ref('')

const targets = ref<Target[]>([])
const characters = shallowRef<Character[]>([])
const selectedCharacter = shallowRef<Character>()

const dialogElement = useTemplateRef('dialog-ref')
const iframeElement = useTemplateRef('iframe-ref')

let controller: EndpointController | undefined

let resolveTargets: ((names: string[]) => void) | undefined
let resolveCharacter: ((character: Character) => void) | undefined

const isLoginValid = useComponentValidation(useTemplateRef('username-ref'), useTemplateRef('password-ref'), useTemplateRef('temporary-ref'))

const isCharacterValid = useComponentValidation(useTemplateRef('mode-ref'))

const isSelectionValid = useComponentValidation(useTemplateRef('all-targets-ref'), useTemplateRef('targets-ref'))

const modeOptions = computed<SelectOption[]>(() => MODES.map((value) => ({ value, label: localize(`mode.${value}`) })))

const allTargetsSelected = computed({
  get: () => targets.value.every((target) => target.selected),
  set: (value) => {
    for (const target of targets.value) {
      target.selected = value
    }
  }
})

const someTargetsSelected = computed(() => !allTargetsSelected.value && targets.value.some((target) => target.selected))

watch(mode, (value) => {
  if (Store.isPermanent()) {
    Store.shared.set('endpoint_mode', value, true)
  }
})

onMounted(() => {
  dialogElement.value?.focus()
})

function acceptTerms() {
  Site.options.endpoint_terms_accepted = TERMS_VERSION

  step.value = 'login'
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

  if (!iframeElement.value) return

  try {
    if (!controller) {
      step.value = 'unity'

      controller = new EndpointController(iframeElement.value, showProgress)

      await controller.load()
    }

    step.value = 'loading'

    const account = await signIn(controller, username.value, password.value)
    const capture = await captureMode(controller, account)

    await importCapture(capture.data)
  } catch (error) {
    showError(error)
  }
}

async function signIn(endpoint: EndpointController, name: string, secret: string) {
  const account = await endpoint.login('sso.playa-games.com', name, secret)

  const available: Character[] = []

  for (const character of account.characters) {
    const url = Playa.getServerUrlById(character.server_id)

    if (url) {
      available.push({ ...character, server: url })
    }
  }

  available.sort((a, b) => a.order - b.order)

  if (available.length === 0) {
    throw new Error('playa_account_empty')
  }

  const character = await waitForCharacter(available)

  step.value = 'loading'

  return endpoint.continueLogin(character.server, character.name, character.id)
}

async function captureMode(endpoint: EndpointController, account: EndpointLogin) {
  if (mode.value === 'own') {
    return endpoint.querySelf()
  } else if (mode.value === 'guild') {
    return endpoint.query(account.members)
  } else if (mode.value === 'friends') {
    return endpoint.query(account.friends)
  } else if (mode.value === 'hall_of_fame') {
    return endpoint.queryHallOfFame()
  } else if (account.members.length > 0 || account.friends.length > 0) {
    const names = await waitForTargets(account)

    step.value = 'loading'

    return endpoint.query(names)
  } else {
    return endpoint.querySelf()
  }
}

function waitForCharacter(available: Character[]) {
  characters.value = available
  selectedCharacter.value = available.length === 1 ? available[0] : undefined
  step.value = 'character'

  return new Promise<Character>((resolve) => {
    resolveCharacter = resolve
  })
}

function waitForTargets(account: EndpointLogin) {
  targets.value = [...account.members.map((name) => ({ name, icon: 'circle-user' as const, selected: false })), ...account.friends.map((name) => ({ name, icon: 'thumbs-up' as const, selected: false }))]
  step.value = 'select'

  return new Promise<string[]>((resolve) => {
    resolveTargets = resolve
  })
}

function selectCharacter() {
  if (selectedCharacter.value) {
    resolveCharacter?.(selectedCharacter.value)
  }
}

function selectTargets() {
  resolveTargets?.(targets.value.filter((target) => target.selected).map((target) => target.name))
}

function showProgress(value: number) {
  step.value = 'progress'
  percent.value = value
}

function showError(error: unknown) {
  const message = getErrorMessage(error)

  errorText.value = message.length > 50 ? message.slice(message.indexOf(':') + 1) : localize(`errors.${message.toLowerCase().replace(/\s|:/g, '_')}`)
  step.value = 'error'
}

async function importCapture(text: string) {
  try {
    await DatabaseManager.import(text, Date.now(), getTimestampOffset(), { temporary: temporary.value })
  } catch (error) {
    useErrorToast(localize.global('database.import_error'), getErrorMessage(error))
    Logger.error(error, 'Error occured while trying to import a file!')
  }

  close(true)
}

function close(imported: boolean) {
  if (controller) {
    void controller.destroy()

    controller = undefined
  }

  emit('close', imported)
}
</script>
