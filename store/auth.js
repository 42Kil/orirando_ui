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
  restoreJwt(state, jwt) {
    if (jwt) {
      this.$axios.setToken(jwt, 'Bearer')
      WebSocketFactory.jwt = jwt
      state.jwt = jwt
    } else {
      this.$axios.setToken(false)
      WebSocketFactory.jwt = null
      state.jwt = null
    }
  },
}


const LAST_USED_STORAGE_KEY_KEY = 'auth.lastUsedJwtStorageKey'

export const actions = {
  async restoreJwtWhenHostChanged({ dispatch }) {
    if (isElectron()) {
      const jwtStorageKey = await getJwtStorageKey()
      const lastJwtStorageKey = window.localStorage.getItem(LAST_USED_STORAGE_KEY_KEY)

      if (jwtStorageKey !== lastJwtStorageKey) {
        await dispatch('setJwt', window.localStorage.getItem(jwtStorageKey))
      }
    }
  },
  async setJwt({ commit }, jwt) {
    commit('setJwtState', jwt)

    let jwtStorageKey = 'auth.jwt'

    if (isElectron()) {
      jwtStorageKey = await getJwtStorageKey()
    }

    commit('restoreJwt', jwt)

    if (jwt) {
      window.localStorage.setItem(jwtStorageKey, jwt)

      if (isElectron()) {
        await generateClientJwt(this.$axios)
      }
    } else {
      window.localStorage.removeItem(jwtStorageKey)

      if (isElectron()) {
        await window.electronApi.invoke('auth.deleteClientJwt')
      }
    }

    window.localStorage.setItem(LAST_USED_STORAGE_KEY_KEY, jwtStorageKey)
  },
}
