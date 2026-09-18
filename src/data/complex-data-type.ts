export class ComplexDataType {
  values: (number | string)[]
  ptr: number
  bytes: number[]

  constructor(values?: (number | string)[]) {
    this.values = values || []
    this.ptr = 0
    this.bytes = []
  }

  empty() {
    return this.values.length <= this.ptr
  }

  atLeast(size: number) {
    return this.ptr + size <= this.values.length
  }

  long() {
    return (this.values[this.ptr++] || 0) as number
  }

  peek() {
    return (this.values[this.ptr] || 0) as number
  }

  string() {
    return (this.values[this.ptr++] || '') as string
  }

  split() {
    const word = this.long()
    this.bytes = [word % 0x100, (word >> 8) % 0x100, (word >> 16) % 0x100, (word >> 24) % 0x100]
  }

  short() {
    if (!this.bytes.length) {
      this.split()
    }

    return (this.bytes.shift() as number) + ((this.bytes.shift() as number) << 8)
  }

  byte() {
    if (!this.bytes.length) {
      this.split()
    }

    return this.bytes.shift() as number
  }

  byteArray(length: number) {
    const array: number[] = []

    for (let i = 0; i < length; i++) {
      array.push(this.byte())
    }

    return array
  }

  assert(size: number) {
    if (this.values.length < size) {
      throw new Error(`ComplexDataType Exception: Expected ${size} values but ${this.values.length} were supplied!`)
    }
  }

  sub(size: number) {
    const values = this.values.slice(this.ptr, this.ptr + size) as number[]
    this.ptr += size
    return values
  }

  clear() {
    this.bytes = []
  }

  skip(size: number) {
    this.ptr += size
    return this
  }

  back(size: number) {
    this.ptr -= size
    return this
  }
}
