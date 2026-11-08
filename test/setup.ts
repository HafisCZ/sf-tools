import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { buildEngine } from '../vite/plugins/rust-engine'

buildEngine()

Bun.plugin({
  name: 'wasm-url',
  setup(build) {
    build.onResolve({ filter: /\.wasm\?url$/ }, ({ path: specifier, importer }) => ({ path: path.resolve(path.dirname(importer), specifier.replace(/\?url$/, '')) }))
    build.onLoad({ filter: /\.wasm$/ }, ({ path: file }) => ({ contents: `export default ${JSON.stringify(pathToFileURL(file).href)}`, loader: 'js' }))
  }
})
