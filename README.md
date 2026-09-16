# SFTools

Collection of tools for Shakes & Fidget

## Requirements

- [Git](https://git-scm.com/)
- [Bun](https://bun.sh/) 1.3.6 or newer
- [Node.js](https://nodejs.org/) 20.19+ or 22.12+

### Windows

```powershell
winget install Git.Git
winget install Oven-sh.Bun
winget install OpenJS.NodeJS.LTS
```

Open a new terminal afterwards so the tools are on the `PATH`.

### Linux and WSL

```bash
curl -fsSL https://bun.sh/install | bash
curl -fsSL https://raw.githubusercontent.com/tj/n/master/bin/n | bash -s install lts
npm install -g n
```

## Setup

```bash
git clone https://github.com/HafisCZ/sf-tools.git
cd sf-tools
bun install
```

## Commands

| Command                | What it does                                                      |
| ---------------------- | ----------------------------------------------------------------- |
| `bun run dev`          | Starts the dev server                                             |
| `bun run build`        | Type checks and builds the site into `dist/`                      |
| `bun run preview`      | Serves the built `dist/` to check a production build              |
| `bun run typecheck`    | Type checks only                                                  |
| `bun run lint`         | Lints `src/` and `vite.config.ts` with oxlint                     |
| `bun run format`       | Formats `src/` and `vite.config.ts` with oxfmt                    |
| `bun run format:check` | Reports files that `format` would change, without changing them   |
