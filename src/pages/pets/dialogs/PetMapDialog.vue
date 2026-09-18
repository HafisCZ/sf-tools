<template>
  <SFDialog :title="localize('results')" size="xl">
    <div class="flex flex-col gap-[14px]">
      <div class="flex items-end gap-2">
        <div class="min-w-0 flex-1">
          <SFSelect v-model="selected" :options="mapOptions" />
        </div>
        <SFTooltip :content="localize.global('stats.copy.image')">
          <SFButton variant="outline" icon class="min-h-9.5 min-w-9.5" :aria-label="localize.global('stats.copy.image')" @click="save">
            <SFIcon name="download" />
          </SFButton>
        </SFTooltip>
      </div>
      <div class="overflow-y-scroll" :class="{ 'h-[50vh]': !saving }">
        <div ref="image-ref" class="text-[#212529]" :class="{ 'p-2': saving }">
          <table class="w-full table-fixed border-collapse text-center text-[90%] font-light">
            <thead>
              <tr>
                <th class="h-[1.9em] font-bold" :class="saving ? 'text-black' : 'text-white'">{{ localize.global('editor.level') }}</th>
                <th v-for="gladiator in table.gladiators" :key="gladiator" class="h-[1.9em] font-bold" :class="saving ? 'text-black' : 'text-white'">{{ localize('map.gladiator') }} {{ gladiator }}</th>
                <th v-for="index in table.padding" :key="`padding-${index}`" />
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in table.rows" :key="row.level">
                <td class="h-[1.9em]" :class="saving ? 'text-black' : 'text-white'">{{ row.level }}</td>
                <td v-for="(chance, index) in row.chances" :key="index" class="h-[1.9em]" :style="{ backgroundColor: getColor(chance) }">{{ chance.toFixed(2) }}%</td>
                <td v-for="index in table.padding" :key="`padding-${index}`" />
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <template #buttons>
      <SFButton block @click="emit('close')">
        {{ localize.global('dialog.shared.close') }}
      </SFButton>
    </template>
  </SFDialog>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, useTemplateRef } from 'vue'
import SFButton from '@library/SFButton.vue'
import SFDialog from '@library/SFDialog.vue'
import SFIcon from '@library/SFIcon.vue'
import SFSelect from '@library/SFSelect.vue'
import SFTooltip from '@library/SFTooltip.vue'
import { useLocalize } from '@utils/localization'

defineOptions({
  name: 'PetMapDialog'
})

const props = defineProps<{
  /**
   * Maps to pick from, with win chances from 0 to 100 by level minus one and gladiator level
   */
  maps: {
    name: string
    data: (number[] | undefined)[]
  }[]
}>()

const emit = defineEmits<{
  close: []
}>()

const GLADIATOR_COLUMNS = 16

const localize = useLocalize('pets')

const selected = ref(0)
const saving = ref(false)

const imageElement = useTemplateRef('image-ref')

const mapOptions = computed(() => props.maps.map((map, index) => ({ value: index, label: map.name })))

// The worker leaves holes in the arrays, flatMap skips them
const table = computed(() => {
  const data = props.maps.at(selected.value)?.data ?? []
  const gladiators = data.find((entry) => entry && entry.length > 0)?.flatMap((_, gladiator) => [gladiator]) ?? []

  return {
    gladiators,
    padding: GLADIATOR_COLUMNS - gladiators.length,
    rows: data.flatMap((entry, level) => (entry ? [{ level: level + 1, chances: entry.flatMap((chance) => [chance]) }] : []))
  }
})

function getColor(chance: number) {
  if (chance < 0.01) {
    return '#ffad99'
  } else if (chance >= 25) {
    return '#99ffb4'
  } else if (chance >= 10) {
    return '#daff99'
  } else if (chance >= 5) {
    return '#fdff99'
  } else {
    return '#ffdd99'
  }
}

// Everything in the image needs plain colours, html2canvas can't read oklab()
async function save() {
  const map = props.maps.at(selected.value)

  if (!imageElement.value || !map) return

  saving.value = true

  await nextTick()

  try {
    const canvas = await html2canvas(imageElement.value, { logging: false })

    canvas.toBlob((blob) => {
      if (blob) {
        Exporter.download(`${map.name}.png`, blob)
      }
    })
  } finally {
    saving.value = false
  }
}
</script>
