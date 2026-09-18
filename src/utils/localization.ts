import { readonly, ref, shallowRef } from 'vue'

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

const translation = shallowRef<Record<string, string>>({})

let requiredInjections: string[] = []

// Keeps a slower earlier setLocale request from overwriting a newer one
let requestedLocale = ''

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

export async function loadTranslations(requires: string[] = []) {
  requiredInjections = requires

  translation.value = await fetchTranslations(locale.value)
}

export async function setLocale(value: string) {
  requestedLocale = value

  Site.options.locale = value

  const translations = await fetchTranslations(value)

  if (requestedLocale === value) {
    translation.value = translations
    locale.value = value
  }
}

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

export function hasTranslation(key: string) {
  return Boolean(translation.value[key])
}

export function useLocalize(namespace: string): LocalizeFunction {
  return Object.assign((key: string, variables?: LocalizationVariables) => globalLocalize(`${namespace}.${key}`, variables), { global: globalLocalize })
}
