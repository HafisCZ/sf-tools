import { escapeHtml } from '@utils/utils'
import { type ExpressionConfig } from './expression-config'
import { ExpressionRenderer, type ExpressionRoot } from './expression'

export type HighlighterMethod = 'keyword' | 'deprecatedKeyword' | 'constant' | 'function' | 'operator' | 'value' | 'identifier' | 'error' | 'floatError' | 'comment' | 'string' | 'enum' | 'variable' | 'header' | 'normal'

export class Highlighter {
  static #text = ''

  static #escape(text: unknown) {
    return escapeHtml(String(text))
  }

  static keyword(text: string) {
    this.#text += `<span class="ta-keyword">${this.#escape(text)}</span>`
    return this
  }

  static deprecatedKeyword(text: string) {
    this.#text += `<span class="ta-keyword ta-deprecated">${this.#escape(text)}</span>`
    return this
  }

  static constant(text: string) {
    this.#text += `<span class="ta-constant">${this.#escape(text)}</span>`
    return this
  }

  static function(text: string) {
    this.#text += `<span class="ta-function">${this.#escape(text)}</span>`
    return this
  }

  static operator(text: string) {
    this.#text += `<span class="ta-operator">${this.#escape(text)}</span>`
    return this
  }

  static value(text: string) {
    this.#text += `<span class="ta-value">${this.#escape(text)}</span>`
    return this
  }

  static identifier(text: string) {
    this.#text += `<span class="ta-identifier">${this.#escape(text)}</span>`
    return this
  }

  static error(text: string, colorText = false) {
    this.#text += `<span class="${colorText ? 'ta-error-color' : 'ta-error'}">${this.#escape(text)}</span>`
    return this
  }

  static floatError(text: string) {
    this.#text += `<span class="ta-error-float" data-content="${this.#escape(text)}"></span>`
    return this
  }

  static comment(text: string | undefined) {
    this.#text += `<span class="ta-comment">${this.#escape(text)}</span>`
    return this
  }

  static string(text: string) {
    this.#text += `<span class="ta-string">${this.#escape(text)}</span>`
    return this
  }

  static enum(text: string) {
    this.#text += `<span class="ta-enum">${this.#escape(text)}</span>`
    return this
  }

  static variable(text: string, subtype = '') {
    this.#text += `<span class="ta-variable-${subtype}">${this.#escape(text)}</span>`
    return this
  }

  static header(text: string, subtype = 'public') {
    this.#text += `<span class="ta-reserved-${subtype}">${this.#escape(text)}</span>`
    return this
  }

  static asMacro() {
    this.#text = `<span class="ta-macro">${this.#text}</span>`
    return this
  }

  static expression(text: string, root?: ExpressionRoot, config?: ExpressionConfig) {
    ExpressionRenderer.render(this, text, root, config)
    return this
  }

  static join(array: string[], method: HighlighterMethod | ((item: string) => HighlighterMethod), delimiter = ',') {
    for (let i = 0; i < array.length; i++) {
      if (typeof method === 'function') {
        this[method(array[i])](array[i])
      } else {
        this[method](array[i])
      }

      if (i < array.length - 1) {
        this.#text += delimiter
      }
    }

    return this
  }

  static color(text: string, color: string | undefined) {
    this.#text += `<span class="ta-color" style="color: ${color};">${this.#escape(text)}</span>`
    return this
  }

  static boolean(text: string, isTrue: boolean) {
    this.#text += `<span class="ta-${isTrue ? 'true' : 'false'}">${this.#escape(text)}</span>`
    return this
  }

  static normal(text: string) {
    this.#text += this.#escape(text)
    return this
  }

  static space(size = 1) {
    this.#text += ' '.repeat(size)
    return this
  }

  static get text() {
    const text = this.#text
    this.#text = ''
    return text
  }
}
