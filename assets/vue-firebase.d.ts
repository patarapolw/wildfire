import Vue from 'vue'
import { auth, firestore, storage } from 'firebase/app'
import { AxiosInstance } from 'axios'

declare module 'vue/types/vue' {
  interface Vue {
    $axios: AxiosInstance
    $fireAuth: auth.Auth
    $fireAuthObj: typeof auth
    $fireStore: firestore.Firestore
    $fireStorage: storage.Storage
  }
}
