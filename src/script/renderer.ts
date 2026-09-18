import { ScriptCommands, ScriptType } from './commands'
import { Highlighter } from './highlighter'
import { ScriptParser, ScriptValidator } from './parser'
import { Script } from './script'

export class ScriptRenderer {
  static render(string: string, scriptType: ScriptType = ScriptType.Table) {
    const settings = new Script('', scriptType)
    const validator = new ScriptValidator()

    for (const line of ScriptParser.handleMacros(string, {})) {
      const trimmed = ScriptParser.stripComments(line)[0].trim()
      const command = ScriptCommands.find((command) => !command.metadata.evalNever && command.metadata.evalOnRender && command.type & scriptType && command.is(trimmed))

      if (command) {
        command.eval(settings, trimmed)
      }
    }

    let content = ''

    const lines = string.split('\n')
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]

      const [commandLine, comment, commentIndex] = ScriptParser.stripComments(line, false)
      const [, prefix, trimmed, suffix] = commandLine.match(/^(\s*)(\S(?:.*\S)?)?(\s*)$/) as RegExpMatchArray

      let currentLine = prefix.replace(/ /g, '&nbsp;')

      if (trimmed) {
        const command = ScriptCommands.find((command) => command.type & scriptType && command.is(trimmed))

        if (command) {
          currentLine += command.format(settings, trimmed).text

          if (command.metadata.isDeprecated) {
            validator.deprecateCommand(i + 1, command.key, command.metadata.isDeprecated)
          }

          command.validate(validator, settings, i + 1, trimmed)
        } else {
          currentLine += Highlighter.error(trimmed).text
        }
      }

      currentLine += suffix.replace(/ /g, '&nbsp;')
      if (commentIndex != -1) {
        currentLine += Highlighter.comment(comment).text
      }

      content += `<div class="ta-editor-overlay-line">${currentLine || '&nbsp;'}</div>`
    }

    return {
      html: `<div class="ta-editor-overlay-page">${content}</div>`,
      info: validator.string()
    }
  }
}
