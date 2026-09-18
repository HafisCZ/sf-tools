import { globalLocalize } from '@utils/localization'
import { Site } from '~/site/site'
import { FilterTypes, ScriptCommands, TableType, type ScriptCommand } from './commands'
import { Constants } from './constants'
import { Expression, ExpressionScope, type ExpressionEnvironment } from './expression'
import { type ScriptScope } from './script'

export class ScriptValidator {
  #entries = new Set<string>()

  deprecateCommand(line: number, deprecatedKey: string, deprecatedBy: string) {
    const name1 = ScriptCommands.get(deprecatedKey).syntax.encodedText
    const name2 = ScriptCommands.get(deprecatedBy).syntax.encodedText

    this.#entries.add(`<div class="ta-editor-info-line ta-editor-info-line-deprecated">${line}: ${globalLocalize('stats.scripts.info.deprecated', { name1, name2 })}</div>`)
  }

  string() {
    return Array.from(this.#entries).join('')
  }
}

export class ScriptParser {
  static handleMacros(string: string, scriptScope: ScriptScope) {
    let lines = string
      .split('\n')
      .map((line) => this.stripComments(line)[0].trim())
      .filter((line) => line.length)

    // Scope for macros
    const scope = new ExpressionScope()
      .addSelf(scriptScope.entries)
      .add({
        table: scriptScope.table
      })
      .add(Site.options.options)

    // Special constants for macros
    const constants = new Constants()
    constants.add('guild', TableType.Group)
    constants.add('guilds', TableType.Groups)
    constants.add('player', TableType.Player)
    constants.add('players', TableType.Players)

    // Generate initial settings
    let settings = this.handleMacroEnvironment(lines, scriptScope, constants)
    while (lines.some((line) => ScriptCommands.get('MACRO_IF').is(line) || ScriptCommands.get('MACRO_LOOP').is(line))) {
      lines = this.handleConditionals(lines, scriptScope, scope.environment(settings))
      settings = this.handleMacroEnvironment(lines, scriptScope, constants)
      lines = this.handleLoops(lines, scope.environment(settings))
      settings = this.handleMacroEnvironment(lines, scriptScope, constants)
    }

    return lines
  }

  static handleConditionals(lines: string[], scriptScope: ScriptScope, scope: ExpressionScope) {
    const output: string[] = []

    let condition = false
    let shouldDiscard: unknown = false

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i]

      if (ScriptCommands.get('MACRO_IF').is(line)) {
        let rule: ScriptCommand
        let ruleMustBeTrue = false

        if (ScriptCommands.get('MACRO_IFNOT').is(line)) {
          rule = ScriptCommands.get('MACRO_IFNOT')
          ruleMustBeTrue = true
        } else {
          rule = ScriptCommands.get('MACRO_IF')
        }

        const cond = rule.parseParams(line)[0].trim()
        if (cond in FilterTypes) {
          shouldDiscard = ruleMustBeTrue ? FilterTypes[cond] == scriptScope.table : FilterTypes[cond] != scriptScope.table
          condition = true
        } else {
          const condExpression = Expression.create(cond)
          if (condExpression) {
            const result = condExpression.eval(scope)
            shouldDiscard = ruleMustBeTrue ? result : !result
            condition = true
          }
        }
      } else if (ScriptCommands.get('MACRO_ELSEIF').is(line)) {
        if (condition) {
          if (shouldDiscard) {
            const cond = ScriptCommands.get('MACRO_ELSEIF').parseParams(line)[0].trim()
            if (cond in FilterTypes) {
              shouldDiscard = FilterTypes[cond] != scriptScope.table
            } else {
              const condExpression = Expression.create(cond)
              if (condExpression) {
                const result = condExpression.eval(scope)
                shouldDiscard = !result
              }
            }
          } else {
            shouldDiscard = true
          }
        }
      } else if (ScriptCommands.get('MACRO_ELSE').is(line)) {
        if (condition) {
          shouldDiscard = !shouldDiscard
        }
      } else if (ScriptCommands.get('MACRO_LOOP').is(line)) {
        let endsRequired = 1
        if (!shouldDiscard) {
          output.push(line)
        }

        while (++i < lines.length) {
          line = lines[i]

          if (ScriptCommands.get('MACRO_IF').is(line) || ScriptCommands.get('MACRO_LOOP').is(line)) {
            endsRequired++
            if (!shouldDiscard) {
              output.push(line)
            }
          } else if (ScriptCommands.get('MACRO_END').is(line)) {
            if (!shouldDiscard) {
              output.push(line)
            }

            if (--endsRequired == 0) break
          } else if (!shouldDiscard) {
            output.push(line)
          }
        }
      } else if (ScriptCommands.get('MACRO_END').is(line)) {
        shouldDiscard = false
        condition = false
      } else if (!shouldDiscard) {
        output.push(line)
      }
    }

    return output
  }

  static handleLoops(lines: string[], scope: ExpressionScope) {
    const output: string[] = []

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i]

      if (ScriptCommands.get('MACRO_LOOP').is(line)) {
        const [names, values] = ScriptCommands.get('MACRO_LOOP').parseParams(line)

        const variableNames = names.split(',').map((name) => name.trim())
        let variableValues: unknown[] = []

        const valuesExpression = Expression.create(values)
        if (valuesExpression) {
          const result = valuesExpression.eval(scope)
          if (!result) {
            variableValues = []
          } else if (!Array.isArray(result)) {
            if (typeof result == 'object') {
              variableValues = Object.values(result)
            } else {
              variableValues = [result]
            }
          } else {
            variableValues = result
          }
        }

        const loop: string[] = []

        let endsRequired = 1
        while (++i < lines.length) {
          line = lines[i]

          if (ScriptCommands.get('MACRO_END').is(line)) {
            if (--endsRequired == 0) break
          } else if (ScriptCommands.get('MACRO_IF').is(line) || ScriptCommands.get('MACRO_LOOP').is(line)) {
            endsRequired++
          }

          loop.push(line)
        }

        if (endsRequired != 0) {
          output.push(...loop)
        } else {
          for (const entry of variableValues) {
            const block: unknown[] = Array.isArray(entry) ? entry : [entry]

            const varArray = variableNames.map((key, index) => `var ${key} ${String(block[index])}`)
            const replacementArray = variableNames.map((key, index) => {
              return {
                regexp: new RegExp(`__${key}__`, 'g'),
                value: block[index]
              }
            })

            for (let loopLine of loop) {
              for (const { regexp, value } of replacementArray) {
                loopLine = loopLine.replace(regexp, String(value))
              }

              output.push(loopLine)

              if (/^(?:\w+(?:\,\w+)*:|)(?:header|embed|show|category)(?: .+)?$/.test(loopLine)) {
                output.push(...varArray)
              }
            }
          }
        }
      } else {
        output.push(line)
      }
    }

    return output
  }

  static handleMacroEnvironment(lines: string[], scriptScope: ScriptScope, constants: Constants) {
    const settings: ExpressionEnvironment & { theme: string } = {
      theme: 'light',
      functions: {},
      variables: {},
      constants,
      timestamp: scriptScope.timestamp,
      reference: scriptScope.reference
    }

    let is_unsafe = 0
    for (const line of lines) {
      if (ScriptCommands.get('MACRO_IF').is(line) || ScriptCommands.get('MACRO_LOOP').is(line)) {
        is_unsafe++
      } else if (ScriptCommands.get('MACRO_END').is(line)) {
        if (is_unsafe > 0) {
          is_unsafe--
        }
      } else if (is_unsafe == 0) {
        let command: ScriptCommand | undefined = undefined
        if ((command = ScriptCommands.pick(line, ['MACRO_FUNCTION', 'TABLE_FUNCTION']))) {
          const [name, variables, expression] = command.parseParams(line)
          const ast = Expression.create(expression)
          if (ast) {
            settings.functions[name] = {
              ast: ast,
              args: variables.split(',').map((v) => v.trim())
            }
          }
        } else if ((command = ScriptCommands.pick(line, ['MACRO_VARIABLE', 'VARIABLE_LOCAL', 'VARIABLE_TABLE', 'VARIABLE_TABLE_SHORT', 'VARIABLE_TABLE_LONG', 'VARIABLE_GLOBAL', 'VARIABLE_GLOBAL_SHORT']))) {
          const [name, expression] = command.parseParams(line)
          const ast = Expression.create(expression)
          if (ast) {
            settings.variables[name] = {
              ast: ast,
              type: command.key === 'VARIABLE_LOCAL' ? 'local' : ['VARIABLE_TABLE', 'VARIABLE_TABLE_SHORT', 'VARIABLE_TABLE_LONG'].includes(command.key) ? 'table' : 'global'
            }
          }
        } else if (ScriptCommands.get('TABLE_GLOBAL_THEME').is(line)) {
          const [value] = ScriptCommands.get('TABLE_GLOBAL_THEME').parseParams(line)
          settings.theme = value
        } else if (ScriptCommands.get('MACRO_CONST').is(line)) {
          const [name, value] = ScriptCommands.get('MACRO_CONST').parseParams(line)
          settings.constants.add(name, value)
        } else if (ScriptCommands.get('MACRO_CONSTEXPR').is(line)) {
          const [name, expression] = ScriptCommands.get('MACRO_CONSTEXPR').parseParams(line)

          const ast = Expression.create(expression)
          if (ast) {
            settings.constants.add(name, ast.eval(new ExpressionScope(settings)))
          }
        }
      }
    }

    return settings
  }

  static checkEscapeTrail(line: string, index: number) {
    if (line[index - 1] != '\\') {
      return false
    } else {
      let escape = true
      for (let i = index - 2; i >= 0 && line[i] == '\\'; i--) {
        escape = !escape
      }

      return escape
    }
  }

  static stripComments(line: string, escape = true): [line: string, comment: string | undefined, commentIndex: number] {
    let comment: string | undefined
    let commentIndex = -1

    let ignored: string | false = false
    for (let i = 0; i < line.length; i++) {
      if (line[i] == "'" || line[i] == '"' || line[i] == '`') {
        if (line[i - 1] == '\\' || (ignored && line[i] != ignored)) continue
        else {
          ignored = ignored ? false : line[i]
        }
      } else if (!this.checkEscapeTrail(line, i) && line[i] == '#' && !ignored) {
        commentIndex = i
        break
      }
    }

    if (commentIndex != -1) {
      comment = line.slice(commentIndex)
      line = line.slice(0, commentIndex)

      if (escape) {
        line = line.replaceAll(/\\(\\|#)/g, (_, capture: string) => {
          commentIndex -= 1
          return capture
        })
      }
    } else if (escape) {
      line = line.replaceAll(/\\(\\|#)/g, (_, capture: string) => capture)
    }

    return [line, comment, commentIndex]
  }
}
