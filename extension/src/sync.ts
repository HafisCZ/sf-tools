import { useWindowMessage, type GameData } from '../../src/utils/extension'
import { useExtensionMessage } from './messages'

if (new URLSearchParams(window.location.search).has('sync')) {
  const pageMessage = useWindowMessage('sftools-extension')
  const readMessage = useExtensionMessage('read')

  function forward(data: GameData | null | undefined) {
    if (data) {
      pageMessage.send(data)
    }
  }

  useWindowMessage('sftools-dungeons').receive(() => {
    void readMessage.send().then(forward)
  })

  useExtensionMessage('game').receive(forward)
}
