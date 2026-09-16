import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { defineConfig, type Plugin } from "vite"
import vue from "@vitejs/plugin-vue"
import tailwindcss from "@tailwindcss/vite"

// Pages converted to Vue. Everything else is served and copied as-is.
const VUE_PAGES = ["changelog"]

const LEGACY_DIRECTORIES = ["js", "css", "res", "vendor", "endpoint"]
const LEGACY_FILES = ["CNAME", "sitemap.txt"]

const ROOT_DIRECTORY = fileURLToPath(new URL(".", import.meta.url))
const LEGACY_PAGES = fs.readdirSync(ROOT_DIRECTORY).filter((file) => file.endsWith(".html") && !VUE_PAGES.includes(path.basename(file, ".html")))

function legacySite(): Plugin {
  let outputDirectory = ""

  return {
    name: "legacy-site",
    configResolved(config) {
      outputDirectory = path.resolve(config.root, config.build.outDir)
    },
    configureServer(server) {
      // Serve legacy JS/CSS untouched, Vite's transforms break worker source concatenation (Workers in js/util.js)
      server.middlewares.use((request, response, next) => {
        const url = request.url ?? ""
        if (url.includes("?") || !/\.(js|css)$/.test(url) || !LEGACY_DIRECTORIES.some((directory) => url.startsWith(`/${directory}/`))) {
          return next()
        }

        const file = path.join(ROOT_DIRECTORY, decodeURIComponent(url))
        if (!file.startsWith(ROOT_DIRECTORY) || !fs.existsSync(file)) {
          return next()
        }

        response.setHeader("Content-Type", url.endsWith(".js") ? "text/javascript" : "text/css")
        fs.createReadStream(file).pipe(response)
      })
    },
    writeBundle() {
      const filter = (source: string) => !path.basename(source).startsWith(".")

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
  appType: "mpa",
  plugins: [vue(), tailwindcss(), legacySite()],
  resolve: {
    alias: {
      "@library": path.join(ROOT_DIRECTORY, "src/library"),
      "@utils": path.join(ROOT_DIRECTORY, "src/utils"),
      "~": path.join(ROOT_DIRECTORY, "src")
    }
  },
  server: {
    watch: {
      ignored: ["**/res/**", "**/endpoint/**", "**/vendor/**"]
    }
  },
  optimizeDeps: {
    entries: VUE_PAGES.map((page) => `${page}.html`)
  },
  build: {
    rolldownOptions: {
      input: Object.fromEntries(VUE_PAGES.map((page) => [page, path.join(ROOT_DIRECTORY, `${page}.html`)]))
    }
  }
})
