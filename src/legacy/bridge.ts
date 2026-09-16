import { useLoader } from '@utils/loader'
import { globalLocalize } from '@utils/localization'
import { useToast } from '@utils/toasts'

const loader = useLoader()

Object.assign(window, {
  intl: globalLocalize,
  Toast: {
    info: (title: string, message: string) => useToast({ title, message }),
    warn: (title: string, message: string) => useToast({ title, message, type: 'warning' }),
    error: (title: string, message: string) => useToast({ title, message, type: 'error' })
  },
  Loader: {
    toggle: (open: boolean, options?: { progress?: boolean }) => (open ? loader.start(options) : loader.stop()),
    progress: (value: number) => loader.progress(value)
  }
})
