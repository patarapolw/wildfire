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
        span(v-if="entry.id")
          span
            a(role="button" @click="toggleLike" v-if="isYours(entry)")
              | {{entry.like['thumb-up'].includes(user.email) ? 'Unlike' : 'Like'}}
            span(v-if="entry.like['thumb-up'].length > 0")
              b-icon(icon="thumb-up-outline" size="is-small" style="margin-left: 0.5rem;")
              span {{entry.like['thumb-up'].length}}
            span(v-if="user || like['thumb-up']") {{' · '}}
          span(v-if="user")
            a(role="button" @click="doReply") Reply
            span {{' · '}}
        span(v-if="isYours(entry)")
          a(role="button" @click="toggleEdit") {{modelIsEdit ? 'Post' : 'Edit'}}
          span {{' · '}}
        span(v-if="isYours(entry)")
          a(role="button" @click="doDelete") Delete
          span {{' · '}}
        span Posted by {{nickname(entry) || 'Anonymous'}}
        span {{' · '}}
        span {{ pastDuration }} ago
      section(v-if="replyDepth < 3")
        Entry(v-if="hasReply" :replyFrom="replyPath" is-edit
          @delete="hasReply = false" @render="$emit('render')" @post="onPost")
        Entry(v-for="it in subcomments" :key="it.id" :replyFrom="replyPath"
            :entry="it" @render="$emit('render')" @delete="onDelete(it.id)")
  section(v-if="replyDepth >= 3")
    Entry(v-if="hasReply" :replyFrom="replyPath" is-edit
        @delete="hasReply = false" @render="$emit('render')" @post="onPost")
    Entry(v-for="it in subcomments" :key="it.id" :replyFrom="replyPath"
        :entry="it" @render="$emit('render')" @delete="onDelete(it.id)")
</template>

<script lang="ts">
import { Vue, Component, Prop } from 'nuxt-property-decorator'
import humanizeDuration from 'humanize-duration'
import { MakeHtml } from '../assets/make-html'
import { FirestoreOp, IEntry } from '../assets/schema'
import MarkdownEditor from './MarkdownEditor.vue'
import { getGravatarUrl } from '@/assets/util'

@Component({
  components: {
    MarkdownEditor
  }
})
export default class Entry extends Vue {
  @Prop({ required: true }) entry!: IEntry & { id: string }
  @Prop({ default: false }) isEdit!: boolean
  @Prop({ required: true }) replyFrom!: string

  makehtml: MakeHtml | null = null
  modelIsEdit = this.isEdit
  hasReply = false
  value = this.entry.content || ''
  subcomments: (IEntry & { id: string })[] = []
  hasMore = false
  getGravatarUrl = getGravatarUrl
  html = ''

  get fs() {
    return new FirestoreOp(this)
  }

  get user() {
    return this.$store.state.user
  }

  get replyPath() {
    const id = this.entry.id || ''
    return this.replyFrom ? `${this.replyFrom}/${id}` : id
  }

  get replyDepth() {
    return this.replyPath.split('/').length
  }

  get pastDuration() {
    return humanizeDuration(+new Date() - +new Date(this.entry.createdAt), {
      round: true,
      largest: 2
    })
  }

  created() {
    this.makehtml = new MakeHtml(this.entry.id || `reply-${this.replyFrom}`)
    if (this.entry.id) {
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
    return user.displayName || 'Anonymous'
  }

  async getHtml() {
    if (process.client && this.makehtml) {
      this.html = await this.makehtml.parse(this.value)
      this.$emit('render')
    }
  }

  async toggleLike() {
    if (!this.fs.user.email) {
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
    if (this.modelIsEdit) {
      await this.fs.update(this.entry.id, { content: this.value })
      await this.getHtml()
    }

    this.modelIsEdit = !this.modelIsEdit
  }

  async doDelete() {
    await this.fs.delete(this.entry.id, this.replyFrom)
    this.$emit('delete')
  }

  async fetchSubcomments() {
    const r = await this.fs.read(this.replyPath, this.subcomments)
    this.subcomments = r.data
    this.entry = {
      ...r.parent,
      id: this.replyPath
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
  height: 200px;

  @media screen and (max-width: 600px) {
    height: 300px;
  }
}
</style>
