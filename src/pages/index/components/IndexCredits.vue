<template>
  <!-- Spacing copies the legacy page, which used em units on a 14px base -->
  <div class="md:ml-[2.5em]">
    <a href="https://discord.gg/XWfSwe3" target="_blank" class="flex items-center justify-center gap-[0.25em] pt-[1em] text-[2em] leading-5 text-accent hover:underline">
      <SFIcon name="discord" />
      Shakes &amp; Fidget Tavern
    </a>
    <section v-for="section in SECTIONS" :key="section.role">
      <SFHeading level="3" class="mt-[1.5em] mb-3.5 leading-[1.28571429em] underline decoration-accent">{{ localize(`roles.${section.role}`) }}</SFHeading>
      <div class="flex flex-wrap gap-[1em] text-lg leading-5 font-bold text-white/75">
        <span v-for="(contributor, index) in section.contributors" :key="index" class="flex items-center gap-[0.5em]">
          <img v-if="contributor.locale" :src="`/res/flags/${contributor.locale}.svg`" alt="" class="h-[22px]" />
          <span>
            <a v-if="contributor.url" :href="contributor.url" target="_blank" class="underline">{{ contributor.name }}</a>
            <template v-else>{{ contributor.name }}</template>
            <!-- A titled name has no comma after it, same as the legacy page -->
            <span v-if="contributor.title" class="ml-[5px] text-[70%] text-white/50">{{ contributor.title }}</span>
            <template v-else-if="index < section.contributors.length - 1">,</template>
          </span>
        </span>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import SFHeading from '@library/SFHeading.vue'
import SFIcon from '@library/SFIcon.vue'
import { useLocalize } from '@utils/localization'

defineOptions({
  name: 'IndexCredits'
})

type Contributor = {
  name: string
  url?: string
  title?: string
  locale?: string
}

const SECTIONS: { role: string; contributors: Contributor[] }[] = [
  {
    role: 'admin',
    contributors: [{ name: 'mar21' }]
  },
  {
    role: 'helper',
    contributors: [
      { name: 'Acclamator' },
      { name: 'Zorago' },
      { name: 'BoeseMelone' },
      { name: 'Zeraffim', url: 'https://www.youtube.com/channel/UCMsDR7QC6GPF3Wg4hMQIXKw' },
      { name: 'aszu' },
      { name: 'psychoazubi' },
      { name: 'Strider' },
      { name: 'Kraggori' },
      { name: 'Timhot3p' },
      { name: 'Minidave' },
      { name: 'burningcherry' },
      { name: 'Papa Schlumpf' },
      { name: 'MajkG' },
      { name: 'Enza' },
      { name: 'Abus3r' },
      { name: 'ÐonMuErte' },
      { name: 'Milado' }
    ]
  },
  {
    role: 'tester',
    contributors: [{ name: 'bl4ckwoolf', title: 'the Tracker' }, { name: 'AreYouAWiiizard' }, { name: 'Wärkki' }, { name: 'suri' }]
  },
  {
    role: 'wiki',
    contributors: [{ name: 'rafa97sam' }]
  },
  {
    role: 'translator',
    contributors: [
      { name: 'Zorago', locale: 'de' },
      { name: 'DrKuulJulian', locale: 'de' },
      { name: 'Zwackelzahn', locale: 'de' },
      { name: 'KleoZyn', locale: 'de' },
      { name: 'unkenfuss', locale: 'de' },
      { name: 'Koksuone', locale: 'pl' },
      { name: 'ThreeG', locale: 'pl' },
      { name: 'Haaaku', locale: 'pl' },
      { name: 'Mathire', locale: 'it' },
      { name: 'Larry84', locale: 'it' },
      { name: 'dracareys', locale: 'pt' },
      { name: 'seedbox', locale: 'pt' },
      { name: 'Wärkki', locale: 'es' },
      { name: 'Necio', locale: 'es' },
      { name: 'DrKuulJulian', locale: 'ch' },
      { name: 'MaxiYann', locale: 'fr' },
      { name: 'KaYa 43v3r', locale: 'fr' },
      { name: 'Balogh Roland', locale: 'hu' },
      { name: 'Althi', locale: 'hu' },
      { name: 'Eggman', locale: 'pg' },
      { name: 'FarSniper', locale: 'cs' },
      { name: 'OnlyDin0', locale: 'cs' }
    ]
  },
  {
    role: 'mention',
    contributors: [
      { name: 'Leander' },
      { name: 'Chicony' },
      { name: 'Kowalski' },
      { name: 'json' },
      { name: 'DORZER', url: 'https://www.youtube.com/user/MrDORZER' },
      { name: 'N3utr4L', url: 'https://www.youtube.com/channel/UCD52HJdjjh7Nb-sbtSgt_Jw' },
      { name: 'Azuria', url: 'https://www.youtube.com/channel/UCc2QwhLNDyDrg3WA2PmFRsA' },
      { name: 'xBombayGin', url: 'https://www.twitch.tv/xbombaygin' },
      { name: 'Klausi', title: 'the duck boy' }
    ]
  }
]

const localize = useLocalize('index')
</script>
