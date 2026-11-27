import { useWindowMessage } from '../../src/utils/extension'

const hookMessage = useWindowMessage('sftools-hook')

async function report(response: Response) {
  try {
    const text = await response.text()

    hookMessage.send({ url: response.url, text })
  } catch {
    // The game reads its own copy, a failed read here changes nothing for it
  }
}

window.fetch = new Proxy(window.fetch, {
  async apply(target, self, parameters: Parameters<typeof fetch>) {
    const response = await target.apply(self, parameters)

    if (/^https:\/\/[^/]+\.sfgame\.[a-z]+\/(cmd|req)\.php/.test(response.url)) {
      void report(response.clone())
    }

    return response
  }
})
