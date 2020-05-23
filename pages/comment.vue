<template lang="pug">
.container(style="margin-bottom: 50px;")
  MainEditor(@post="onPost" @render="onRender")
  Entry(v-for="it in entries" :key="it.id" :entry="it"
    @render="onRender" @delete="onDelete(it.id)")
</template>

<script lang="ts">
import { Vue, Component } from 'nuxt-property-decorator'
import MainEditor from '@/components/MainEditor.vue'
import Entry from '@/components/Entry.vue'

@Component({
  components: {
    MainEditor,
    Entry
  },
  head() {
    return {
      link: [
        {
          rel: 'stylesheet',
          href:
            '//cdnjs.cloudflare.com/ajax/libs/highlight.js/9.18.1/styles/default.min.css'
        }
      ],
      script: [
        {
          src:
            '//cdnjs.cloudflare.com/ajax/libs/highlight.js/9.18.1/highlight.min.js',
          async: true
        }
      ]
    }
  }
})
export default class Comment extends Vue {
  stat: any = {}
  entries: any[] = []
  hasMore = false

  get root() {
    return process.client ? (frameElement as HTMLIFrameElement) : null
  }

  created() {
    if (this.root) {
      this.root.style.maxWidth = '90vw'
    }
    this.fetchEntries()
  }

  mounted() {
    if (this.root) {
      window.addEventListener('scroll', () => {
        this.setHeight()
      })
      this.setHeight()
    }
  }

  async fetchEntries({ reset }: any = {}) {
    if (process.client) {
      let result = null
      let c = this.$fireStore.collection('wildfire').where('replyTo', '==', '')

      if (!reset) {
        c = c.startAfter(this.entries[this.entries.length - 1].id)
      }
      const r = await c.get()
      result = r.docs.map((d) => d.data())

      this.entries = reset ? result : [...this.entries, ...result]
      this.$set(this, 'entries', this.entries)

      this.stat = await this.$fireStore
        .collection('wildfire')
        .doc('_stat')
        .get()

      if (this.entries.length < this.stat.count) {
        this.hasMore = true
      } else {
        this.hasMore = false
      }
      this.setHeight()
    }
  }

  async onPost() {
    await this.fetchEntries({ reset: true })
  }

  onRender() {
    this.setHeight()
  }

  setHeight() {
    this.$nextTick(() => {
      if (this.root) {
        this.root.style.height = `${this.$el.scrollHeight + 100}px`
      }
    })
  }

  onDelete(id: string) {
    this.$set(
      this,
      'entries',
      this.entries.filter((el) => el.id !== id)
    )
    this.setHeight()
  }
}
</script>

<style lang="scss">
.image.avatar {
  height: auto;
  width: 96px;
  @media screen and (max-width: 600px) {
    width: 15vw;
  }
}
</style>
