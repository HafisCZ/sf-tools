<template>
  <Page :link="false" :opaque="false">
    <div class="fixed inset-0 flex items-center justify-center p-4">
      <section v-if="isValidRequest" class="flex w-full max-w-[570px] flex-col gap-5 rounded-lg border border-line bg-dialog p-5 text-white/90 shadow-xl" :aria-labelledby="titleId">
        <SFHeading :id="titleId" level="3" class="border-b border-line pb-1.5 text-center">
          <span class="text-accent">{{ requester }}</span>
          {{ localize('title') }}
        </SFHeading>
        <SFParagraph class="text-center">
          <span v-html="localize('notice#')" />
        </SFParagraph>
        <div class="flex h-[45vh] flex-col gap-[14px] overflow-y-scroll pr-[14px]">
          <button v-for="player in players" :key="player.LinkId" type="button" class="group flex cursor-pointer items-center gap-[14px] rounded-[3.5px] border border-white/20 p-[7px] text-left outline-none hover:bg-page focus-visible:bg-page" @click="sendData(player)">
            <img :src="getClassImageUrl(player.Class)" alt="" class="size-[42px]" />
            <span>
              <span class="block text-white/50">{{ player.Prefix }}</span>
              <span class="block">{{ player.Name }}</span>
            </span>
            <SFIcon name="right-to-bracket" class="invisible mr-1 ml-auto text-[28px] text-white/50 group-hover:visible group-focus-visible:visible" />
          </button>
          <button v-if="!hasAccess" type="button" class="flex cursor-pointer items-center gap-[14px] rounded-[3.5px] border border-white/20 p-[7px] text-left outline-none hover:bg-page focus-visible:bg-page" @click="grantAccess">
            <span class="flex size-[42px] shrink-0 items-center justify-center">
              <SFIcon name="user-lock" class="text-[21px]" />
            </span>
            <span>
              <span class="block">{{ localize('access') }}</span>
              <span class="block text-white/50">{{ localize('access_hint') }}</span>
            </span>
          </button>
        </div>
        <div class="flex gap-2">
          <SFButton variant="primary" block @click="returnBack">
            {{ localize.global('dialog.shared.cancel') }}
          </SFButton>
          <SFButton variant="outline" block @click="importEndpoint">
            {{ localize.global('integration.game') }}
          </SFButton>
          <SFButton variant="outline" block @click="importFiles">
            {{ localize.global('integration.file') }}
          </SFButton>
        </div>
      </section>

      <section v-else class="flex w-full max-w-[400px] flex-col gap-5 rounded-lg border border-line bg-dialog p-5 text-white/90 shadow-xl" :aria-labelledby="titleId">
        <SFHeading :id="titleId" level="3" class="border-b border-line pb-1.5 text-center">{{ localize('error.title') }}</SFHeading>
        <SFParagraph class="text-center">
          <span v-html="localize('error.notice#')" />
        </SFParagraph>
        <SFButton variant="primary" block @click="returnBack">
          {{ localize.global('dialog.shared.cancel') }}
        </SFButton>
      </section>
    </div>
  </Page>
</template>

<script setup lang="ts">
import { onMounted, ref, shallowRef, useId } from 'vue'
import SFButton from '@library/SFButton.vue'
import SFHeading from '@library/SFHeading.vue'
import SFIcon from '@library/SFIcon.vue'
import SFParagraph from '@library/SFParagraph.vue'
import { useDialog, useFilePicker } from '@utils/dialogs'
import { useLoader } from '@utils/loader'
import { useLocalize } from '@utils/localization'
import { useErrorToast } from '@utils/toasts'
import { getClassImageUrl, getErrorMessage, sortDescending } from '@utils/utils'
import EndpointDialog from '~/dialogs/EndpointDialog.vue'
import Page from '~/pages/Page.vue'

defineOptions({
  name: 'RequestPage'
})

// Fields of the character data that are sent, `true` copies the whole value
type Scope = {
  [key: string]: true | Scope
}

const ITEM_SCOPE: Scope = {
  SlotType: true,
  SlotIndex: true,
  GemType: true,
  HasSocket: true,
  GemValue: true,
  HasGem: true,
  HasRune: true,
  Class: true,
  PicIndex: true,
  Index: true,
  IsEpic: true,
  Type: true,
  IsFlushed: true,
  HasValue: true,
  Enchantment: true,
  Armor: true,
  DamageMin: true,
  DamageMax: true,
  Upgrades: true,
  UpgradeMultiplier: true,
  AttributeTypes: true,
  Attributes: true,
  HasEnchantment: true,
  Color: true,
  ColorClass: true,
  SellPrice: true,
  DismantlePrice: true,
  Strength: true,
  Dexterity: true,
  Intelligence: true,
  Constitution: true,
  Luck: true,
  RuneType: true,
  RuneValue: true
}

const COMPANION_SCOPE: Scope = {
  Class: true,
  Strength: true,
  Dexterity: true,
  Intelligence: true,
  Constitution: true,
  Luck: true,
  Potions: true,
  Damage: true,
  Damage2: true,
  Armor: true,
  Items: {
    Head: ITEM_SCOPE,
    Body: ITEM_SCOPE,
    Hand: ITEM_SCOPE,
    Feet: ITEM_SCOPE,
    Neck: ITEM_SCOPE,
    Belt: ITEM_SCOPE,
    Ring: ITEM_SCOPE,
    Misc: ITEM_SCOPE,
    Wpn1: ITEM_SCOPE,
    Wpn2: ITEM_SCOPE
  }
}

// Scopes a website can ask for in the `scope` parameter
const SCOPES: Record<string, Scope> = {
  default: {
    ID: true,
    Name: true,
    Class: true,
    XP: true,
    XPNext: true,
    Level: true,
    Group: {
      Name: true,
      ID: true,
      Instructor: true,
      Treasure: true,
      Group: {
        Raid: true,
        Hydra: true,
        TotalInstructor: true,
        TotalTreasure: true,
        TotalKnights: true
      }
    },
    Mount: true,
    Book: true,
    Fortress: true,
    Underworld: true,
    Dungeons: {
      Tower: true,
      Raid: true,
      Normal: true,
      Shadow: true,
      Twister: true,
      Group: true,
      Player: true,
      Youtube: true,
      Sandstorm: true
    },
    Prefix: true,
    Runes: true,
    XPTotal: true,
    Toilet: true,
    Witch: true,
    CalendarDay: true,
    CalendarType: true
  },
  pets: {
    Pets: {
      ShadowFood: true,
      LightFood: true,
      EarthFood: true,
      FireFood: true,
      WaterFood: true,
      ShadowLevels: true,
      LightLevels: true,
      EarthLevels: true,
      FireLevels: true,
      WaterLevels: true,
      ShadowCount: true,
      LightCount: true,
      EarthCount: true,
      FireCount: true,
      WaterCount: true,
      ShadowLevel: true,
      LightLevel: true,
      EarthLevel: true,
      FireLevel: true,
      WaterLevel: true,
      Shadow: true,
      Light: true,
      Earth: true,
      Fire: true,
      Water: true,
      Dungeons: true
    }
  },
  items: {
    Strength: true,
    Dexterity: true,
    Intelligence: true,
    Constitution: true,
    Luck: true,
    Potions: true,
    Damage: true,
    Damage2: true,
    Armor: true,
    Items: {
      Head: ITEM_SCOPE,
      Body: ITEM_SCOPE,
      Hand: ITEM_SCOPE,
      Feet: ITEM_SCOPE,
      Neck: ITEM_SCOPE,
      Belt: ITEM_SCOPE,
      Ring: ITEM_SCOPE,
      Misc: ITEM_SCOPE,
      Wpn1: ITEM_SCOPE,
      Wpn2: ITEM_SCOPE
    },
    Inventory: {
      Dummy: {
        Head: ITEM_SCOPE,
        Body: ITEM_SCOPE,
        Hand: ITEM_SCOPE,
        Feet: ITEM_SCOPE,
        Neck: ITEM_SCOPE,
        Belt: ITEM_SCOPE,
        Ring: ITEM_SCOPE,
        Misc: ITEM_SCOPE,
        Wpn1: ITEM_SCOPE,
        Wpn2: ITEM_SCOPE
      }
    }
  },
  companions: {
    Companions: {
      Bert: COMPANION_SCOPE,
      Kunigunde: COMPANION_SCOPE,
      Mark: COMPANION_SCOPE
    }
  },
  idle: {
    Idle: {
      Runes: true,
      Upgrades: {
        Money: true,
        Speed: true
      }
    }
  }
}

const localize = useLocalize('request')

const loader = useLoader()

const titleId = useId()

const params = new URLSearchParams(window.location.search)

const redirect = parseUrl(params.get('redirect'))
const scope = (params.get('scope') || 'default').split(/\s|\+/).filter((field) => SCOPES[field])
const origin = params.get('origin')
const state = params.get('state')

const isInIframe = window.parent && window.parent !== window

// The data goes back with a form sent to `redirect`, or with a message to the page that shows this one in an iframe
const canRedirect = params.has('redirect') && redirect !== null
const canMessage = !params.has('redirect') && !!origin && isInIframe

const isValidRequest = (canRedirect || canMessage) && scope.length > 0

const requester = origin || redirect?.hostname

const players = shallowRef<PlayerEntry[]>([])
const hasAccess = ref(true)

onMounted(() => {
  if (isInIframe) {
    document.body.classList.add('overflow-hidden')
  }

  if (isValidRequest) {
    void render()
  }
})

function parseUrl(url: string | null) {
  if (url === null) return null

  try {
    return new URL(url)
  } catch {
    return null
  }
}

function returnBack() {
  if (window.parent === window || !window.parent) {
    window.location.href = '/index.html'
  } else {
    window.parent.postMessage({ event: 'sftools-close' }, '*')
  }
}

function importFiles() {
  useFilePicker({
    accept: '.har,.json',
    multiple: true,
    callback: (files) => void readFiles(files)
  })
}

async function readFiles(files: File[]) {
  loader.start({ progress: true })

  let filesDone = 0

  await Promise.all(
    files.map(async (file) => {
      const content = await file.text()

      try {
        await DatabaseManager.import(content, file.lastModified)
      } catch (e) {
        useErrorToast(localize.global('database.import_error'), getErrorMessage(e))
        Logger.error(e, 'Error occured while trying to import a file!')
      }

      loader.progress(++filesDone / files.length)
    })
  )

  loader.stop()

  void render()
}

function importEndpoint() {
  useDialog(
    EndpointDialog,
    { allowTemporary: true },
    {
      callback: (imported) => {
        if (imported) {
          void render()
        }
      }
    }
  )
}

async function render() {
  players.value = []
  hasAccess.value = true

  await DatabaseManager.load(SELF_PROFILE_WITH_GROUP)

  players.value = sortDescending(DatabaseManager.getLatestPlayers(true), (player) => player.Timestamp)
  hasAccess.value = await checkFullAccess()
}

async function checkFullAccess() {
  if (window.parent === window || Site.options.has_storage_access) {
    return true
  } else if (typeof document.hasStorageAccess === 'function' && typeof document.requestStorageAccess === 'function') {
    return (await document.hasStorageAccess()) || false
  } else {
    return true
  }
}

async function requestFullAccess() {
  const granted = await document.hasStorageAccess()

  if (granted) {
    Site.options.has_storage_access = true
  } else if (typeof document.requestStorageAccess === 'function') {
    await document.requestStorageAccess()

    // requestStorageAccess resolves with nothing, so the saved flag stays false like on the legacy page
    Site.options.has_storage_access = false
  }
}

async function grantAccess() {
  await requestFullAccess()

  void render()
}

// Copies only the fields in `whitelist`, the own properties of `source` that it lists
function copyWithWhitelist(source: object, target: Record<string, unknown>, whitelist: Scope) {
  for (const [key, list] of Object.entries(whitelist)) {
    if (!Object.hasOwn(source, key)) continue

    const value: unknown = (source as Record<string, unknown>)[key]

    if (list === true) {
      target[key] = value
    } else if (Array.isArray(value)) {
      target[key] = value.map((item: object) => {
        const copy: Record<string, unknown> = Object.create(null)
        copyWithWhitelist(item, copy, list)

        return copy
      })
    } else if (value && typeof value === 'object') {
      const copy: Record<string, unknown> = Object.create(null)
      copyWithWhitelist(value, copy, list)

      target[key] = copy
    }
  }
}

function addFormInput(form: HTMLFormElement, name: string, value: string) {
  const input = document.createElement('input')
  input.value = value
  input.name = name

  form.appendChild(input)
}

function sendDataViaForm(url: URL, data: Record<string, unknown>) {
  const form = document.createElement('form')
  form.method = 'POST'
  form.acceptCharset = 'UTF-8'
  form.enctype = 'multipart/form-data'
  form.action = url.href

  form.style.display = 'none'

  addFormInput(form, 'data', JSON.stringify(data))

  if (state) {
    addFormInput(form, 'state', state)
  }

  document.body.appendChild(form)

  form.submit()
}

function sendDataViaMessage(data: Record<string, unknown>) {
  const message: { event: string; data: Record<string, unknown>; state?: string } = {
    event: 'sftools-data',
    data
  }

  if (state) {
    message.state = state
  }

  window.parent.postMessage(message, '*')
}

function sendData(player: PlayerEntry) {
  const whitelist: Scope = Object.create(null)
  const data: Record<string, unknown> = Object.create(null)

  copyWithWhitelist(
    player,
    data,
    scope.reduce((memo, name) => Object.assign(memo, SCOPES[name]), whitelist)
  )

  if (canRedirect && redirect) {
    sendDataViaForm(redirect, data)
  } else if (canMessage) {
    sendDataViaMessage(data)
  }
}
</script>
