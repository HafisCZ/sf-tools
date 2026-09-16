import { type Component } from "vue"
import { setCoveredElementsAsInert, unsetCoveredElementsAsInert } from "./interactions"
import { createVueApp } from "./vue"

type ComponentProps<TComponent> = TComponent extends abstract new (...args: never[]) => {
  $props: infer TProps
}
  ? TProps
  : Record<string, unknown>

type CloseParameters<TComponent> = ComponentProps<TComponent> extends { onClose?: (...args: infer TParameters) => unknown } ? TParameters : []

let queue = Promise.resolve()

/**
 * Opens a dialog component whose root is `SFDialog` and which emits `close`.
 * Dialogs are queued: each one opens after the previous one has closed.
 *
 * @param component - Dialog component, mounted as its own application on `document.body`
 * @param props - Props passed to the dialog component
 * @param options.callback - Called after the dialog closes, with the arguments of its `close` event
 * @param options.immediate - Opens the dialog right away, on top of any open dialog, instead of queueing it
 */
export function useDialog<TComponent extends Component>(
  component: TComponent,
  props: Omit<ComponentProps<TComponent>, "onClose">,
  options: {
    callback?: (...params: CloseParameters<TComponent>) => void
    immediate?: boolean
  } = {}
) {
  function open() {
    return new Promise<void>((resolve) => {
      const element = document.createElement("div")
      element.setAttribute("data-content-container", "")
      element.className = "relative z-[1000]"

      setCoveredElementsAsInert()

      // Appended before mounting so the dialog can take focus when it mounts
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
