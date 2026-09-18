export class SignalSource<TEvents extends Record<string, unknown[]>> {
  #listeners: { [TEvent in keyof TEvents]?: ((...args: TEvents[TEvent]) => void)[] } = {}

  emit<TEvent extends keyof TEvents>(event: TEvent, ...args: TEvents[TEvent]) {
    for (const listener of this.#listeners[event] ?? []) {
      listener(...args)
    }
  }

  subscribe<TEvent extends keyof TEvents>(event: TEvent, listener: (...args: TEvents[TEvent]) => void) {
    ;(this.#listeners[event] ??= []).push(listener)
  }
}
