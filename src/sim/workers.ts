import { useLoader } from '@utils/loader'
import { formatDuration } from '@utils/utils'
import { Logger } from '~/core/logger'

const loader = useLoader()

const WORKERS = {
  dungeons: () => new Worker(new URL('./dungeons.ts', import.meta.url), { type: 'module' }),
  fortress: () => new Worker(new URL('./fortress.ts', import.meta.url), { type: 'module' }),
  guilds: () => new Worker(new URL('./guilds.ts', import.meta.url), { type: 'module' }),
  hellevator: () => new Worker(new URL('./hellevator.ts', import.meta.url), { type: 'module' }),
  hydra: () => new Worker(new URL('./hydra.ts', import.meta.url), { type: 'module' }),
  pets: () => new Worker(new URL('./pets.ts', import.meta.url), { type: 'module' }),
  players: () => new Worker(new URL('./players.ts', import.meta.url), { type: 'module' }),
  raids: () => new Worker(new URL('./raids.ts', import.meta.url), { type: 'module' }),
  underworld: () => new Worker(new URL('./underworld.ts', import.meta.url), { type: 'module' })
}

const POOL: { [K in keyof typeof WORKERS]?: Worker[] } = {}

function acquireWorker(type: keyof typeof WORKERS) {
  return POOL[type]?.pop() ?? WORKERS[type]()
}

function releaseWorker(type: keyof typeof WORKERS, worker: Worker) {
  const pool = (POOL[type] ??= [])

  pool.push(worker)
}

export class WorkerBatch<TResult, TParams extends object = object> {
  type: keyof typeof WORKERS
  workers: [callback: (data: TResult, duration: number) => void, params: TParams][]

  timestamp = 0
  workersDone = 0
  workersTotal = 0
  activeParams: TParams[] = []
  instanceCondition: (params: TParams, running: TParams) => boolean = () => true

  #running = new Set<Worker>()
  #cancelled = false

  #resolve: (cancelled: boolean) => void = () => {}

  constructor(type: keyof typeof WORKERS) {
    this.type = type
    this.workers = []
  }

  #nextWorker() {
    if (this.workers.length > 0) {
      const index = this.workers.findIndex(([, params]) => this.activeParams.every((_params) => this.instanceCondition(params, _params)))

      if (index !== -1) {
        const [callback, params] = this.workers.splice(index, 1)[0]
        this.activeParams.push(params)

        const worker = acquireWorker(this.type)
        this.#running.add(worker)

        worker.addEventListener(
          'message',
          ({ data }: MessageEvent<TResult>) => {
            if (this.#cancelled) return

            this.#running.delete(worker)
            releaseWorker(this.type, worker)

            callback(data, Date.now() - this.timestamp)

            loader.progress(++this.workersDone / this.workersTotal)

            this.activeParams.splice(this.activeParams.indexOf(params), 1)

            if (this.workersDone === this.workersTotal) {
              this.#resolve(false)
            } else {
              this.#nextWorker()
            }
          },
          { once: true }
        )

        worker.postMessage(params)
      }
    }
  }

  skip(predicate: (params: TParams) => boolean) {
    for (let i = 0; i < this.workers.length; i++) {
      // Remove worker if predicate is true
      if (predicate(this.workers[i][1])) {
        this.workers.splice(i--, 1)
        this.workersDone++
      }
    }
  }

  add(callback: (data: TResult, duration: number) => void, params: TParams) {
    this.workers.push([callback, params])
  }

  size() {
    return this.workers.length
  }

  cancel() {
    if (this.#cancelled) return

    this.#cancelled = true

    for (const worker of this.#running) {
      worker.terminate()
    }

    this.#running.clear()
    this.workers = []
    this.#resolve(true)
  }

  run(instances: number, instanceCondition: (params: TParams, running: TParams) => boolean = () => true) {
    // Initial timestamp
    this.timestamp = Date.now()

    // Set counters
    this.workersDone = 0
    this.workersTotal = this.workers.length

    this.activeParams = []

    // Set instance condition
    this.instanceCondition = instanceCondition

    // Show loader
    loader.start({ progress: true, onCancel: () => this.cancel() })

    // Create promise
    return new Promise<number | null>((resolve) => {
      this.#resolve = (cancelled) => {
        const duration = Date.now() - this.timestamp

        loader.stop()

        if (cancelled) {
          Logger.log('MESSAGE', 'Simulator terminated')

          resolve(null)
        } else {
          Logger.log('MESSAGE', `Simulator took ${formatDuration(duration)} with ${this.workersTotal} sets using ${instances} concurrent threads.`)

          resolve(duration)
        }
      }

      if (this.workersTotal === 0) {
        this.#resolve(false)
      } else {
        const instancesInitial = Math.min(instances, this.workersTotal)
        for (let i = 0; i < instancesInitial; i++) {
          this.#nextWorker()
        }
      }
    })
  }
}
