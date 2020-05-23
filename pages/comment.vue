<template lang="pug">
.container(style="margin-bottom: 50px;")
  MainEditor(@post="onPost" @render="onRender")
  Entry(v-for="it in entries" :key="it.id" :entry="it" reply-from="_root"
    @render="onRender" @delete="onDelete(it.id)")
</template>

<script lang="ts">
import { Vue, Component } from 'nuxt-property-decorator'
import MainEditor from '@/components/MainEditor.vue'
import Entry from '@/components/Entry.vue'
import { FirestoreOp, IEntry } from '@/assets/schema'

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
  count = 0
  entries: (IEntry & { id: string })[] = []
  hasMore = false

  get root() {
    return process.client ? (frameElement as HTMLIFrameElement) : null
  }

  get fs() {
    return new FirestoreOp(this)
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

  async fetchEntries() {
    const r = await this.fs.read('_root', this.entries)
    this.$set(this, 'entries', r.data)
    this.count = r.parent.replyCount

    if (this.entries.length < this.count) {
      this.hasMore = true
    } else {
      this.hasMore = false
    }
    this.setHeight()
  }

  async onPost() {
    this.entries = []
    await this.fetchEntries()
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

  async onDelete(id: string) {
    await this.fs.delete(id, '_root')
    await this.fetchEntries()
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
