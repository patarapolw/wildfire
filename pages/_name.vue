<template lang="pug">
.card(style="margin: 1rem")
  .card-content.content(v-html="html")
</template>

<script lang="ts">
import { Vue, Component } from 'nuxt-property-decorator'
import { MakeHtml } from '@/assets/make-html'

@Component({
  layout: 'web'
})
export default class PageReadme extends Vue {
  html = ''
  makeHtml = new MakeHtml()

  asyncData({ error, params }: any) {
    try {
      return {
        raw: require(`@/docs/${params.name}.md`),
        html: ''
      }
    } catch (e) {
      return error({ statusCode: 404, message: e.message })
    }
  }

  created() {
    this.parse()
  }

  async parse() {
    if (process.client) {
      this.html = await this.makeHtml.parse((this as any).raw)
      this.$nextTick(() => {
        this.$el.querySelectorAll('pre code').forEach((block) => {
          window.hljs.highlightBlock(block)
        })
      })
    }
  }
}
</script>
