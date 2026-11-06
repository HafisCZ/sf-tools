import { sum } from '@utils/utils'

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

export type CanvasPadding = {
  top?: number
  right?: number
  bottom?: number
  left?: number
}

export type CanvasGridItem =
  | {
      text: string
      font: string
      color: string
    }
  | {
      image: string
      width: number
      height: number
    }

export type CanvasGridLine = {
  height: number
  items: CanvasGridItem[]
  gap?: number
}

export type CanvasGridCell = {
  lines: CanvasGridLine[]
}

export type CanvasGridColumn = {
  width: number | `${number}%` | 'fill'
  align?: 'left' | 'center' | 'right'
}

export type CanvasGridRow = {
  cells: (CanvasGridCell | null)[]
  padding?: Pick<CanvasPadding, 'top' | 'bottom'>
}

export type CanvasGrid = {
  columns: CanvasGridColumn[]
  rows: CanvasGridRow[]
  columnGap?: number
  padding?: CanvasPadding
}

export class CanvasDrawing {
  readonly context: CanvasRenderingContext2D
  readonly width: number

  #canvas: HTMLCanvasElement
  #images: Map<string, HTMLImageElement | null>

  constructor(canvas: HTMLCanvasElement, context: CanvasRenderingContext2D, images: Map<string, HTMLImageElement | null>, width: number) {
    this.context = context
    this.width = width
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

  drawGrid({ columns, rows, columnGap = 0, padding = {} }: CanvasGrid) {
    const contentWidth = this.width - (padding.left ?? 0) - (padding.right ?? 0)
    const sizes = columns.map(({ width }) => (typeof width === 'number' ? width : width === 'fill' ? 0 : (parseFloat(width) / 100) * contentWidth))
    const fillWidth = (contentWidth - sum(sizes) - columnGap * (columns.length - 1)) / columns.filter(({ width }) => width === 'fill').length

    let x = padding.left ?? 0

    const layout = columns.map(({ width, align }, index) => {
      const column = { x, width: width === 'fill' ? fillWidth : sizes[index], align }

      x += column.width + columnGap

      return column
    })

    let top = padding.top ?? 0

    for (const row of rows) {
      const height = getRowContentHeight(row)
      const rowTop = top + (row.padding?.top ?? 0)

      row.cells.forEach((cell, index) => {
        const column = layout[index]

        if (!cell || !column) return

        let lineTop = rowTop + (height - getCellHeight(cell)) / 2

        for (const line of cell.lines) {
          this.#drawGridLine(line, column.x, column.width, lineTop, column.align)

          lineTop += line.height
        }
      })

      top = rowTop + height + (row.padding?.bottom ?? 0)
    }
  }

  #drawGridLine({ height, items, gap = 0 }: CanvasGridLine, left: number, width: number, top: number, align: CanvasGridColumn['align'] = 'left') {
    const itemWidths = items.map((item) => ('text' in item ? this.measureText(item.text, item.font) : item.width))
    const lineWidth = sum(itemWidths) + gap * (items.length - 1)

    let x = left

    if (align === 'center') {
      x += (width - lineWidth) / 2
    } else if (align === 'right') {
      x += width - lineWidth
    }

    items.forEach((item, index) => {
      if ('text' in item) {
        this.drawText(item.text, { x, top, lineHeight: height, font: item.font, color: item.color })
      } else {
        this.drawImage(item.image, x, top + (height - item.height) / 2, item.width, item.height)
      }

      x += itemWidths[index] + gap
    })
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

  const scale = 2 * window.devicePixelRatio

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

  return new CanvasDrawing(canvas, context, new Map(entries), width)
}

export function getGridHeight({ rows, padding = {} }: CanvasGrid) {
  return (padding.top ?? 0) + sum(rows.map((row) => (row.padding?.top ?? 0) + getRowContentHeight(row) + (row.padding?.bottom ?? 0))) + (padding.bottom ?? 0)
}

function getRowContentHeight({ cells }: CanvasGridRow) {
  return Math.max(0, ...cells.map((cell) => (cell ? getCellHeight(cell) : 0)))
}

function getCellHeight({ lines }: CanvasGridCell) {
  return sum(lines.map(({ height }) => height))
}
