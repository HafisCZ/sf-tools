import { type Component } from 'vue'
import SFSimpleDialog from '@library/SFSimpleDialog.vue'
import { setCoveredElementsAsInert, unsetCoveredElementsAsInert } from './interactions'
import { createVueApp } from './vue'

type ComponentProps<TComponent> = TComponent extends abstract new (...args: never[]) => {
  $props: infer TProps
}
  ? TProps
  : Record<string, unknown>

type CloseParameters<TComponent> = ComponentProps<TComponent> extends { onClose?: (...args: infer TParameters) => unknown } ? TParameters : []

let queue = Promise.resolve()

export function useDialog<TComponent extends Component>(
  component: TComponent,
  props: Omit<ComponentProps<TComponent>, 'onClose'>,
  options: {
    callback?: (...params: CloseParameters<TComponent>) => void
    immediate?: boolean
  } = {}
) {
  function open() {
    return new Promise<void>((resolve) => {
      const element = document.createElement('div')
      element.setAttribute('data-content-container', '')
      element.className = 'relative z-[1000]'

      setCoveredElementsAsInert()

      // Appended before mounting, so the dialog can take focus
      document.body.append(element)

      const app = createVueApp(component, {
        ...props,
        onClose: (...params: CloseParameters<TComponent>) => {
          app.unmount()
          element.remove()

          unsetCoveredElementsAsInert()

          options.callback?.(...params)

          resolve()
        }
      })

      app.mount(element)
    })
  }

  if (options.immediate) {
    void open()
  } else {
    queue = queue.then(open)
  }
}

export function useSimpleDialog(
  props: {
    title: string
    message: string
  },
  options: {
    onAccept?: () => void | Promise<void>
    onReject?: () => void | Promise<void>
    callback?: (accepted: boolean) => void
  } = {}
) {
  useDialog(
    SFSimpleDialog,
    {
      ...props,
      action: async (accepted: boolean) => {
        await (accepted ? options.onAccept : options.onReject)?.()
      }
    },
    { callback: options.callback }
  )
}

export function useFilePicker(options: { accept?: string; multiple?: boolean; callback: (files: File[]) => void }) {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = options.accept ?? ''
  input.multiple = options.multiple ?? false

  input.addEventListener(
    'change',
    () => {
      const files = Array.from(input.files ?? [])

      if (files.length > 0) {
        options.callback(files)
      }
    },
    { once: true }
  )

  input.click()
}
