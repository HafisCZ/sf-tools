<template>
  <Page>
    <div class="flex flex-col gap-6">
      <div class="flex flex-wrap items-baseline justify-between gap-x-4">
        <SFHeading level="3">Terms and Conditions</SFHeading>
        <SFParagraph type="muted">Last updated 11 November 2026</SFParagraph>
      </div>

      <SFParagraph>SF Tools is a free fan site for Shakes & Fidget, run by mar21. It is not affiliated with Playa Games. By using SF Tools you accept these terms.</SFParagraph>

      <section>
        <SFHeading level="6" class="mb-2">Using SF Tools</SFHeading>
        <SFList>
          <li>SF Tools is provided as is, without any warranty. You use it at your own risk.</li>
          <li>Simulator and calculator results are estimates and can differ from the game.</li>
          <li>Your data is saved only in your browser. Keep backups, SF Tools is not responsible for lost data.</li>
          <li>
            Follow the Shakes & Fidget
            <a href="https://cdn.playa-games.com/res/sfgame3/legal/html/terms_en.html" target="_blank" class="text-accent hover:underline">Terms and Conditions</a>.
          </li>
          <li>Keep data collection from the game to reasonable amounts.</li>
          <li>Do not automate any part of SF Tools.</li>
          <li>Do not share HAR files. They can contain private data such as your IP address and cookies.</li>
          <li>Links to other sites, such as the community tools, are not under SF Tools' control.</li>
        </SFList>
      </section>

      <section>
        <SFHeading level="6" class="mb-2">Log in to the game</SFHeading>
        <SFList>
          <li>The "Log in to the game" feature signs you into the game from your browser and collects game data, so you do not need to create a HAR file.</li>
          <li>Your username and password go straight to the game servers. No other party is involved.</li>
          <li>It only collects the characters of the mode you pick (your own, your guild, your friends or the top 50 of the Hall of Fame).</li>
          <li>It only uses the same requests as the game itself.</li>
          <li>Remember me saves a login token in your browser. Use another account deletes it.</li>
        </SFList>
      </section>

      <section>
        <SFHeading level="6" class="mb-2">Sharing and scripts</SFHeading>
        <SFList>
          <li>Share codes and published scripts are protected only by their key. Anyone with the key can open them.</li>
          <li>Share codes expire after 2 days, and shared content can be deleted at any time.</li>
          <li>
            What is stored and where is described in
            <a href="privacy.html" class="text-accent hover:underline">Privacy</a>.
          </li>
        </SFList>
      </section>

      <section>
        <SFHeading level="6" class="mb-2">Code and game content</SFHeading>
        <SFList>
          <li>You can look at the code and run or change it on your own device.</li>
          <li>You may not host a copy of SF Tools or any of its parts, or make money from anything built on SF Tools or its parts, without explicit approval.</li>
          <li>All Shakes & Fidget names, pictures and other game assets are property of Playa Games GmbH. Playa Games reserves the right to request their removal at any time.</li>
        </SFList>
      </section>

      <section>
        <SFHeading level="6" class="mb-2">Changes</SFHeading>
        <SFList>
          <li>SF Tools can change or stop any feature at any time.</li>
          <li>These terms can change. When they change in a meaningful way, SF Tools asks you to accept them again.</li>
        </SFList>
      </section>

      <SFParagraph>
        Questions about these terms go to
        <a href="mailto:support@mar21.eu" class="text-accent hover:underline">support@mar21.eu</a>.
      </SFParagraph>
    </div>
  </Page>
</template>

<script setup lang="ts">
import SFHeading from '@library/SFHeading.vue'
import SFList from '@library/SFList.vue'
import SFParagraph from '@library/SFParagraph.vue'
import Page from '~/pages/Page.vue'

defineOptions({
  name: 'TermsPage'
})
</script>
