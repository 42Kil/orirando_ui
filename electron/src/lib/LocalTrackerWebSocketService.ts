import { AddressInfo, WebSocket, WebSocketServer } from 'ws'
import { UberId, UberState } from '~/assets/lib/types/UberStates'
import { RandoIPCService } from '@/lib/RandoIPCService'
import { ResetTracker, TrackerFlagsUpdate, TrackerUpdate } from '~/assets/proto/messages'
import { makePacket } from '~/assets/proto/ProtoUtil'
import { uiIpc } from '@/api'

type TrackedUberState = {
  uberId: UberId,
  trackingId: string,
  valueConverter?: (value: number) => number
}

type TrackedUberStatesLookupTable = {
  [uberHash: string]: TrackedUberState
}

const teleporterValueConverter = (value: number) => value & 0b1

const TRACKED_UBER_STATES: TrackedUberState[] = [
  { uberId: { group: 0, state: 0 }, trackingId: 'tree_bash' },
  { uberId: { group: 0, state: 5 }, trackingId: 'tree_double_jump' },
  { uberId: { group: 0, state: 8 }, trackingId: 'tree_launch' },
  { uberId: { group: 0, state: 51 }, trackingId: 'tree_light_burst' },
  { uberId: { group: 0, state: 57 }, trackingId: 'tree_grapple' },
  { uberId: { group: 0, state: 62 }, trackingId: 'tree_flash' },
  { uberId: { group: 0, state: 77 }, trackingId: 'tree_regenerate' },
  { uberId: { group: 0, state: 97 }, trackingId: 'tree_bow' },
  { uberId: { group: 0, state: 100 }, trackingId: 'tree_sword' },
  { uberId: { group: 0, state: 101 }, trackingId: 'tree_burrow' },
  { uberId: { group: 0, state: 102 }, trackingId: 'tree_dash' },
  { uberId: { group: 0, state: 104 }, trackingId: 'tree_water_dash' },
  { uberId: { group: 0, state: 120 }, trackingId: 'tree_ancestral_light_glades' },
  { uberId: { group: 0, state: 121 }, trackingId: 'tree_ancestral_light_marsh' },

  { uberId: { group: 24922, state: 42531 }, trackingId: 'tp_midnight_burrows', valueConverter: teleporterValueConverter },
  { uberId: { group: 21786, state: 10185 }, trackingId: 'tp_inkwater_marsh', valueConverter: teleporterValueConverter },
  { uberId: { group: 11666, state: 61594 }, trackingId: 'tp_howls_den', valueConverter: teleporterValueConverter },
  { uberId: { group: 945, state: 58183 }, trackingId: 'tp_luma_pools_east', valueConverter: teleporterValueConverter },
  { uberId: { group: 945, state: 1370 }, trackingId: 'tp_luma_pools_west', valueConverter: teleporterValueConverter },
  { uberId: { group: 53632, state: 18181 }, trackingId: 'tp_wellspring', valueConverter: teleporterValueConverter },
  { uberId: { group: 28895, state: 54235 }, trackingId: 'tp_baurs_reach', valueConverter: teleporterValueConverter },
  { uberId: { group: 6, state: 106 }, trackingId: 'tp_kwoloks_hollow', valueConverter: teleporterValueConverter },
  { uberId: { group: 18793, state: 38871 }, trackingId: 'tp_mouldwood_depths', valueConverter: teleporterValueConverter },
  { uberId: { group: 16155, state: 41465 }, trackingId: 'tp_willow_inner', valueConverter: teleporterValueConverter },
  { uberId: { group: 16155, state: 50867 }, trackingId: 'tp_willow_outer', valueConverter: teleporterValueConverter },
  { uberId: { group: 58674, state: 7071 }, trackingId: 'tp_silent_woods_west', valueConverter: teleporterValueConverter },
  { uberId: { group: 58674, state: 1965 }, trackingId: 'tp_silent_woods_wast', valueConverter: teleporterValueConverter },
  { uberId: { group: 58674, state: 10029 }, trackingId: 'tp_windswept_wastes_west', valueConverter: teleporterValueConverter },
  { uberId: { group: 20120, state: 49994 }, trackingId: 'tp_windswept_wastes_east', valueConverter: teleporterValueConverter },
  { uberId: { group: 20120, state: 41398 }, trackingId: 'tp_windtorn_ruins_outer', valueConverter: teleporterValueConverter },
  { uberId: { group: 10289, state: 4928 }, trackingId: 'tp_windtorn_ruins_inner', valueConverter: teleporterValueConverter },
  { uberId: { group: 42178, state: 42096 }, trackingId: 'tp_wellspring_glades', valueConverter: teleporterValueConverter },

  { uberId: { group: 6, state: 1000 }, trackingId: 'skill_bash' },
  { uberId: { group: 6, state: 1003 }, trackingId: 'skill_wall_jump' },
  { uberId: { group: 6, state: 1005 }, trackingId: 'skill_double_jump' },
  { uberId: { group: 6, state: 1008 }, trackingId: 'skill_launch' },
  { uberId: { group: 6, state: 1014 }, trackingId: 'skill_glide' },
  { uberId: { group: 6, state: 1023 }, trackingId: 'skill_water_breath' },
  { uberId: { group: 6, state: 1051 }, trackingId: 'skill_light_burst' },
  { uberId: { group: 6, state: 1057 }, trackingId: 'skill_grapple' },
  { uberId: { group: 6, state: 1062 }, trackingId: 'skill_flash' },
  { uberId: { group: 6, state: 1074 }, trackingId: 'skill_spike' },
  { uberId: { group: 6, state: 1077 }, trackingId: 'skill_regenerate' },
  { uberId: { group: 6, state: 1097 }, trackingId: 'skill_bow' },
  { uberId: { group: 6, state: 1098 }, trackingId: 'skill_hammer' },
  { uberId: { group: 6, state: 1099 }, trackingId: 'skill_torch' },
  { uberId: { group: 6, state: 1100 }, trackingId: 'skill_sword' },
  { uberId: { group: 6, state: 1101 }, trackingId: 'skill_burrow' },
  { uberId: { group: 6, state: 1102 }, trackingId: 'skill_dash' },
  { uberId: { group: 6, state: 1104 }, trackingId: 'skill_water_dash' },
  { uberId: { group: 6, state: 1106 }, trackingId: 'skill_shuriken' },
  { uberId: { group: 6, state: 1115 }, trackingId: 'skill_blaze' },
  { uberId: { group: 6, state: 1116 }, trackingId: 'skill_sentry' },
  { uberId: { group: 6, state: 1118 }, trackingId: 'skill_flap' },
  { uberId: { group: 6, state: 1120 }, trackingId: 'skill_ancestral_light_glades' },
  { uberId: { group: 6, state: 1121 }, trackingId: 'skill_ancestral_light_marsh' },
  { uberId: { group: 6, state: 2000 }, trackingId: 'skill_clean_water' },

  { uberId: { group: 15, state: 0 }, trackingId: 'resource_spirit_light' },
  { uberId: { group: 15, state: 1 }, trackingId: 'resource_gorlek_ore' },
  { uberId: { group: 15, state: 2 }, trackingId: 'resource_keystones' },
]

export class LocalTrackerWebSocketService {
  private static ws: WebSocketServer | null = null

  private static trackedUberStatesLookupTable: TrackedUberStatesLookupTable = {}

  private static uberIdHash(id: UberId) {
    return String(id.group) + '.' + String(id.state)
  }

  private static webSocketListening = false

  static start() {
    this.trackedUberStatesLookupTable = {}
    for (const trackedUberState of TRACKED_UBER_STATES) {
      this.trackedUberStatesLookupTable[this.uberIdHash(trackedUberState.uberId)] = trackedUberState
    }

    this.ws = new WebSocketServer({
      port: 31410, // Random free port
      host: '127.0.0.1',
    })

    this.ws.on('listening', () => {
      this.webSocketListening = true
      uiIpc.queueSend('localTracker.setIsRunning', true)
      console.log('LocalTrackerWebSocketService: Started on port ' + this.port)
    })

    this.ws.on('close', () => {
      uiIpc.queueSend('localTracker.setIsRunning', false)
      this.webSocketListening = false
    })

    this.ws.on('connection', async socket => {
      // Send a reset and all tracked uber states on initial connection
      socket.send(makePacket(ResetTracker))
      await this.forceRefresh(socket)
    })
  }

  static get port(): number {
    return (this.ws?.address() as AddressInfo)?.port ?? 31410
  }

  static reportUberState(state: UberState) {
    const trackedUberState = this.trackedUberStatesLookupTable[this.uberIdHash(state)]
    if (trackedUberState) {
      this.sendUpdate(TrackerUpdate.fromJSON({
        id: trackedUberState.trackingId,
        value: trackedUberState.valueConverter
          ? trackedUberState.valueConverter(state.value)
          : state.value,
      }))
    }
  }

  static sendUpdate(update: TrackerUpdate) {
    for (const client of this.ws?.clients || []) {
      client.send(makePacket(TrackerUpdate, update))
    }
  }

  static async forceRefreshAll() {
    for (const client of this.ws?.clients || []) {
      await this.forceRefresh(client)
    }
  }

  static async forceRefresh(client: WebSocket) {
    const trackedValues = await RandoIPCService.getUberStates(TRACKED_UBER_STATES.map(s => s.uberId))
    const trackerUpdates: TrackerUpdate[] = trackedValues.map((value, index) => TrackerUpdate.fromJSON({
      id: TRACKED_UBER_STATES[index].trackingId,
      value,
    }))

    for (const update of trackerUpdates) {
      client.send(makePacket(TrackerUpdate, update))
    }

    client.send(makePacket(TrackerFlagsUpdate, {
      flags: await RandoIPCService.getSeedFlags(),
    }))
  }

  static stop() {
    for (const socket of this.ws?.clients || []) {
      socket.close()
    }
    this.ws?.close()
    console.log('LocalTrackerWebSocketService: Stopped')
  }

  static get isRunning() {
    return !!this.ws && this.webSocketListening
  }

  static debugSetUberState(trackingId: string, value: number) {
    const trackedUberState = TRACKED_UBER_STATES.find(t => t.trackingId === trackingId)
    if (trackedUberState) {
      RandoIPCService.setUberState(trackedUberState.uberId.group, trackedUberState.uberId.state, value)
    }
  }
}
