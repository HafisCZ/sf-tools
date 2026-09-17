<template>
  <SFDialog title="SFTools Shop" size="sm">
    <div class="flex flex-col gap-5">
      <SFParagraph class="text-center">Oops, it looks like you ran out of your free simulations. To continue please purchase a simulation pack below:</SFParagraph>
      <div class="flex flex-col gap-2">
        <button v-for="pack in PACKS" :key="pack.title" type="button" class="flex cursor-pointer items-center gap-4 rounded-[3.5px] border border-white/20 p-[14px] text-left outline-none hover:bg-page focus-visible:bg-page" @click="emit('close')">
          <span class="flex w-[33px] shrink-0 justify-center text-[28px]" :class="pack.color">
            <SFIcon :name="pack.icon" />
          </span>
          <span>
            <span class="block">{{ pack.title }}</span>
            <span class="block text-white/50">{{ pack.items.join(', ') }}</span>
          </span>
          <span class="ml-auto">{{ pack.value }} €</span>
        </button>
      </div>
    </div>
  </SFDialog>
</template>

<script setup lang="ts">
import SFDialog from '@library/SFDialog.vue'
import SFIcon from '@library/SFIcon.vue'
import SFParagraph from '@library/SFParagraph.vue'
import { type IconName } from '@utils/icons'

defineOptions({
  name: 'SimulatorShopDialog'
})

const emit = defineEmits<{
  close: []
}>()

const PACKS: { icon: IconName; color: string; title: string; items: string[]; value: number }[] = [
  { icon: 'wallet', color: 'text-white', title: 'Saver Pack', items: ['1 simulation', '1 character scan'], value: 1 },
  { icon: 'fish', color: 'text-[#2185d0]', title: 'Starter Pack', items: ['10 simulations', '2 character scans'], value: 5 },
  { icon: 'frog', color: 'text-[#21ba45]', title: 'F2P Pack', items: ['100 simulations', '10 character scans'], value: 10 },
  { icon: 'horse', color: 'text-[#a5673f]', title: 'Casual Pack', items: ['1000 simulations', '25 character scans'], value: 25 },
  { icon: 'dragon', color: 'text-[#db2828]', title: 'Dragon Pack for big spenders', items: ['10000 simulations', '100 character scans'], value: 99 },
  { icon: 'hat-wizard', color: 'text-[#fbbd08]', title: "Shakes's Dream Pack", items: ['Unlimited simulations', '1000 character scans'], value: 149 }
]
</script>
