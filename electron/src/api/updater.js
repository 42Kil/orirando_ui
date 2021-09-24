import fs from 'fs'
import { download } from 'electron-dl'
import { BrowserWindow } from 'electron'
import { app } from 'electron'
import { spawn } from 'child_process'
import { RANDOMIZER_BASE_PATH } from '~/electron/src/lib/Constants'

const VERSION_FILE = `${RANDOMIZER_BASE_PATH}/VERSION`

export default {
  async getVersion() {
    if (!fs.existsSync(VERSION_FILE)) {
      return 'develop'
    }

    return (await fs.promises.readFile(VERSION_FILE, { encoding: 'utf-8' })).trim()
  },
  async downloadAndInstallUpdate(event, { url }) {
    await download(BrowserWindow.getFocusedWindow(), url, {
      onProgress: progress => {
        event.sender.send('updater.downloadProgress', progress)
      },
      onCompleted: item => {
        console.log('Spawning process: ', item.path)
        spawn(`${item.path} /SILENT`, [], {
          detached: true,
          stdio: 'ignore',
        }).unref()
        app.quit()
        process.exit()
      },
    })
  },
}
