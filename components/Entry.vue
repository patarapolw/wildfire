<template lang="pug">
section
  article.media(style="margin-top: 1rem;")
    figure.media-left(style="text-align: center;")
      p.image.avatar
        img.is-rounded(:src="getGravatarUrl(user.email)")
    .media-content(style="display: flex; flex-direction: column;")
      div(style="min-height: 50px; flex-grow: 1")
        .content(v-if="!modelIsEdit" v-html="html")
        client-only(v-else)
          MarkdownEditor.reply-editor(v-model="value" @ready="$emit('render')")
      small
        span(v-if="entry && entry.id")
          a(role="button" @click="toggleLike" v-if="isYours(entry)")
            | {{entry.like['thumb-up'].includes(user.email) ? 'Unlike' : 'Like'}}
          span(v-if="entry.like['thumb-up'].length > 0")
            b-icon(icon="thumb-up-outline" size="is-small" style="margin-left: 0.5rem;")
            span {{entry.like['thumb-up'].length}}
          span(v-if="user || entry.like['thumb-up']") {{' · '}}
        span(v-if="user")
          a(role="button" @click="doReply") Reply
          span {{' · '}}
        span(v-if="entry && isYours(entry)")
          a(role="button" @click="toggleEdit") {{modelIsEdit ? 'Post' : 'Edit'}}
          span {{' · '}}
        span(v-if="entry && isYours(entry)")
          a(role="button" @click="doDelete") Delete
          span {{' · '}}
        span(v-if="entry")
          span Posted by {{nickname(entry) || 'Anonymous'}}
          span {{' · '}}
          span {{ pastDuration }} ago
      section(v-if="entry && depth < 3")
        Entry(v-if="hasReply" :reply-from="entry.id" :is-edit="true"
          @delete="hasReply = false" @render="$emit('render')" @post="onPost" :depth="depth + 1")
        Entry(v-for="it in subcomments" :key="it.id" :reply-from="entry.id"
            :entry="it" @render="$emit('render')" @delete="onDelete(it.id)" :depth="depth + 1")
  section(v-if="entry && depth >= 3")
    Entry(v-if="hasReply" :reply-from="entry.id" :is-edit="true"
        @delete="hasReply = false" @render="$emit('render')" @post="onPost" :depth="depth + 1")
    Entry(v-for="it in subcomments" :key="it.id" :reply-from="entry.id"
        :entry="it" @render="$emit('render')" @delete="onDelete(it.id)" :depth="depth + 1")
</template>

<script lang="ts">
import { Vue, Component, Prop } from 'nuxt-property-decorator'
import humanizeDuration from 'humanize-duration'
import { User } from 'firebase/app'
import { MakeHtml } from '../assets/make-html'
import { FirestoreOp, IEntry, g } from '../assets/schema'
import MarkdownEditor from './MarkdownEditor.vue'
import { getGravatarUrl } from '@/assets/util'

@Component({
  components: {
    MarkdownEditor
  }
})
export default class Entry extends Vue {
  @Prop() entry?: IEntry & { id: string }
  @Prop({ default: false }) isEdit!: boolean
  @Prop({ required: true }) replyFrom!: string
  @Prop({ required: true }) depth!: number

  makehtml: MakeHtml | null = null
  modelIsEdit = this.isEdit
  hasReply = false
  value = this.entry ? this.entry.content : ''
  subcomments: (IEntry & { id: string })[] = []
  hasMore = false
  getGravatarUrl = getGravatarUrl
  html = ''

  get fs() {
    return g.fs as FirestoreOp
  }

  get user() {
    return this.$store.state.user as User
  }

  get pastDuration() {
    return this.entry
      ? humanizeDuration(+new Date() - +new Date(this.entry.createdAt), {
          round: true,
          largest: 2
        })
      : ''
  }

  created() {
    this.makehtml = new MakeHtml(
      this.entry ? this.entry.id : `reply-${this.replyFrom}`
    )
    this.getHtml()
    if (this.entry) {
      this.fetchSubcomments()
    }
  }

  isYours(entry: IEntry) {
    return (
      this.user &&
      this.user.email &&
      this.user.email === (entry.createdBy || {}).email
    )
  }

  nickname(entry: IEntry) {
    const user = entry.createdBy
    return (user ? user.displayName : null) || 'Anonymous'
  }

  async getHtml() {
    if (process.client && this.makehtml) {
      this.html = await this.makehtml.parse(this.value)
      this.$emit('render')
    }
  }

  async toggleLike() {
    if (!this.entry || !this.fs.user.email) {
      return
    }

    if (this.entry.like['thumb-up'].includes(this.fs.user.email)) {
      this.entry.like['thumb-up'] = this.entry.like['thumb-up'].filter(
        (el: any) => el !== this.fs.user.email
      )
    } else {
      this.entry.like['thumb-up'].push(this.fs.user.email)
    }
    await this.fs.update(this.entry.id, { like: this.entry.like })
    this.$set(this.entry, 'like', this.entry.like)
  }

  doReply() {
    this.hasReply = true
    this.$emit('render')
  }

  async toggleEdit() {
    if (this.entry && this.modelIsEdit) {
      await this.fs.update(this.entry.id, { content: this.value })
      await this.getHtml()
    }

    this.modelIsEdit = !this.modelIsEdit
  }

  async doDelete() {
    if (!this.entry) {
      return
    }

    await this.fs.delete(this.entry.id, this.replyFrom)
    this.$emit('delete')
  }

  async fetchSubcomments() {
    if (!this.entry) {
      return
    }

    const r = await this.fs.read(this.entry.id, this.subcomments)

    this.subcomments = r.data
    this.entry = {
      ...r.parent,
      id: this.entry.id
    }

    if (this.subcomments.length < this.entry.replyCount) {
      this.hasMore = true
    } else {
      this.hasMore = false
    }
    this.$emit('render')
  }

  async onPost() {
    this.$set(this, 'subcomments', [])
    await this.fetchSubcomments()
  }

  onDelete(id: string) {
    this.$set(
      this,
      'subcomments',
      this.subcomments.filter((el) => el.id !== id)
    )
    this.$emit('render')
  }
}
</script>

<style lang="scss">
.reply-editor {
  margin: 10px;
}
</style>
