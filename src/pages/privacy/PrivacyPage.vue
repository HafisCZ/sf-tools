<template>
  <Page>
    <div class="flex flex-col gap-6">
      <div class="flex flex-wrap items-baseline justify-between gap-x-4">
        <SFHeading level="3">Privacy</SFHeading>
        <SFParagraph type="muted">Last updated 11 November 2026</SFParagraph>
      </div>

      <SFParagraph>SFTools has no accounts, no cookies and no ads. Your characters, settings and scripts are saved in your browser. The table below lists what gets sent elsewhere.</SFParagraph>

      <SFTable>
        <template #header>
          <SFTableRow>
            <SFTableHeader>Data</SFTableHeader>
            <SFTableHeader>When</SFTableHeader>
            <SFTableHeader>Where</SFTableHeader>
            <SFTableHeader>Kept</SFTableHeader>
          </SFTableRow>
        </template>
        <SFTableRow v-for="row in ROWS" :key="row.data">
          <SFTableCell>
            <div class="font-bold">{{ row.data }}</div>
            <div class="text-white/60">{{ row.contents }}</div>
          </SFTableCell>
          <SFTableCell>{{ row.when }}</SFTableCell>
          <SFTableCell>{{ row.where }}</SFTableCell>
          <SFTableCell>{{ row.kept }}</SFTableCell>
        </SFTableRow>
      </SFTable>

      <SFParagraph>Netlify and Sentry are US companies covered by the EU-US Data Privacy Framework. SFTools processes this data based on legitimate interest (GDPR Art. 6(1)(f)), to run the features you use and to fix errors.</SFParagraph>

      <section>
        <SFHeading level="6" class="mb-2">Log in to the game</SFHeading>
        <SFParagraph>
          When you use the "Log in to the game" feature, your username and password go straight from your browser to Playa Games. SFTools never sees them. Playa Games is responsible for that data, see their
          <a href="https://cdn.playa-games.com/res/sfgame3/legal/html/privacy_en.html" target="_blank" class="text-accent hover:underline">Privacy Policy</a>.
        </SFParagraph>
      </section>

      <section class="flex flex-col gap-2">
        <SFHeading level="6">Contact and your rights</SFHeading>
        <SFParagraph>
          SFTools is run by mar21. Email
          <a href="mailto:support@mar21.eu" class="text-accent hover:underline">support@mar21.eu</a>
          if you want a copy of your data, want it corrected or deleted, want it kept but no longer used, or want it in a machine-readable format.
        </SFParagraph>
        <SFParagraph>You can object to any of this at any time. Error reports and sessions stop if you block Sentry (most ad blockers do), share codes expire on their own, and published scripts are deleted on request. Request logs are needed to serve the site at all, so they continue while you use it.</SFParagraph>
        <SFParagraph>You also have the right to lodge a complaint with a data protection authority.</SFParagraph>
      </section>
    </div>
  </Page>
</template>

<script setup lang="ts">
import SFHeading from '@library/SFHeading.vue'
import SFParagraph from '@library/SFParagraph.vue'
import SFTable from '@library/SFTable.vue'
import SFTableCell from '@library/SFTableCell.vue'
import SFTableHeader from '@library/SFTableHeader.vue'
import SFTableRow from '@library/SFTableRow.vue'
import Page from '~/pages/Page.vue'

defineOptions({
  name: 'PrivacyPage'
})

const ROWS = [
  { data: 'Error report', contents: 'Page address, browser and recent actions, no IP address', when: 'When a page runs into an error', where: 'Sentry (US)', kept: 'Up to 90 days' },
  { data: 'Session', contents: 'Random session id, site version, browser and whether an error happened', when: 'Every page load', where: 'Sentry (US)', kept: 'Up to 90 days' },
  { data: 'Share code', contents: 'Players and guilds you export', when: 'When you create a code', where: 'Netlify (US), stored in MongoDB (Frankfurt, EU)', kept: '2 days at most' },
  { data: 'Published script', contents: 'Script, name, description and author name', when: 'When you publish a script', where: 'Netlify (US), stored in MongoDB (Frankfurt, EU)', kept: 'Until you delete it' },
  { data: 'Request logs', contents: 'IP address and browser', when: 'Every visit', where: 'GitHub Pages, Netlify (beta and API)', kept: 'Set by GitHub and Netlify' }
]
</script>
