<template>
  <Page>
    <div class="flex flex-col divide-y divide-line">
      <section v-for="[version, release] in RELEASES" :key="version" class="grid gap-3 py-6 md:grid-cols-[9rem_1fr] md:gap-8">
        <SFHeading :id="version" level="4" type="accent" class="scroll-mt-20 font-mono">
          <a :href="`#${version}`" class="hover:underline">{{ version }}</a>
        </SFHeading>
        <SFList v-if="Array.isArray(release)" class="rich-text">
          <li v-for="(entry, index) in release" :key="index" v-html="entry" />
        </SFList>
        <div v-else class="flex flex-col gap-4">
          <div v-for="(entries, category) in release" :key="category">
            <SFHeading level="6" class="mb-2">{{ category }}</SFHeading>
            <SFList class="rich-text">
              <li v-for="(entry, index) in entries" :key="index" v-html="entry" />
            </SFList>
          </div>
        </div>
      </section>
    </div>
  </Page>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import SFHeading from '@library/SFHeading.vue'
import SFList from '@library/SFList.vue'
import Page from '~/pages/Page.vue'

defineOptions({
  name: 'ChangelogPage'
})

const RELEASES = Object.entries(CHANGELOG)

// The browser's own jump to #version happens before the content renders
onMounted(() => {
  if (window.location.hash) {
    document.getElementById(decodeURIComponent(window.location.hash.slice(1)))?.scrollIntoView()
  }
})
</script>
