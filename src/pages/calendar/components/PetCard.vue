<template>
  <div class="group relative h-[240px] rounded-[3.5px] p-[14px] text-center text-black" :class="[ELEMENT_CLASSES[element], { 'opacity-60': props.owned }]">
    <div class="flex h-full flex-col items-center justify-between transition-opacity duration-100 ease-linear group-hover:opacity-0 group-has-[:focus-visible]:opacity-0">
      <span class="font-bold">
        <template v-if="props.owned">
          <SFIcon name="check" class="mr-1 align-[-0.125em]" />
          {{ localize('collected') }}
        </template>
        <template v-else-if="props.locked">
          <SFIcon name="lock" class="mr-1 align-[-0.125em]" />
          {{ localize('locked') }}
        </template>
        <template v-else-if="props.available">
          <SFIcon name="exclamation" class="mr-1 align-[-0.125em]" />
          {{ localize('available') }}
        </template>
        <template v-else>
          <SFIcon name="clock" class="mr-1 align-[-0.125em]" />
          {{ waitTimeText }}
        </template>
      </span>
      <img :src="`/res/pets/monster${props.index + 800}.png`" alt="" class="m-[7px] size-[100px]" />
      <SFHeading :id="nameId" level="3" type="inherit">{{ localize.global(`monsters.${props.index + 800}`) }}</SFHeading>
      <span>
        <SFIcon v-if="timeIcon" :name="timeIcon" class="mr-1 align-[-0.125em]" />
        {{ localize.global(`pets.locations.${pet.location}`) }}
      </span>
    </div>
    <SFParagraph class="absolute inset-[7px] flex items-center justify-center opacity-0 transition-opacity duration-100 ease-linear group-hover:opacity-100 group-has-[:focus-visible]:opacity-100">
      {{ localize.global(`general.pet_requirement_${props.index}`) }}
    </SFParagraph>
    <button type="button" class="absolute inset-0 cursor-pointer rounded-[3.5px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent" :aria-labelledby="nameId" :aria-pressed="props.owned" />
  </div>
</template>

<script setup lang="ts">
import { computed, useId } from 'vue'
import SFHeading from '@library/SFHeading.vue'
import SFIcon from '@library/SFIcon.vue'
import SFParagraph from '@library/SFParagraph.vue'
import { type IconName } from '@utils/icons'
import { useLocalize } from '@utils/localization'
import { formatDuration } from '@utils/utils'
import { PetData, type Pet } from '~/playa/pets'

defineOptions({
  name: 'PetCard'
})

const props = defineProps<{
  /**
   * Position of the pet in PetData, from 0 to 99
   */
  index: number
  /**
   * The player has the pet
   */
  owned: boolean
  /**
   * The player can't find the pet yet
   */
  locked: boolean
  /**
   * The pet can be found right now
   */
  available: boolean
  /**
   * Milliseconds until the pet can be found
   */
  waitTime: number
}>()

const ELEMENT_CLASSES = ['bg-[#a596ce]', 'bg-[#e9d067]', 'bg-[#adc35a]', 'bg-[#fda700]', 'bg-[#60cdef]']

const TIME_ICONS: Record<Pet['time'], IconName | undefined> = {
  any: undefined,
  day: 'sun',
  night: 'moon',
  witch: 'stopwatch'
}

const localize = useLocalize('pets.calendar')

const nameId = useId()

const pet = computed(() => PetData[props.index])

const element = computed(() => Math.trunc(props.index / 20))

const timeIcon = computed(() => TIME_ICONS[pet.value.time])

const waitTimeText = computed(() => formatDuration(props.waitTime, 2))
</script>
