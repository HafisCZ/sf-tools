import fs from 'node:fs'
import path from 'node:path'
import { build } from 'vite'

const directory = import.meta.dir
const output = path.join(directory, 'dist')

fs.rmSync(output, { recursive: true, force: true })

const result = await Bun.build({
  entrypoints: ['hook', 'game', 'background', 'sync'].map((name) => path.join(directory, 'src', `${name}.ts`)),
  outdir: output,
  target: 'browser',
  format: 'iife',
  define: {
    'process.env.NODE_ENV': JSON.stringify('production')
  }
})

if (!result.success) {
  throw new AggregateError(result.logs, 'Extension build failed')
}

await build({
  configFile: path.join(directory, 'vite.config.ts')
})

fs.copyFileSync(path.join(directory, 'manifest.json'), path.join(output, 'manifest.json'))
fs.copyFileSync(path.join(directory, '..', 'res', 'favicon.png'), path.join(output, 'icon.png'))

fs.mkdirSync(path.join(output, 'res', 'fonts'), { recursive: true })

for (const font of ['Lato-Regular.woff2', 'Lato-Bold.woff2']) {
  fs.copyFileSync(path.join(directory, '..', 'res', 'fonts', font), path.join(output, 'res', 'fonts', font))
}
