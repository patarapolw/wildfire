import { MutationTree } from 'vuex'
import { User } from 'firebase/app'

export const state = () => ({
  user: null as User | null
})

export type RootState = ReturnType<typeof state>

export const mutations: MutationTree<RootState> = {
  setUser(state, user) {
    state.user = JSON.parse(JSON.stringify(user))
  }
}
