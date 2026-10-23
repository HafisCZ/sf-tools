import type { PlayerFace } from '~/core/models/player'
import PORTRAITS from './portraits.json'

export type PortraitLayer = {
  url: `/${string}`
  left: number
  top: number
  width: number
  height: number
}

export type Portrait = {
  size: number
  layers: PortraitLayer[]
}

type PortraitSource = {
  Face: PlayerFace
  Race: number
  Gender: number
  Class: CharacterClass
}

type PortraitBox = [left: number, top: number, width: number, height: number]

type PortraitParts = {
  folder: string
  body: Partial<Record<string, PortraitBox | null>>
  eyes: (PortraitBox | null)[]
  ears: (PortraitBox | null)[]
  nose: (PortraitBox | null)[]
  mouth: (PortraitBox | null)[]
  special: (PortraitBox | null)[]
  special2: (PortraitBox | null)[]
  hair: (PortraitBox | null)[][]
  brows: (PortraitBox | null)[][]
  beard: (PortraitBox | null)[][]
}

type PortraitData = {
  size: number
  special: number[]
  parts: Partial<Record<string, Partial<Record<string, PortraitParts>>>>
}

const DATA = PORTRAITS as unknown as PortraitData

const IMAGES = new Map<string, Promise<HTMLImageElement | null>>()

export const PORTRAIT_SIZE = DATA.size

// The game has no body for the newer classes, they borrow the body of the class with the same main attribute
export const PORTRAIT_BODY_CLASSES: Partial<Record<CharacterClass, CharacterClass>> = {
  10: 2,
  11: 1,
  12: 3,
  13: 1
}

export function getPortrait(source: PortraitSource): Portrait | null {
  const { Face: face } = source

  if (face.Portrait < 0) {
    const special = -face.Portrait

    return DATA.special.includes(special) ? { size: DATA.size, layers: [{ url: `/res/portraits/special/${special}.webp`, left: 0, top: 0, width: DATA.size, height: DATA.size }] } : null
  }

  const parts = DATA.parts[source.Race]?.[source.Gender]
  const bodyClass = PORTRAIT_BODY_CLASSES[source.Class] ?? source.Class
  const body = parts?.body[bodyClass]

  if (!parts || !body) {
    return null
  }

  const hair = getColorIndex(parts.hair, face.Hair.Color)
  const brows = getColorIndex(parts.brows, face.Brows.Color)
  const beard = getColorIndex(parts.beard, face.Beard.Color)

  const layers = [
    toLayer(parts.folder, `body_${bodyClass}`, body),
    toLayer(parts.folder, `eyes_${face.Eyes}`, parts.eyes[face.Eyes - 1]),
    toLayer(parts.folder, `ears_${face.Ears}`, parts.ears[face.Ears - 1]),
    toLayer(parts.folder, `nose_${face.Nose}`, parts.nose[face.Nose - 1]),
    toLayer(parts.folder, `mouth_${face.Mouth}`, parts.mouth[face.Mouth - 1]),
    toLayer(parts.folder, `hair_${hair}_${face.Hair.Type}`, parts.hair[hair - 1]?.[face.Hair.Type - 1]),
    toLayer(parts.folder, `brows_${brows}_${face.Brows.Type}`, parts.brows[brows - 1]?.[face.Brows.Type - 1]),
    toLayer(parts.folder, `beard_${beard}_${face.Beard.Type}`, parts.beard[beard - 1]?.[face.Beard.Type - 1]),
    toLayer(parts.folder, `special_${face.Special}`, parts.special[face.Special - 1]),
    toLayer(parts.folder, `special2_${face.Special2}`, parts.special2[face.Special2 - 1])
  ]

  return { size: DATA.size, layers: layers.filter((layer) => layer !== null) }
}

export function parseFaceData(text: string): PlayerFace | null {
  const values = text.split(',').map(Number)

  if (values.length < 10 || values.some((value) => !Number.isInteger(value))) {
    return null
  }

  const [mouth, hair, brows, eyes, beard, nose, ears, special, special2, portrait] = values

  return {
    Mouth: mouth,
    Hair: { Type: hair % 100, Color: Math.trunc(hair / 100) },
    Brows: { Type: brows % 100, Color: Math.trunc(brows / 100) },
    Eyes: eyes,
    Beard: { Type: beard % 100, Color: Math.trunc(beard / 100) },
    Nose: nose,
    Ears: ears,
    Special: special,
    Special2: special2,
    Portrait: portrait
  }
}

export function loadPortraitImages(portrait: Portrait | null) {
  return Promise.all((portrait?.layers ?? []).map((layer) => loadImage(layer.url)))
}

export function drawPortrait(canvas: HTMLCanvasElement, portrait: Portrait | null, images: (HTMLImageElement | null)[]) {
  const context = canvas.getContext('2d')

  if (!context) return

  context.clearRect(0, 0, canvas.width, canvas.height)

  if (!portrait) return

  const scale = canvas.width / portrait.size

  context.imageSmoothingQuality = 'high'

  portrait.layers.forEach((layer, index) => {
    const image = images[index]

    if (image) {
      context.drawImage(image, layer.left * scale, layer.top * scale, layer.width * scale, layer.height * scale)
    }
  })
}

// Races with fewer colours still get the hair colour for brows and beard, so it is clamped to the colours the race has
function getColorIndex(colors: unknown[], color: number) {
  return Math.min(Math.max(color, 1), colors.length)
}

function toLayer(folder: string, name: string, box: PortraitBox | null | undefined): PortraitLayer | null {
  return box ? { url: `/res/portraits/${folder}/${name}.webp`, left: box[0], top: box[1], width: box[2], height: box[3] } : null
}

function loadImage(url: string) {
  let image = IMAGES.get(url)

  if (!image) {
    const element = new Image()
    element.src = url

    image = element.decode().then(
      () => element,
      () => null
    )

    IMAGES.set(url, image)
  }

  return image
}
