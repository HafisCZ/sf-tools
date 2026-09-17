import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

// Pages built by Vite: converted to Vue, or static pages styled with Tailwind. Everything else is served and copied as-is.
const VITE_PAGES = ['changelog', '404', 'index', 'calendar', 'blacksmith', 'request', 'hydra', 'idle']

const LEGACY_DIRECTORIES = ['js', 'css', 'res', 'vendor', 'endpoint']
const LEGACY_FILES = ['CNAME', 'sitemap.txt']

const ROOT_DIRECTORY = fileURLToPath(new URL('.', import.meta.url))
const LEGACY_PAGES = fs.readdirSync(ROOT_DIRECTORY).filter((file) => file.endsWith('.html') && !VITE_PAGES.includes(path.basename(file, '.html')))

// Build numbers count the commits since this one
const FIRST_COMMIT = '88b32f42210cb848c77b7891f6e47a0000876ed4'

// Version shown in the index page footer, read from the git history. Needs the full history, so CI must not make a shallow clone.
function readBuildInfo() {
  try {
    const git = (command: string) => execSync(`git ${command}`, { cwd: ROOT_DIRECTORY, encoding: 'utf8' }).trim()

    const [date, message] = git('log -1 --format=%aI%n%s').split('\n')

    return {
      version: Number(git(`rev-list --count ${FIRST_COMMIT}..HEAD`)) + 1,
      timestamp: new Date(date).getTime(),
      message
    }
  } catch (e) {
    console.warn(`Could not read the build version from git: ${String(e)}`)

    return null
  }
}

function legacySite(): Plugin {
  let outputDirectory = ''

  return {
    name: 'legacy-site',
    configResolved(config) {
      outputDirectory = path.resolve(config.root, config.build.outDir)
    },
    configureServer(server) {
      // Serve legacy JS/CSS untouched, Vite's transforms break worker source concatenation (Workers in js/util.js)
      server.middlewares.use((request, response, next) => {
        const url = request.url ?? ''
        if (url.includes('?') || !/\.(js|css)$/.test(url) || !LEGACY_DIRECTORIES.some((directory) => url.startsWith(`/${directory}/`))) {
          return next()
        }

        const file = path.join(ROOT_DIRECTORY, decodeURIComponent(url))
        if (!file.startsWith(ROOT_DIRECTORY) || !fs.existsSync(file)) {
          return next()
        }

        response.setHeader('Content-Type', url.endsWith('.js') ? 'text/javascript' : 'text/css')
        fs.createReadStream(file).pipe(response)
      })
    },
    writeBundle() {
      const filter = (source: string) => !path.basename(source).startsWith('.')

      for (const entry of [...LEGACY_DIRECTORIES, ...LEGACY_FILES, ...LEGACY_PAGES]) {
        fs.cpSync(path.join(ROOT_DIRECTORY, entry), path.join(outputDirectory, entry), {
          recursive: true,
          filter
        })
      }
    }
  }
}

export default defineConfig({
  appType: 'mpa',
  plugins: [vue(), tailwindcss(), legacySite()],
  define: {
    __BUILD_INFO__: JSON.stringify(readBuildInfo())
  },
  resolve: {
    alias: {
      '@library': path.join(ROOT_DIRECTORY, 'src/library'),
      '@utils': path.join(ROOT_DIRECTORY, 'src/utils'),
      '~': path.join(ROOT_DIRECTORY, 'src')
    }
  },
  server: {
    watch: {
      // WSL gets no file events when Windows programs change files under /mnt, so dev:wsl checks the files on an interval instead
      usePolling: process.env.WATCH_POLLING === '1',
      ignored: ['**/res/**', '**/endpoint/**', '**/vendor/**', '**/dist/**']
    }
  },
  optimizeDeps: {
    entries: VITE_PAGES.map((page) => `${page}.html`)
  },
  build: {
    rolldownOptions: {
      input: Object.fromEntries(VITE_PAGES.map((page) => [page, path.join(ROOT_DIRECTORY, `${page}.html`)]))
    }
  }
})
