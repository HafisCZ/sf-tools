import { useLoader } from '@utils/loader'
import { formatDuration } from '@utils/utils'
import { Logger } from '~/core/logger'

const loader = useLoader()

export class Workers {
  static #fetchCache = new Map<string, string>()
  static #objectCache = new Map<string, string>()

  static get local() {
    return document.location.protocol == 'file:'
  }

  static async #fetchContent(location: string) {
    if (!this.#fetchCache.has(location)) {
      const url = `${this.local ? 'https://sftools.mar21.eu' : ''}/${location}`

      this.#fetchCache.set(location, await fetch(url).then((data) => data.text()))
    }

    return this.#fetchCache.get(location) as string
  }

  static async #fetchObject(type: string) {
    if (!this.#objectCache.has(type)) {
      const blob = new Blob([(await this.#fetchContent('js/sim/base.js')) + (await this.#fetchContent(`js/sim/${type}.js`))], { type: 'text/javascript' })

      this.#objectCache.set(type, URL.createObjectURL(blob))
    }

    return this.#objectCache.get(type) as string
  }

  static async prefetch(type: string) {
    await this.#fetchObject(type)
  }

  static async createWorker(type: string) {
    return new Worker(await this.#fetchObject(type))
  }

  static invalidate() {
    this.#fetchCache.clear()
    this.#objectCache.clear()
  }
}

export class WorkerBatch<TResult, TParams extends object = object> {
  type: string
  workers: [callback: (data: TResult, duration: number) => void, params: TParams][]

  timestamp = 0
  workersDone = 0
  workersTotal = 0
  activeParams: TParams[] = []
  instanceCondition: (params: TParams, running: TParams) => boolean = () => true

  #resolve: () => void = () => {}

  constructor(type: string) {
    this.type = type
    this.workers = []
  }

  async #nextWorker() {
    if (this.workers.length > 0) {
      const index = this.workers.findIndex(([, params]) => this.activeParams.every((_params) => this.instanceCondition(params, _params)))

      if (index !== -1) {
        const [callback, params] = this.workers.splice(index, 1)[0]
        this.activeParams.push(params)

        const worker = await Workers.createWorker(this.type)
        worker.addEventListener('message', ({ data }: MessageEvent<TResult>) => {
          callback(data, Date.now() - this.timestamp)

          loader.progress(++this.workersDone / this.workersTotal)

          this.activeParams.splice(this.activeParams.indexOf(params), 1)

          if (this.workersDone === this.workersTotal) {
            this.#resolve()
          } else {
            void this.#nextWorker()
          }
        })

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
    loader.start({ progress: true })

    // Create promise
    return new Promise<number>((resolve) => {
      this.#resolve = () => {
        const duration = Date.now() - this.timestamp

        loader.stop()
        Logger.log('MESSAGE', `Simulator took ${formatDuration(duration)} with ${this.workersTotal} sets using ${instances} concurrent threads.`)

        resolve(duration)
      }

      if (this.workersTotal === 0) {
        this.#resolve()
      } else {
        void (async () => {
          await Workers.prefetch(this.type)

          const instancesInitial = Math.min(instances, this.workersTotal)
          for (let i = 0; i < instancesInitial; i++) {
            void this.#nextWorker()
          }
        })()
      }
    })
  }
}
