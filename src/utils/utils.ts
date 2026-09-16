import { ref } from "vue"
import { type ToastParams } from "./components"
import { globalLocalize } from "./localization"
import { useErrorToast } from "./toasts"

type ErrorToastText = Pick<ToastParams, "title" | "message">

// Message of whatever was thrown: an Error, a legacy SiteAPI rejection ({ error }), or anything else
function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message
  } else if (typeof error === "object" && error !== null && "error" in error && typeof error.error === "string") {
    return error.error
  } else {
    return String(error)
  }
}

/**
 * Runs `onSubmit` for a control the user submits, refusing a second call while one is in flight. Bind `isSubmitting` to the control, `:disabled="isSubmitting ? 'loading' : !isValid"`.
 *
 * @param onSubmit - The submission. Let a failure throw; work that must only happen on success goes at the end.
 * @param onError - Receives what `onSubmit` threw and returns the error toast's title and message. Without it, or when it returns nothing, a generic error toast is shown.
 */
export function useSubmit<TArguments extends unknown[]>(onSubmit: (...args: TArguments) => Promise<void>, onError?: (error: unknown) => ErrorToastText | undefined) {
  const isSubmitting = ref(false)

  async function submit(...args: TArguments) {
    if (isSubmitting.value) return

    isSubmitting.value = true

    try {
      await onSubmit(...args)
    } catch (error) {
      const text = onError?.(error) ?? { title: globalLocalize("dialog.warning.title"), message: getErrorMessage(error) }

      useErrorToast(text.title, text.message)
    } finally {
      isSubmitting.value = false
    }
  }

  return {
    submit,
    isSubmitting
  }
}
