<template>
  <Page>
    <template #nav-left>
      <SFButton variant="ghost" @click="clear">
        <SFIcon name="recycle" />
        {{ localize.global('analyzer.topbar.clear') }}
      </SFButton>
    </template>

    <StatisticsIntegration type="players" :profile="PROFILE" :scope="listPlayersWithPets" @select="selectPlayer" />

    <div class="grid grid-cols-2 gap-7 md:grid-cols-3 min-[62rem]:grid-cols-5">
      <PetCard v-for="entry in pets" :key="entry.index" :index="entry.index" :owned="entry.owned" :locked="entry.locked" :available="entry.available" :wait-time="entry.waitTime" @click="togglePet(entry.index)" />
    </div>

    <PageFooter>
      <SFParagraph>
        <span v-html="localize('footer#')" />
      </SFParagraph>

      <template #links>
        <FooterLink icon="message" @click="openFeedback">
          {{ localize.global('index.footer.report') }}
        </FooterLink>
        <FooterLink icon="basket-shopping" href="https://home.sfgame.net">
          <span v-html="localize.global('index.footer.webshop#')" />
        </FooterLink>
        <FooterCopyright />
      </template>
    </PageFooter>
  </Page>
</template>

<script setup lang="ts">
import { computed, ref, shallowRef } from 'vue'
import SFButton from '@library/SFButton.vue'
import SFIcon from '@library/SFIcon.vue'
import SFParagraph from '@library/SFParagraph.vue'
import { useDialog } from '@utils/dialogs'
import { useLocalize } from '@utils/localization'
import PetCard from './components/PetCard.vue'
import StatisticsIntegration from '~/core/StatisticsIntegration.vue'
import { DatabaseManager } from '~/data/database-manager'
import { type PlayerModel } from '~/data/player-model'
import FeedbackDialog from '~/dialogs/FeedbackDialog.vue'
import FooterCopyright from '~/pages/components/FooterCopyright.vue'
import FooterLink from '~/pages/components/FooterLink.vue'
import PageFooter from '~/pages/components/PageFooter.vue'
import Page from '~/pages/Page.vue'
import { PetData, type Pet } from '~/playa/pets'
import { SELF_PROFILE_WITH_GROUP } from '~/site/profiles'

defineOptions({
  name: 'CalendarPage'
})

const PROFILE = SELF_PROFILE_WITH_GROUP

// Sort offsets that put collected pets last, then locked ones
const COLLECTED_ORDER = 3156000000000
const LOCKED_ORDER = 315600000000

const NOW = Date.now()

const localize = useLocalize('pets.calendar')

const player = shallowRef<PlayerModel | null>(null)
const ownedPets = ref(PetData.map(() => false))

const pets = computed(() => {
  const entries = PetData.map((pet, index) => {
    const [start, end] = pet.next as [Date, Date]

    const owned = ownedPets.value[index]
    const locked = isLocked(pet, index)
    const waitTime = Math.trunc(Math.max(0, start.getTime() - NOW) / 1000) * 1000

    return {
      index,
      owned,
      locked,
      available: start.getTime() <= NOW && NOW <= end.getTime(),
      waitTime,
      order: owned ? COLLECTED_ORDER + index : locked ? LOCKED_ORDER + index : waitTime
    }
  })

  return entries.sort((a, b) => a.order - b.order)
})

// The first 3 pets of an element are always open
function isLocked(pet: Pet, index: number) {
  if (!player.value) return false

  const element = Math.trunc(index / 20)
  const unlocked = Math.max(player.value.Pets?.Dungeons?.[element] || 0, 3)

  return unlocked <= index % 20 || (typeof pet.condition === 'function' && !pet.condition(player.value))
}

function listPlayersWithPets() {
  return DatabaseManager.getLatestPlayers(true).filter((entry) => entry.Pets?.Levels)
}

function selectPlayer(entry: PlayerModel) {
  player.value = entry
  ownedPets.value = PetData.map((_, index) => (entry.Pets?.Levels?.[index] ?? 0) > 0)
}

function togglePet(index: number) {
  ownedPets.value[index] = !ownedPets.value[index]
}

function clear() {
  player.value = null
  ownedPets.value = PetData.map(() => false)
}

function openFeedback() {
  useDialog(FeedbackDialog, { tool: 'calendar' })
}
</script>
