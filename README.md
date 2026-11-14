# SFTools

Collection of tools for Shakes & Fidget

## Requirements

- [Git](https://git-scm.com/)
- [Bun](https://bun.sh/) 1.3.6 or newer
- [Node.js](https://nodejs.org/) 20.19+ or 22.12+
- [Rust](https://rustup.rs/) stable through rustup, with the `wasm32-unknown-unknown` target (builds the simulator engine)

### Windows

```powershell
winget install Git.Git
winget install Oven-sh.Bun
winget install OpenJS.NodeJS.LTS
winget install Microsoft.VisualStudio.2022.BuildTools --override "--wait --passive --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended"
winget install Rustlang.Rustup
```

Open a new terminal afterwards so the tools are on the `PATH`, then add the wasm target:

```powershell
rustup target add wasm32-unknown-unknown
```

### Linux and WSL

```bash
curl -fsSL https://bun.sh/install | bash
curl -fsSL https://raw.githubusercontent.com/tj/n/master/bin/n | bash -s install lts
npm install -g n
sudo apt install -y build-essential
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --target wasm32-unknown-unknown
```

`build-essential` gives Rust the C linker it needs. Open a new terminal afterwards so `cargo` is on the `PATH`.

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
| `bun run dev:wsl`      | Starts the dev server with polling, for WSL on a Windows disk     |
| `bun run build`        | Type checks and builds the site into `dist/`                      |
| `bun run preview`      | Serves the built `dist/` to check a production build              |
| `bun run typecheck`    | Type checks only                                                  |
| `bun run test`         | Builds the simulator engine and runs the tests in `test/`         |
| `bun run lint`         | Lints `src/`, `test/`, `vite/` and `vite.config.ts` with oxlint   |
| `bun run format`       | Formats `src/`, `test/`, `vite/` and `vite.config.ts` with oxfmt  |
| `bun run format:check` | Reports files that `format` would change, without changing them   |
