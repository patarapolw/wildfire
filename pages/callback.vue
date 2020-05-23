<template lang="pug">
div
</template>

<script lang="ts">
import { Vue, Component } from 'nuxt-property-decorator'

@Component
export default class Callback extends Vue {
  created() {
    if (process.client) {
      window.close()
    }
  }
}
</script>
