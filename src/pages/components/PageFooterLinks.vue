<template>
  <FooterLink icon="basket-shopping" href="https://home.sfgame.net">
    <span v-html="localize('webshop#')" />
  </FooterLink>
  <FooterCopyright />
</template>

<script setup lang="ts">
import { useLocalize } from '@utils/localization'
import FooterCopyright from '~/pages/components/FooterCopyright.vue'
import FooterLink from '~/pages/components/FooterLink.vue'

defineOptions({
  name: 'PageFooterLinks'
})

const localize = useLocalize('index.footer')
</script>
