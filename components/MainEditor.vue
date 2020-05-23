<template lang="pug">
article.media
  figure.media-left(style="text-align: center;")
    p.image.avatar(style="margin-top: 1rem;")
      b-tooltip(v-if="user" :label="'Logged in as ' + user.nickname + '. Click to logout'" position="is-right")
        img.is-rounded.cursor-pointer(:src="getGravatarUrl(user.email)" :alt="user.given_name"
          @click="doLogout" role="button")
      b-tooltip(v-else label="Click to login" position="is-right")
        img.is-rounded.cursor-pointer(:src="getGravatarUrl()"
          @click="doLogin" role="button")
  .media-content
    .toggleable-editor-main
      client-only(v-if="user")
        MarkdownEditor(
          v-model="currentValue"
          @ready="$emit('render')")
      b-input(v-else type="textarea" disabled placeholder="Please login to comment.")
    .buttons(style="margin-left: 1rem;")
        b-button.is-success(:disabled="!user || !currentValue" @click="doPost") Post Comment
</template>

<script lang="ts">
import { Vue, Component, Emit } from 'nuxt-property-decorator'
import { FirestoreOp } from '../assets/schema'
import MarkdownEditor from './MarkdownEditor.vue'
import { getGravatarUrl } from '@/assets/util'

@Component({
  components: {
    MarkdownEditor
  }
})
export default class MainEditor extends Vue {
  currentValue = ''
  getGravatarUrl = getGravatarUrl

  get fs() {
    return new FirestoreOp(this)
  }

  get user() {
    return this.$fireAuth.currentUser
  }

  doLogin() {
    open('/login', '_blank')
    // this.$fireAuth.signInWithPopup()
  }

  doLogout() {
    this.$fireAuth.signOut()
  }

  @Emit('post')
  async doPost() {
    await this.fs.create({
      content: this.currentValue,
      createdAt: new Date().toISOString(),
      replyTo: '_root',
      replyCount: 0,
      like: {
        'thumb-up': []
      }
    })

    this.currentValue = ''
  }
}
</script>

<style lang="scss">
.preview {
  background-color: #fcf2d4;
}

.toggleable-editor-main {
  margin: 10px;
  height: 200px;

  @media screen and (max-width: 600px) {
    height: 300px;
  }
}

.cursor-pointer {
  cursor: pointer;
}
</style>
