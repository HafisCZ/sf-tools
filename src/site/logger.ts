const COLORS: Record<string, string> = {
  STORAGE: 'fcba03',
  WARNING: 'fc6203',
  OPTIONS: '42adf5',
  TAB_GEN: '3bc922',
  PERFLOG: 'ffffff',
  ECLIENT: 'd142f5',
  TRACKER: 'c8f542',
  ACTIONS: 'eb73c3',
  IN_WARN: 'ebd883',
  APPINFO: 'd29af8',
  MESSAGE: 'ffffff',
  APICALL: 'd99ab5',
  CHANNEL: 'fccb81',
  STDEBUG: 'c5d3e8'
}

export class Logger {
  static log(type: string, text: string) {
    console.log(`%c${type}%c${text}`, `background-color: #${COLORS[type] || 'ffffff'}; padding: 0.5em; font-size: 15px; font-weight: bold; color: black;`, 'padding: 0.5em; font-size: 15px;')
  }

  static error(error: unknown, text: string) {
    this.log('WARNING', text)
    console.error(error)
  }
}
