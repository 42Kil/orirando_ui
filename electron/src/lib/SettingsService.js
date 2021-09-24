import fs from 'fs'
import ini from 'ini'
import { RANDOMIZER_BASE_PATH } from './Constants'
import path from 'path'
import { BrowserWindow } from 'electron'
import merge from 'lodash.merge'

const SETTINGS_PATH = `${RANDOMIZER_BASE_PATH}/settings.ini`
const CURRENT_SEED_PATH_FILE = `${RANDOMIZER_BASE_PATH}/.currentseedpath`
const OLD_RANDO_PATH_FILE = path.join(process.env.LOCALAPPDATA || '', 'wotwrpath.tmp')

const getDefaultSettings = () => ({
  Paths: {
    Steam: 'C:\\Program Files (x86)\\Steam\\steam.exe',
    UdpPort: 31415,
    URL: 'wotw.orirando.com',
  },
  Flags: {
    UseWinStore: false,
    Dev: false,
    MuteInjectLogs: false,
    ShowShortCutscenes: false,
    ShowLongCutscenes: false,
    HideQuestFilter: false,
    HideWarpFilter: false,
    HideCollectableFilter: false,
    AlwaysShowWarps: false,
    AlwaysShowKeystones: false,
    WorldMapEnabled: true,
    GrappleMouseControl: false,
    BurrowMouseControl: false,
    WaterDashMouseControl: false,
    DisableNetcode: false,
    LaunchWithTracker: false,
    DisableQuestFocus: false,
    BoringMoney: true,
    WaitForDebugger: false,
    InvertSwim: false,
  },
})

const sendSettingsToUI = () => {
  const window = BrowserWindow.getFocusedWindow()
  if (window) {
    window.webContents.send('main.settingsChanged', settingsCache)
  }
}

let settingsCache = null
let shouldShowImportInfoDialog = false

export class SettingsService {
  static async makeSureSettingsFileExists() {
    await this.readSettings()
    await this.writeSettings()
  }

  static async readSettings() {
    if (!fs.existsSync(SETTINGS_PATH)) {
      console.log('Settings file not found, using default settings...')
      settingsCache = getDefaultSettings()
    } else {
      const settings = await fs.promises.readFile(SETTINGS_PATH, { encoding: 'utf16le' })

      settingsCache = merge(
        getDefaultSettings(),
        ini.parse(settings.trimLeft()),
      )
    }

    console.log('Settings loaded', settingsCache)
    sendSettingsToUI()

    return settingsCache
  }

  static setSettings(settings) {
    settingsCache = settings
    sendSettingsToUI()
  }

  static async writeSettings() {
    await fs.promises.writeFile(SETTINGS_PATH, ini.encode(settingsCache), { encoding: 'utf16le' })
  }

  static async getOldInstallationPath() {
    const oldPathFile = OLD_RANDO_PATH_FILE
    if (!fs.existsSync(oldPathFile)) {
      console.log('SettingsService: Did not find old Rando installation')
      return null
    }

    const oldPath = await fs.promises.readFile(oldPathFile, { encoding: 'utf-8' })
    if (!fs.existsSync(oldPath)) {
      console.log(`SettingsService: Found old Rando path file, but the target path (${oldPath}) does not exist`)
      return null
    }

    return oldPath
  }

  static async importSettingsFromOldInstallation() {
    const oldPath = await this.getOldInstallationPath()
    if (oldPath) {
      console.log('Importing settings.ini...')
      await fs.promises.copyFile(path.join(oldPath, 'settings.ini'), SETTINGS_PATH)

      if (fs.existsSync(path.join(oldPath, '.currentseedpath'))) {
        console.log('Importing .currentseedpath...')
        await fs.promises.copyFile(path.join(oldPath, '.currentseedpath'), CURRENT_SEED_PATH_FILE)
      }

      console.log('Cleaning up old rando...')
      const files = [
        'WotwRando.exe',
        'ItemTracker.exe',
        'RandoSettings.exe',
        'areas.wotw',
        'state_data.csv',
        'settings.ini',
        'loader_log.txt',
        'controller_bindings.cfg',
        'discord_game_sdk.dll',
        'headers_presets.zip',
        'Il2CppModLoader.dll',
        'InjectDLL.dll',
        'Injector.exe',
        'modloader_config.json',
        'RandoMainDLL.dll',
        'seedgen.exe',
        'VERSION',
        '.messagelog',
        'cs_log.txt',
        'inject_log.csv',
        'reach_log.txt',
        'trackfile.json',
        '.currentseedpath',
        'manager_error.log',
        'SeeGen.jar',
        'loc_data.csv',
        'rando_binds.ahk',
      ]
      for (const file of files) {
        const filePath = path.join(oldPath, file)
        if (fs.existsSync(filePath)) {
          try {
            await fs.promises.unlink(filePath)
            console.log(` - ${file} → deleted`)
          } catch (e) {
            console.error(e)
            console.log(` - ${file} → error`)
          }
        } else {
          console.log(` - ${file} → does not exist`)
        }
      }

      console.log('Deleting path file...')
      await fs.promises.unlink(OLD_RANDO_PATH_FILE)

      shouldShowImportInfoDialog = true
      return true
    }

    return false
  }

  static shouldShowImportInfoDialog() {
    const value = shouldShowImportInfoDialog
    shouldShowImportInfoDialog = false
    return value
  }
}
