<template lang="pug">
#window
  #dialog(ref="dialog")
</template>

<script lang="ts">
import { Vue, Component } from 'nuxt-property-decorator'
import { auth } from 'firebaseui'

@Component
export default class LoginDialog extends Vue {
  mounted() {
    new auth.AuthUI(this.$fireAuth).start(this.$refs.dialog as HTMLElement, {
      signInSuccessUrl: new URL('/callback', process.env.BASE_URL).href,
      signInOptions: [
        // Leave the lines as is for the providers you want to offer your users.
        this.$fireAuthObj.GoogleAuthProvider.PROVIDER_ID,
        // this.$fireAuthObj.FacebookAuthProvider.PROVIDER_ID,
        // this.$fireAuthObj.TwitterAuthProvider.PROVIDER_ID,
        this.$fireAuthObj.GithubAuthProvider.PROVIDER_ID,
        this.$fireAuthObj.EmailAuthProvider.PROVIDER_ID,
        // this.$fireAuthObj.PhoneAuthProvider.PROVIDER_ID,
        auth.AnonymousAuthProvider.PROVIDER_ID
      ]
    })
  }
}
</script>

<style lang="scss" scoped>
#window {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
