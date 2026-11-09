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
      strike?: boolean
    }
  | {
      image: string
      width: number
      height: number
      // Drawn over the bottom right corner of the image
      badge?: CanvasGridLine
    }

export type CanvasGridLine = {
  height: number
  items: CanvasGridItem[]
  gap?: number
  padding?: number
  background?: string
  radius?: number
}

export type CanvasGridCell = {
  lines: CanvasGridLine[]
  background?: string
  border?: string
  radius?: number
  inset?: number
  rowSpan?: number
}

export type CanvasGridColumn = {
  width: number | `${number}%` | 'fill'
  align?: 'left' | 'center' | 'right'
  background?: string
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
  // 1px line over the top of every row, under the cells
  divider?: string
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

  drawGrid({ columns, rows, columnGap = 0, padding = {}, divider }: CanvasGrid) {
    const contentWidth = this.width - (padding.left ?? 0) - (padding.right ?? 0)
    const sizes = columns.map(({ width }) => (typeof width === 'number' ? width : width === 'fill' ? 0 : (parseFloat(width) / 100) * contentWidth))
    const fillWidth = (contentWidth - sum(sizes) - columnGap * (columns.length - 1)) / columns.filter(({ width }) => width === 'fill').length

    let x = padding.left ?? 0

    const layout = columns.map(({ width, align, background }, index) => {
      const column = { x, width: width === 'fill' ? fillWidth : sizes[index], align, background }

      x += column.width + columnGap

      return column
    })

    const gridTop = padding.top ?? 0

    let top = gridTop

    const boxes = rows.map((row) => {
      const contentTop = top + (row.padding?.top ?? 0)
      const contentBottom = contentTop + getRowContentHeight(row)
      const box = { top, contentTop, contentBottom, bottom: contentBottom + (row.padding?.bottom ?? 0) }

      top = box.bottom

      return box
    })

    for (const column of layout) {
      if (column.background) {
        this.#drawBox(column.x, gridTop, column.width, top - gridTop, column.background)
      }
    }

    if (divider) {
      for (const box of boxes) {
        this.#drawBox(padding.left ?? 0, box.top, contentWidth, 1, divider)
      }
    }

    rows.forEach((row, rowIndex) => {
      row.cells.forEach((cell, index) => {
        const column = layout[index]

        if (!cell || !column) return

        const first = boxes[rowIndex]
        const last = boxes[Math.min(rowIndex + (cell.rowSpan ?? 1), boxes.length) - 1]

        if (cell.background) {
          const inset = cell.inset ?? 0

          this.#drawBox(column.x + inset, first.top + inset, column.width - 2 * inset, last.bottom - first.top - 2 * inset, cell.background, cell.border, cell.radius)
        }

        let lineTop = first.contentTop + (last.contentBottom - first.contentTop - getCellHeight(cell)) / 2

        for (const line of cell.lines) {
          this.#drawGridLine(line, column.x, column.width, lineTop, column.align)

          lineTop += line.height
        }
      })
    })
  }

  #drawBox(x: number, y: number, width: number, height: number, background: string, border?: string, radius = 0) {
    this.context.fillStyle = background

    if (!border && radius <= 0) {
      this.context.fillRect(x, y, width, height)
      return
    }

    // Half a pixel in with a border, so the 1px stroke stays inside the box like a CSS border
    const offset = border ? 0.5 : 0

    this.context.beginPath()
    this.context.roundRect(x + offset, y + offset, width - 2 * offset, height - 2 * offset, radius)
    this.context.fill()

    if (border) {
      this.context.strokeStyle = border
      this.context.lineWidth = 1
      this.context.stroke()
    }
  }

  #getItemWidths(items: CanvasGridItem[]) {
    return items.map((item) => ('text' in item ? this.measureText(item.text, item.font) : item.width))
  }

  #getLineWidth(line: CanvasGridLine) {
    return sum(this.#getItemWidths(line.items)) + (line.gap ?? 0) * Math.max(0, line.items.length - 1) + 2 * (line.padding ?? 0)
  }

  #drawGridLine(line: CanvasGridLine, left: number, width: number, top: number, align: CanvasGridColumn['align'] = 'left') {
    const height = line.height
    const gap = line.gap ?? 0
    const itemWidths = this.#getItemWidths(line.items)
    const lineWidth = this.#getLineWidth(line)

    let x = left

    if (align === 'center') {
      x += (width - lineWidth) / 2
    } else if (align === 'right') {
      x += width - lineWidth
    }

    if (line.background) {
      this.#drawBox(x, top, lineWidth, height, line.background, undefined, line.radius)
    }

    x += line.padding ?? 0

    line.items.forEach((item, index) => {
      if ('text' in item) {
        this.drawText(item.text, { x, top, lineHeight: height, font: item.font, color: item.color })

        if (item.strike) {
          this.context.fillRect(x, Math.round(top + height / 2), itemWidths[index], 1)
        }
      } else {
        const imageTop = top + (height - item.height) / 2

        this.drawImage(item.image, x, imageTop, item.width, item.height)

        if (item.badge) {
          const badgeWidth = this.#getLineWidth(item.badge)

          this.#drawGridLine(item.badge, x + item.width - badgeWidth, badgeWidth, imageTop + item.height - item.badge.height)
        }
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

// Cells spanning rows are centred over all of them, so they don't stretch the first
function getRowContentHeight({ cells }: CanvasGridRow) {
  return Math.max(0, ...cells.map((cell) => (cell && (cell.rowSpan ?? 1) <= 1 ? getCellHeight(cell) : 0)))
}

function getCellHeight({ lines }: CanvasGridCell) {
  return sum(lines.map(({ height }) => height))
}
