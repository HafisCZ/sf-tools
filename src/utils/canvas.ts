export type CanvasOptions = {
  width: number
  height: number
  background?: string
  fonts?: string[]
  images?: string[]
}

export type CanvasTextOptions = {
  x: number
  top: number
  lineHeight: number
  font: string
  color: string
  align?: CanvasTextAlign
}

export class CanvasDrawing {
  readonly context: CanvasRenderingContext2D

  #canvas: HTMLCanvasElement
  #images: Map<string, HTMLImageElement | null>

  constructor(canvas: HTMLCanvasElement, context: CanvasRenderingContext2D, images: Map<string, HTMLImageElement | null>) {
    this.context = context
    this.#canvas = canvas
    this.#images = images
  }

  measureText(text: string, font: string) {
    this.context.font = font

    return this.context.measureText(text).width
  }

  drawText(text: string, { x, top, lineHeight, font, color, align = 'left' }: CanvasTextOptions) {
    this.context.font = font
    this.context.fillStyle = color
    this.context.textAlign = align

    const metrics = this.context.measureText(text)
    this.context.fillText(text, x, top + (lineHeight + metrics.fontBoundingBoxAscent - metrics.fontBoundingBoxDescent) / 2)

    return metrics.width
  }

  drawImage(url: string, x: number, y: number, width: number, height: number) {
    const image = this.#images.get(url)

    if (image) {
      this.context.drawImage(image, x, y, width, height)
    }
  }

  toBlob() {
    return new Promise<Blob>((resolve, reject) => {
      this.#canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('The image could not be created'))))
    })
  }
}

export async function createCanvas({ width, height, background, fonts = [], images = [] }: CanvasOptions) {
  const loadedImages = Array.from(new Set(images), (url) => {
    const image = new Image()
    image.src = url

    return image.decode().then(
      () => [url, image] as const,
      () => [url, null] as const
    )
  })

  const [entries] = await Promise.all([Promise.all(loadedImages), Promise.all(fonts.map((font) => document.fonts.load(font)))])

  const scale = window.devicePixelRatio

  const canvas = document.createElement('canvas')
  canvas.width = Math.ceil(width * scale)
  canvas.height = Math.ceil(height * scale)

  const context = canvas.getContext('2d')

  if (!context) throw new Error('The image could not be created')

  context.scale(scale, scale)

  if (background) {
    context.fillStyle = background
    context.fillRect(0, 0, width, height)
  }

  return new CanvasDrawing(canvas, context, new Map(entries))
}
