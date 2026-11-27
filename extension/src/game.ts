import { useWindowMessage } from '../../src/utils/extension'
import { useExtensionMessage } from './messages'
import { onSettingsChange, readSettings } from './sites'

type Place = {
  top: number
  left: number
}

type DragStart = {
  x: number
  y: number
  top: number
  left: number
}

const PENGUIN_WIDTH = 36
const PENGUIN_HEIGHT = 40
const PENGUIN_EDGE = 16

let isEnabled: boolean | null = null

const responseMessage = useExtensionMessage('response')

useWindowMessage('sftools-hook').receive((data) => {
  if (isEnabled === false) return

  void responseMessage.send(data)
})

const penguin = document.createElement('img')

penguin.src = chrome.runtime.getURL('icon.png')
penguin.alt = ''
penguin.draggable = false
penguin.style.cssText = `display: none; position: fixed; z-index: 2147483647; width: ${PENGUIN_WIDTH}px; height: ${PENGUIN_HEIGHT}px; object-fit: contain; cursor: pointer; user-select: none; touch-action: none;`

let place: Place | null = null
let dragStart: DragStart | null = null
let isDragging = false

function updatePenguin() {
  const top = place?.top ?? PENGUIN_EDGE
  const left = place?.left ?? window.innerWidth - PENGUIN_WIDTH - PENGUIN_EDGE

  penguin.style.top = `${Math.max(0, Math.min(top, window.innerHeight - PENGUIN_HEIGHT))}px`
  penguin.style.left = `${Math.max(0, Math.min(left, window.innerWidth - PENGUIN_WIDTH))}px`
  penguin.style.display = isEnabled ? 'block' : 'none'
}

async function start() {
  const stored = await chrome.storage.local.get('penguin')
  const settings = await readSettings()

  place = (stored.penguin as Place | undefined) ?? null
  isEnabled = settings.enabled

  document.body.append(penguin)

  updatePenguin()
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => void start())
} else {
  void start()
}

window.addEventListener('resize', updatePenguin)

onSettingsChange((settings) => {
  isEnabled = settings.enabled

  updatePenguin()
})

penguin.addEventListener('pointerdown', (event) => {
  if (event.button !== 0) return

  const rect = penguin.getBoundingClientRect()

  dragStart = { x: event.clientX, y: event.clientY, top: rect.top, left: rect.left }
  isDragging = false

  penguin.setPointerCapture(event.pointerId)
})

penguin.addEventListener('pointermove', (event) => {
  if (!dragStart) return

  const x = event.clientX - dragStart.x
  const y = event.clientY - dragStart.y

  if (!isDragging && Math.hypot(x, y) < 4) return

  isDragging = true

  place = {
    top: Math.max(0, Math.min(dragStart.top + y, window.innerHeight - PENGUIN_HEIGHT)),
    left: Math.max(0, Math.min(dragStart.left + x, window.innerWidth - PENGUIN_WIDTH))
  }

  updatePenguin()
})

penguin.addEventListener('pointerup', () => {
  if (!dragStart) return

  dragStart = null

  if (isDragging) {
    void chrome.storage.local.set({ penguin: place })
  } else {
    void useExtensionMessage('open').send()
  }
})

penguin.addEventListener('pointercancel', () => {
  dragStart = null
})
