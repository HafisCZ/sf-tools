export class Exporter {
  static get time() {
    return new Date()
      .toISOString()
      .replace(/[-:.T]/g, '_')
      .replace(/Z$/, '')
  }

  static download(name: string, content: Blob) {
    const url = URL.createObjectURL(content)

    const node = document.createElement('a')
    node.download = name
    node.href = url

    document.body.appendChild(node)
    node.click()
    node.remove()

    URL.revokeObjectURL(url)
  }

  static json(content: unknown, name = this.time) {
    this.download(`${name}.json`, new Blob([JSON.stringify(content)], { type: 'application/json' }))
  }

  static png(content: Blob, name = this.time) {
    this.download(`${name}.png`, content)
  }

  static csv(content: string, name = this.time) {
    this.download(`${name}.csv`, new Blob([content], { type: 'text/csv' }))
  }

  static txt(content: string, name = this.time) {
    this.download(`${name}.txt`, new Blob([content], { type: 'text/plain' }))
  }
}
