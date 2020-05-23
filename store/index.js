export const strict = false

export const state = () => ({
  user: null
})

export const mutations = {
  setUser(state, user) {
    state.user = JSON.parse(JSON.stringify(user))
  }
}
