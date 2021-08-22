import Vue from 'vue'
import { RandoProto } from '~/assets/proto/RandoProto'
import { decodePacket, makePacket } from '~/assets/proto/RandoProtoUtil'
import { hasOwnProperty } from '~/assets/lib/hasOwnProperty'

/** @type Object<Number, WebSocket> */
const webSockets = {} // gameId → ws

export const state = () => ({
  games: {},
})

const ensureGameExists = (state, gameId) => {
  if (!hasOwnProperty(state.games, gameId)) {
    Vue.set(state.games, gameId, {
      teams: [],
      bingoBoard: null,
      bingoTeams: [],
    })
  }
}

export const getters = {}

export const mutations = {
  setBingoBoard(state, {gameId, board}) {
    ensureGameExists(state, gameId)
    state.games[gameId].bingoBoard = board
  },
  setTeams(state, {gameId, teams}) {
    ensureGameExists(state, gameId)
    state.games[gameId].teams = teams
  },
  setBingoTeams(state, {gameId, bingoTeams}) {
    ensureGameExists(state, gameId)
    state.games[gameId].bingoTeams = bingoTeams
  },
}

export const actions = {
  async fetchGame({ commit, dispatch }, gameId) {
    const game = await this.$axios.$get(`/games/${gameId}`)
    commit('setTeams', {gameId, teams: game.teams})
    if (game.hasBingoBoard) {
      await dispatch('fetchBingoBoard', gameId)
    }
  },
  async fetchBingoBoard({ commit }, gameId) {
    let board = null
    let bingoTeams = []

    try {
      const response = await this.$axios.$get(`/bingo/${gameId}`)
      board = response.board
      bingoTeams = response.teams ?? []
    } catch (e) {
      if (e.response.status !== 404) {
        console.error(e)
      } else {
        console.log('No bingo board available for game', gameId)
      }
    }

    commit('setBingoBoard', {gameId, board})
    commit('setBingoTeams', {gameId, bingoTeams})
  },
  connectGame({ commit, dispatch }, { userId, gameId, retries = 0 }) {
    let ws = webSockets[gameId] ?? null

    return new Promise(((resolve, reject) => {
      if (retries >= 5) {
        reject(new Error('Max number of retries exceeded'))
        return
      }

      if (ws?.readyState !== WebSocket.OPEN && ws?.readyState !== WebSocket.CONNECTING) {
        ws?.close()
        webSockets[gameId] = new WebSocket(`${process.env.WS_BASE_URL}/observers/${gameId}`)
        ws = webSockets[gameId]
        ws.addEventListener('open', () => {
          ws.send(makePacket(RandoProto.RequestUpdatesMessage, {
            playerId: userId,
          }))

          retries = 0
          resolve()
        })
        ws.addEventListener('close', () => {
          setTimeout(() => {
            dispatch('connectGame', {userId, gameId, retries: retries + 1})
              .catch(reject)
          }, 1000 * retries)
        })
        ws.addEventListener('message', async event => {
          const packet = await decodePacket(event.data)
          console.log(packet)
          if (packet instanceof RandoProto.SyncBoardMessage) {
            commit('setBingoBoard', {gameId, board: packet.board})
          } else if (packet instanceof RandoProto.GameInfo) {
            commit('setTeams', { gameId, teams: packet.teams })
          } else if (packet instanceof RandoProto.SyncBingoTeamsMessage) {
            commit('setBingoTeams', { gameId, bingoTeams: packet.teams })
          }
        })
      } else {
        resolve()
      }
    }))
  },
}
