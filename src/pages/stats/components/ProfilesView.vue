<template>
  <div class="-mx-[14px] flex flex-col gap-[1em]">
    <div v-for="[key, profile] in profiles" :key="key" class="relative grid grid-cols-16 gap-x-[28px] rounded-[0.25em] border border-[grey] py-[14px]">
      <div class="col-span-4 pl-[14px]">
        <div class="text-lg font-bold" :class="key == activeProfile ? 'text-accent' : 'text-white'">
          <button type="button" class="cursor-pointer text-left outline-none hover:underline focus-visible:underline" @click="activate(key)">{{ profile.name }}</button>
          <div v-if="profile.slot" class="text-[90%]">Slot {{ profile.slot }}</div>
          <div class="text-[90%]">({{ key }})</div>
        </div>
        <div v-if="ProfileManager.isEditable(key)" class="mt-4 flex gap-4">
          <button type="button" class="cursor-pointer outline-none hover:text-red-500 focus-visible:text-red-500" :aria-label="localize.global('stats.context.remove')" @click="remove(key)">
            <SFIcon name="trash-can" />
          </button>
          <button type="button" class="cursor-pointer outline-none hover:text-white focus-visible:text-white" :aria-label="localize.global('dialog.profile_create.title')" @click="edit(key)">
            <SFIcon name="wrench" />
          </button>
        </div>
      </div>
      <div class="col-span-12 pr-[14px]">
        <table class="expression-text w-full table-fixed border-collapse rounded-[0.28571429rem] bg-surface">
          <tbody>
            <tr class="border-b border-line">
              <td class="w-1/5 p-[0.78571429em]" />
              <td class="w-2/5 p-[0.78571429em]">{{ localize('players') }}</td>
              <td class="w-2/5 p-[0.78571429em]">{{ localize('groups') }}</td>
            </tr>
            <tr class="border-b border-line">
              <td class="p-[0.78571429em]">{{ localize('primary') }}</td>
              <td class="p-[0.78571429em]" v-html="describeRule(profile.primary)" />
              <td class="p-[0.78571429em]" v-html="describeRule(profile.primary_g)" />
            </tr>
            <tr>
              <td class="p-[0.78571429em]">{{ localize('secondary') }}</td>
              <td class="p-[0.78571429em]" v-html="describeExpression(profile.secondary, getPlayerProfileConfig())" />
              <td class="p-[0.78571429em]" v-html="describeExpression(profile.secondary_g, getGroupProfileConfig())" />
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    <SFButton variant="outline" block class="min-h-[4em]" @click="create">
      {{ localize('create') }}
    </SFButton>
  </div>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import SFButton from '@library/SFButton.vue'
import SFIcon from '@library/SFIcon.vue'
import { useDialog } from '@utils/dialogs'
import { useLocalize } from '@utils/localization'
import { escapeHtml } from '@utils/utils'
import { type DatabaseProfile, ProfileManager, type ProfileRule } from '~/core/profiles'
import ProfileCreateDialog from '~/pages/stats/dialogs/ProfileCreateDialog.vue'
import { getGroupProfileConfig, getPlayerProfileConfig } from '~/pages/stats/stats'
import { DEFAULT_EXPRESSION_CONFIG, type ExpressionConfig } from '~/script/expression-config'
import { Highlighter } from '~/script/highlighter'

defineOptions({
  name: 'ProfilesView'
})

defineExpose({
  show
})

const MODE_SYMBOLS: Record<string, string> = {
  above: '>',
  below: '<',
  equals: '='
}

const localize = useLocalize('stats.profiles')

const profiles = shallowRef<[string, DatabaseProfile][]>([])
const activeProfile = shallowRef('')

function show() {
  profiles.value = ProfileManager.getProfiles()
  activeProfile.value = ProfileManager.getActiveProfileName()
}

function highlight(value: string, config: ExpressionConfig) {
  return Highlighter.expression(value, undefined, config).text
}

function describeRule(rule: ProfileRule | null | undefined) {
  if (rule) {
    const { name, mode, value } = rule
    const title = `<b>${escapeHtml(name)}</b>`

    if (mode == 'between') {
      return `${title} ${localize('between')} ${highlight(value[0], DEFAULT_EXPRESSION_CONFIG)} ${localize('and')} ${highlight(value[1], DEFAULT_EXPRESSION_CONFIG)}`
    } else {
      return `${title} ${MODE_SYMBOLS[mode] || '??'} ${value ? value.map((item) => highlight(item, DEFAULT_EXPRESSION_CONFIG)).join('<br/>') : ''}`
    }
  } else {
    return `<b>${localize('none')}</b>`
  }
}

function describeExpression(value: string | null | undefined, config: ExpressionConfig) {
  return value ? highlight(value, config) : `<b>${localize('none')}</b>`
}

function activate(key: string) {
  ProfileManager.setActiveProfile(key)

  window.location.reload()
}

function remove(key: string) {
  ProfileManager.removeProfile(key)

  show()
}

function edit(key: string) {
  useDialog(
    ProfileCreateDialog,
    { profileKey: key },
    {
      callback: (saved) => {
        if (saved) show()
      }
    }
  )
}

function create() {
  useDialog(
    ProfileCreateDialog,
    {},
    {
      callback: (saved) => {
        if (saved) show()
      }
    }
  )
}
</script>
