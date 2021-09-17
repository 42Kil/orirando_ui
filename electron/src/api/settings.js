import fs from 'fs'
import ini from 'ini'

const SETTINGS_PATH = './settings.ini'
const JWT_PATH = './.jwt'
const getDefaultSettings = () => ({
  Paths: {
    Steam: null,
  },
  Flags: {
    UseWinStore: false,
    SkipUpdate: false,
    Dev: false,
    MuteInjectLogs: false,
    ShowShortCutscenes: false,
    ShowLongCutscenes: false,
  },
})

let settingsCache = null

export default {
  async readSettings() {
    if (!fs.existsSync(SETTINGS_PATH)) {
      settingsCache = getDefaultSettings()
    } else {
      settingsCache = {
        ...getDefaultSettings(),
        ...ini.parse(await fs.promises.readFile(SETTINGS_PATH, { encoding: 'utf-8' })),
      }
    }

    return settingsCache
  },
  async setSettings(event, settings) {
    settingsCache = settings
  },
  async writeSettings() {
    await fs.promises.writeFile(SETTINGS_PATH, ini.encode(settingsCache), { encoding: 'utf-8' })
  },
  async setClientJwt(event, jwt) {
    await fs.promises.writeFile(JWT_PATH, jwt, {encoding: 'utf-8'})
  }
}
