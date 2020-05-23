<template lang="pug">
#window
  #dialog(ref="dialog" v-if="!$store.state.user")
  div(v-else) You can safely close this window now.
</template>

<script lang="ts">
import { Vue, Component } from 'nuxt-property-decorator'
import 'firebaseui/dist/firebaseui.css'

@Component
export default class LoginDialog extends Vue {
  async mounted() {
    if (process.client) {
      const { parent } = window

      const { auth } = await import('firebaseui')
      new auth.AuthUI(this.$fireAuth).start(this.$refs.dialog as HTMLElement, {
        // signInSuccessUrl: 'about:blank',
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
            if (parent) {
              parent.$nuxt.$store.dispatch('setUser')
            }
            // window.close()
            return false
          }
        }
      })
    }
  }
}
</script>

<style lang="scss" scoped>
#window {
  width: 100%;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
