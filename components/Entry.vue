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
          span(:key="likeKey")
            a(role="button" @click="toggleLike" v-if="isAuthorized")
              | {{like['thumb-up'] && like['thumb-up'].includes(user.email) ? 'Unlike' : 'Like'}}
            span(v-if="like['thumb-up'] && like['thumb-up'].length > 0")
              b-icon(icon="thumb-up-outline" size="is-small" style="margin-left: 0.5rem;")
              span {{like['thumb-up'].length}}
            span(v-if="isAuthorized || like['thumb-up']") {{' · '}}
          span(v-if="isAuthorized")
            a(role="button" @click="doReply") Reply
            span {{' · '}}
        span(v-if="isAuthorized && isYou")
          a(role="button" @click="toggleEdit") {{modelIsEdit ? 'Post' : 'Edit'}}
          span {{' · '}}
        span(v-if="isAuthorized && isYou")
          a(role="button" @click="doDelete") Delete
          span {{' · '}}
        span Posted by {{user.nickname}}
        span {{' · '}}
        span {{ pastDuration }} ago
      section(v-if="replyDepth < 3")
        Entry(v-if="hasReply" :reply-to="replyPath" is-edit
          @delete="hasReply = false" @render="$emit('render')" @post="onPost")
        Entry(v-for="it in subcomments" :key="it.id" :reply-to="replyPath"
            :entry="it" @render="$emit('render')" @delete="onDelete(it.id)")
  section(v-if="replyDepth >= 3")
    Entry(v-if="hasReply" :reply-to="replyPath" is-edit
        @delete="hasReply = false" @render="$emit('render')" @post="onPost")
    Entry(v-for="it in subcomments" :key="it.id" :reply-to="replyPath"
        :entry="it" @render="$emit('render')" @delete="onDelete(it.id)")
</template>

<script lang="ts">
import { Vue, Component, Prop } from 'nuxt-property-decorator'
import humanizeDuration from 'humanize-duration'
import { MakeHtml } from '../assets/make-html'
import MarkdownEditor from './MarkdownEditor.vue'
import { getGravatarUrl } from '@/assets/util'

@Component({
  components: {
    MarkdownEditor
  }
})
export default class Entry extends Vue {
  @Prop({ default: () => ({}) }) entry!: any
  @Prop({ default: false }) isEdit!: boolean
  @Prop({ default: '' }) replyTo!: string

  like = this.entry.like || {}
  makehtml: MakeHtml | null = null
  modelIsEdit = this.isEdit
  hasReply = false
  value = this.entry.content || ''
  subcomments: any[] = []
  hasMore = false
  likeKey = JSON.stringify(this.like['thumb-up'])
  getGravatarUrl = getGravatarUrl
  html = ''

  get replyPath() {
    const id = this.entry.id || ''
    return this.replyTo ? `${this.replyTo}/${id}` : id
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

  get user() {
    return (
      (this.entry.user
        ? this.entry.user
        : this.replyTo
        ? this.$fireAuth.currentUser
        : null) || {}
    )
  }

  created() {
    this.makehtml = new MakeHtml(this.entry.id || `reply-${this.replyTo}`)
    if (this.entry.id) {
      this.fetchSubcomments()
    }
  }

  async getHtml() {
    if (process.client && this.makehtml) {
      this.html = await this.makehtml.parse(this.value)
      this.$emit('render')
    }
  }

  async toggleLike() {
    if (this.entry.id) {
      if (
        this.like['thumb-up'] &&
        this.like['thumb-up'].includes(this.user.email)
      ) {
        this.like['thumb-up'] = this.like['thumb-up'].filter(
          (el: any) => el !== this.user.email
        )
        await this.$fireStore
          .collection('wildfire')
          .doc(this.entry.id)
          .update({ like: this.like })
      } else {
        this.like['thumb-up'] = this.like['thumb-up'] || []
        this.like['thumb-up'].push(this.user.email)
        await this.$fireStore
          .collection('wildfire')
          .doc(this.entry.id)
          .update({ like: this.like })
      }
      this.$set(this.like, 'thumb-up', this.like['thumb-up'])
      this.likeKey = JSON.stringify(this.like['thumb-up'])
    }
  }

  doReply() {
    this.hasReply = true
    this.$emit('render')
  }

  async toggleEdit() {
    if (this.modelIsEdit) {
      if (this.entry.id) {
        await this.$fireStore
          .collection('wildfire')
          .doc(this.entry.id)
          .update({ content: this.value })
      } else {
        await this.$fireStore
          .collection('wildfire')
          .doc(this.replyTo)
          .update({ content: this.value })
        this.$emit('post')
        this.$emit('delete')
        this.$emit('render')
        return
      }
    }
    if (this.modelIsEdit) {
      await this.getHtml()
    }

    this.modelIsEdit = !this.modelIsEdit
  }

  async doDelete() {
    if (this.entry.id) {
      await this.$fireStore
        .collection('wildfire')
        .doc(this.entry.id)
        .delete()
    }
    this.$emit('delete')
  }

  async fetchSubcomments({ reset }: { reset?: boolean } = {}) {
    if (process.client) {
      let result = null
      try {
        const r = await this.$fireStore
          .collection('wildfire')
          .where('replyTo', '==', this.replyPath)
          .startAfter(
            reset ? 0 : this.subcomments[this.subcomments.length - 1].replyTo
          )
          .get()

        result = r.docs.map((d) => {
          const data = d.data()
          data.id = d.id
          return data
        })
      } catch (e) {
        return
      }
      this.subcomments = reset ? result : [...this.subcomments, ...result]
      this.$set(this, 'subcomments', this.subcomments)

      if (this.subcomments.length < this.entry.replyCount) {
        this.hasMore = true
      } else {
        this.hasMore = false
      }
      this.$emit('render')
    }
  }

  async onPost() {
    this.$set(this, 'subcomments', [])
    await this.fetchSubcomments({ reset: true })
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
