<template>
  <Page>
    <div class="flex flex-col divide-y divide-line">
      <section v-for="[version, release] in RELEASES" :key="version" class="grid gap-3 py-6 md:grid-cols-[9rem_1fr] md:gap-8">
        <SFHeading :id="version" level="4" type="accent" class="scroll-mt-20 font-mono">
          <a :href="`#${version}`" class="hover:underline">{{ version }}</a>
        </SFHeading>
        <ul v-if="Array.isArray(release)" class="list-disc space-y-2 pl-5 [&_a]:text-accent [&_a]:underline">
          <li v-for="(entry, index) in release" :key="index" v-html="entry" />
        </ul>
        <div v-else class="flex flex-col gap-4">
          <div v-for="(entries, category) in release" :key="category">
            <SFHeading level="6" class="mb-2">{{ category }}</SFHeading>
            <ul class="list-disc space-y-2 pl-5 [&_a]:text-accent [&_a]:underline">
              <li v-for="(entry, index) in entries" :key="index" v-html="entry" />
            </ul>
          </div>
        </div>
      </section>
    </div>
  </Page>
</template>

<script setup lang="ts">
import { onMounted } from "vue"
import SFHeading from "@library/SFHeading.vue"
import Page from "~/pages/Page.vue"

defineOptions({
  name: "ChangelogPage"
})

const RELEASES = Object.entries(CHANGELOG)

// Content renders after translations load, so the browser's own jump to #version has already happened
onMounted(() => {
  if (window.location.hash) {
    document.getElementById(decodeURIComponent(window.location.hash.slice(1)))?.scrollIntoView()
  }
})
</script>
