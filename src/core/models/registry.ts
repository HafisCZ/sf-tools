export class ModelRegistry<TMajor, TMinor> {
  #data = new Map<TMajor, Set<TMinor>>()

  add(major: TMajor, minor: TMinor) {
    const data = this.#data.get(major) || new Set<TMinor>()
    data.add(minor)

    this.#data.set(major, data)
  }

  remove(major: TMajor, minor: TMinor) {
    const data = this.#data.get(major)
    if (data) {
      data.delete(minor)

      if (data.size === 0) {
        this.#data.delete(major)
      }
    }
  }

  values(major: TMajor): Iterable<TMinor> {
    return this.#data.get(major) || []
  }

  empty(major: TMajor) {
    const data = this.#data.get(major)
    if (data) {
      return data.size === 0
    } else {
      return true
    }
  }

  entries() {
    return this.#data.entries()
  }

  keys() {
    return this.#data.keys()
  }
}
