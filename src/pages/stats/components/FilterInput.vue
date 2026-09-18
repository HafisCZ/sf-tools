<template>
  <div class="relative" @mouseleave="hidePopups">
    <input
      v-model="modelValue"
      type="text"
      spellcheck="false"
      autocomplete="off"
      class="w-full rounded-md border border-line bg-surface py-2 pr-24 pl-3 font-[Arial] leading-5 text-white/90 outline-none placeholder:text-white/40 focus:border-accent"
      :placeholder="props.placeholder"
      :aria-label="props.placeholder"
      @keydown="handleKeydown"
      @change="commit"
    />
    <div aria-hidden="true" class="absolute inset-y-0 right-3 flex items-center gap-3 text-white/60">
      <button type="button" tabindex="-1" class="cursor-pointer hover:text-white" @click="select('')">
        <SFIcon name="xmark" />
      </button>
      <span class="cursor-pointer hover:text-white" @mouseenter="showHistory">
        <SFIcon name="angles-down" />
      </span>
      <span class="cursor-pointer hover:text-white" @mouseenter="showInfo">
        <SFIcon name="circle-info" />
      </span>
    </div>
    <ul v-if="historyVisible" class="absolute top-full z-20 w-full rounded-md border border-line bg-surface py-1 text-left shadow-xl">
      <li v-for="(entry, index) in history" :key="`history-${entry}`" class="group flex items-center hover:bg-surface-hover">
        <button type="button" class="flex-1 cursor-pointer py-[0.78571429em] pl-[1em] text-left leading-[1em] outline-none focus-visible:bg-surface-hover" @click="select(entry)">{{ entry }}</button>
        <button type="button" class="mr-[0.9em] cursor-pointer opacity-50 outline-none hover:opacity-100 focus-visible:opacity-100" :aria-label="entry" @click="star(index)">
          <SFIcon name="star" />
        </button>
      </li>
      <li v-for="(entry, index) in starred" :key="`starred-${entry}`" class="flex items-center hover:bg-surface-hover">
        <button type="button" class="flex-1 cursor-pointer py-[0.78571429em] pl-[1em] text-left leading-[1em] outline-none focus-visible:bg-surface-hover" @click="select(entry)">{{ entry }}</button>
        <button type="button" class="mr-[0.9em] cursor-pointer opacity-50 outline-none hover:opacity-100 focus-visible:opacity-100" :aria-label="entry" @click="unstar(index)">
          <SFIcon name="star-solid" />
        </button>
      </li>
    </ul>
    <div v-if="infoVisible" class="absolute top-full z-20 w-full rounded-md border border-line bg-surface py-1 text-left shadow-xl">
      <div v-for="(description, key) in props.filters" :key="key" class="py-[0.78571429em] pl-[1em] leading-[0.5em]">
        <code class="whitespace-pre">{{ key.length == 2 ? '' : ' ' }}{{ key }}: </code>{{ description }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import SFIcon from '@library/SFIcon.vue'
import { saveStarredFilters, useStarredFilters } from '~/pages/stats/stats'

defineOptions({
  name: 'FilterInput'
})

const props = defineProps<{
  /**
   * Text shown while the field is empty, also its accessible name
   */
  placeholder: string
  /**
   * Filter keys mapped to their descriptions, listed in the info popup
   */
  filters: Record<string, string>
}>()

const emit = defineEmits<{
  /**
   * The value was committed with Enter, by leaving the field, by picking a saved filter or by clearing it
   */
  change: [value: string]
}>()

const modelValue = defineModel<string>({ required: true })

const history = ref<string[]>([])
const historyVisible = ref(false)
const infoVisible = ref(false)

const starred = useStarredFilters()

function commit() {
  emit('change', modelValue.value)
}

function select(value: string) {
  modelValue.value = value
  historyVisible.value = false

  commit()
}

function addHistory(value: string) {
  if (value && history.value[0] != value && !starred.value.includes(value)) {
    history.value = [value, ...history.value.filter((entry) => entry != value)].slice(0, 5)
  }
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter') {
    addHistory(modelValue.value)
  }

  historyVisible.value = false
}

function showHistory() {
  infoVisible.value = false
  historyVisible.value = history.value.length > 0 || starred.value.length > 0
}

function showInfo() {
  historyVisible.value = false
  infoVisible.value = true
}

function hidePopups() {
  historyVisible.value = false
  infoVisible.value = false
}

function star(index: number) {
  const [entry] = history.value.splice(index, 1)

  saveStarredFilters([...starred.value, entry])
}

function unstar(index: number) {
  saveStarredFilters(starred.value.filter((_, entryIndex) => entryIndex !== index))

  if (starred.value.length === 0 && history.value.length === 0) {
    historyVisible.value = false
  }
}
</script>
