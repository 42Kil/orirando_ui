import { WebSocketFactory } from '~/assets/lib/WebSocketFactory'
import { isElectron } from '~/assets/lib/isElectron'
import { getJwtStorageKey } from '~/assets/electron/getJwtStorageKey'
import { generateClientJwt } from '~/assets/electron/generateClientJwt'

export const state = () => ({
  redirectPath: null,
  jwt: null,
})

export const getters = {}

export const mutations = {
  setRedirectPath(state, redirectPath) {
    state.redirectPath = redirectPath

    if (redirectPath) {
      window.localStorage.setItem('auth.redirectPath', redirectPath)
    } else {
      window.localStorage.removeItem('auth.redirectPath')
    }
  },
  setJwtState(state, jwt) {
    state.jwt = jwt
  },
}

export const actions = {
  async setJwt({ commit }, jwt) {
    commit('setJwtState', jwt)

    let jwtStorageKey = 'auth.jwt'

    if (isElectron()) {
      jwtStorageKey = await getJwtStorageKey()
    }

    if (jwt) {
      this.$axios.setToken(jwt, 'Bearer')
      window.localStorage.setItem(jwtStorageKey, jwt)
      WebSocketFactory.jwt = jwt

      if (isElectron()) {
        await generateClientJwt(this.$axios)
      }
    } else {
      this.$axios.setToken(false)
      window.localStorage.removeItem(jwtStorageKey)
      WebSocketFactory.jwt = null

      if (isElectron()) {
        await window.electronApi.invoke('auth.deleteClientJwt')
      }
    }
  },
}
