export const FIELD_L = '‹'
export const FIELD_R = '›'

export const FIELD_REGEXP = /‹|›/g

export function wrapFields(content: string, all = false) {
  if (all) {
    return content.replace(/<([a-z |]+)>|\(([a-z |]+)\)/g, `${FIELD_L}$1$2${FIELD_R}`)
  } else {
    return content.replace(/<([a-z |]+)>/g, `${FIELD_L}$1${FIELD_R}`)
  }
}
