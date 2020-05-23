<template lang="pug">
article.media
  figure.media-left(style="text-align: center; position: relative;")
    .popup(ref="login" v-show="isLoggingIn")
    p.image.avatar(style="margin-top: 1rem;")
      b-tooltip(v-if="user" :label="'Logged in as ' + (user.displayName || 'Anonymous') + '. Click to logout'" position="is-right")
        img.is-rounded.cursor-pointer(:src="getGravatarUrl(user.email)" :alt="user.given_name"
          @click="doLogout" role="button")
      b-tooltip(v-else label="Click to login" position="is-right")
        img.is-rounded.cursor-pointer(:src="getGravatarUrl()"
          @click="isLoggingIn = true" role="button")
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
import { Vue, Component, Emit, Watch } from 'nuxt-property-decorator'
import { FirestoreOp, g } from '../assets/schema'
import MarkdownEditor from './MarkdownEditor.vue'
import { getGravatarUrl } from '@/assets/util'

import 'firebaseui/dist/firebaseui.css'

@Component({
  components: {
    MarkdownEditor
  }
})
export default class MainEditor extends Vue {
  currentValue = ''
  getGravatarUrl = getGravatarUrl
  isLoggingIn = false
  authUI: any = null

  get fs() {
    return g.fs as FirestoreOp
  }

  get user() {
    return this.$store.state.user
  }

  @Watch('isLoggingIn')
  async doLogin() {
    if (process.client) {
      const { login } = this.$refs as any
      const { auth } = await import('firebaseui')
      this.authUI =
        this.authUI ||
        auth.AuthUI.getInstance() ||
        new auth.AuthUI(this.$fireAuth)
      this.authUI.start(login, {
        signInFlow: 'popup',
        signInOptions: [
          // Leave the lines as is for the providers you want to offer your users.
          this.$fireAuthObj.GoogleAuthProvider.PROVIDER_ID,
          // this.$fireAuthObj.FacebookAuthProvider.PROVIDER_ID,
          // this.$fireAuthObj.TwitterAuthProvider.PROVIDER_ID,
          this.$fireAuthObj.GithubAuthProvider.PROVIDER_ID,
          this.$fireAuthObj.EmailAuthProvider.PROVIDER_ID,
          // this.$fireAuthObj.PhoneAuthProvider.PROVIDER_ID,
          auth.AnonymousAuthProvider.PROVIDER_ID
        ],
        callbacks: {
          signInSuccessWithAuthResult: () => {
            this.$store.commit('setUser', this.$fireAuth.currentUser)
            this.isLoggingIn = false
            return true
          }
        }
      })

      const onClickOutside = (evt: any) => {
        const { login } = this.$refs as any
        if (login && !login.contains(evt.target)) {
          this.isLoggingIn = false
        }
        this.$el.removeEventListener('click', onClickOutside)
      }

      this.$el.addEventListener('click', onClickOutside)
    }
  }

  async doLogout() {
    await this.$fireAuth.signOut()
    this.$store.commit('setUser', null)
  }

  @Emit('post')
  async doPost() {
    await this.fs.create({
      content: this.currentValue,
      createdAt: new Date().toISOString(),
      replyTo: (await this.fs.getRoot()).id,
      replyCount: 0,
      like: {
        'thumb-up': []
      }
    })

    this.currentValue = ''
  }
}
</script>

<style lang="scss" scoped>
.preview {
  background-color: #fcf2d4;
}

.toggleable-editor-main {
  margin: 10px;
  // height: 150px;
}

.cursor-pointer {
  cursor: pointer;
}

.popup {
  position: absolute;
  background-color: white;
  box-shadow: 0 4px 8px 0 rgba(0, 0, 0, 0.2), 0 6px 20px 0 rgba(0, 0, 0, 0.19);
  z-index: 100;
  left: 50%;
  top: 1em;
  width: 250px;
}
</style>
