import { readonly, ref, shallowRef } from 'vue'

// Same locales as Localization in js/views/base.js, keep in sync
export const LOCALES: Record<string, string> = {
  en: 'English',
  de: 'Deutsch',
  pl: 'Polski',
  pt: 'Português',
  cs: 'Česky',
  fr: 'Français',
  it: 'Italiano',
  es: 'Español',
  hu: 'Magyar',
  ch: 'Schwyzerdüütsch'
}

// Same extra translation files as the DOMContentLoaded handler in js/views/base.js
const INJECTIONS: Record<string, [string, string]> = {
  translations_general: ['/js/playa/lang/{{locale}}/general.json', 'general'],
  translations_monsters: ['/js/playa/lang/{{locale}}/monsters.json', 'monsters'],
  translations_items: ['/js/playa/lang/{{locale}}/items.json', 'items']
}

type TranslationTree = {
  [key: string]: string | TranslationTree
}

type LocalizationVariables = Record<string, unknown>

type LocalizeFunction = ((key: string, variables?: LocalizationVariables) => string) & {
  global: typeof globalLocalize
}

const locale = ref(Site.options.locale || 'en')

// Reactive, so every localize() call made while rendering updates when the language changes
const translation = shallowRef<Record<string, string>>({})

// Extra translation files the page asked for, loaded again for every language
let requiredInjections: string[] = []

// Language of the latest setLocale call, so a slower earlier request can't overwrite it
let requestedLocale = ''

/**
 * Language currently shown
 */
export const currentLocale = readonly(locale)

function flatten(base: Record<string, string>, tree: TranslationTree, ...path: string[]) {
  for (const [key, value] of Object.entries(tree)) {
    if (typeof value === 'object') {
      flatten(base, value, ...path, key)
    } else {
      base[`${path.join('.')}.${key}`] = value
    }
  }

  return base
}

async function fetchTranslation(value: string, url: string, ...path: string[]) {
  if (!Object.hasOwn(LOCALES, value)) {
    return {}
  }

  const response = await fetch(url.replace('{{locale}}', value))
  const tree: TranslationTree = await response.json()

  return flatten({}, tree, ...path)
}

async function fetchTranslations(value: string) {
  const translations = await fetchTranslation(value, '/js/lang/{{locale}}.json')

  for (const name of requiredInjections) {
    if (Object.hasOwn(INJECTIONS, name)) {
      const [url, prefix] = INJECTIONS[name]

      Object.assign(translations, await fetchTranslation(value, url, prefix))
    }
  }

  return translations
}

/**
 * Loads the translations of the current language, plus the extra translation files named in `requires`
 */
export async function loadTranslations(requires: string[] = []) {
  requiredInjections = requires

  translation.value = await fetchTranslations(locale.value)
}

/**
 * Switches the language in place: saves it for legacy pages too, loads its translations, then updates every localized string
 */
export async function setLocale(value: string) {
  requestedLocale = value

  Site.options.locale = value

  const translations = await fetchTranslations(value)

  if (requestedLocale === value) {
    translation.value = translations
    locale.value = value
  }
}

/**
 * Translates a key given as its full path, such as `dialog.shared.continue`
 */
export function globalLocalize(key: string, variables?: LocalizationVariables) {
  let value = translation.value[key]

  if (!value) {
    Logger.log('IN_WARN', `Translation key ${key} not found!`)

    return key
  }

  if (variables) {
    for (const [name, variable] of Object.entries(variables)) {
      value = value.replace(`#{${name}}`, () => String(variable))
    }
  }

  return value
}

/**
 * Creates a localization function for keys inside `namespace`
 *
 * @example
 * const localize = useLocalize('dialog.changelog')
 * localize('release') // "Release"
 * localize.global('dialog.shared.continue') // "Continue"
 */
export function useLocalize(namespace: string): LocalizeFunction {
  return Object.assign((key: string, variables?: LocalizationVariables) => globalLocalize(`${namespace}.${key}`, variables), { global: globalLocalize })
}
