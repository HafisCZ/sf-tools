import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { type Plugin } from 'vite'

const ENGINE_DIRECTORY = fileURLToPath(new URL('../../src/sim/engine', import.meta.url))
const ENGINE_SOURCES = [path.join(ENGINE_DIRECTORY, 'src'), path.join(ENGINE_DIRECTORY, 'Cargo.toml'), path.join(ENGINE_DIRECTORY, 'Cargo.lock')]

export function buildEngine() {
  try {
    execFileSync('cargo', ['build', '--release', '--target', 'wasm32-unknown-unknown'], { cwd: ENGINE_DIRECTORY, stdio: 'inherit' })
  } catch (error) {
    throw new Error('Building the simulator engine failed. It needs Rust (rustup) with the wasm32-unknown-unknown target.', { cause: error })
  }

  fs.copyFileSync(path.join(ENGINE_DIRECTORY, 'target/wasm32-unknown-unknown/release/engine.wasm'), path.join(ENGINE_DIRECTORY, 'engine.wasm'))
}

export function rustEngine(legacy: boolean): Plugin {
  return {
    name: 'rust-engine',
    buildStart() {
      if (legacy) {
        // Empty wasm module, keeps the engine.wasm import working while the site runs the legacy engine
        fs.writeFileSync(path.join(ENGINE_DIRECTORY, 'engine.wasm'), new Uint8Array([0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00]))
        return
      }

      buildEngine()
    },
    configureServer(server) {
      if (legacy) {
        return
      }

      server.watcher.add(ENGINE_SOURCES)
      server.watcher.on('all', (_event, file) => {
        if (!ENGINE_SOURCES.some((source) => file.startsWith(source))) {
          return
        }

        try {
          buildEngine()

          server.ws.send({ type: 'full-reload' })
        } catch (error) {
          server.config.logger.error(`${String(error)} Keeping the previous engine.`)
        }
      })
    }
  }
}
