// Font Awesome Free icons (https://fontawesome.com/license/free), each imported from its own file so the rest of the set stays out of the bundle
import { faDiscord } from '@fortawesome/free-brands-svg-icons/faDiscord'
import { faCopyright } from '@fortawesome/free-regular-svg-icons/faCopyright'
import { faBasketShopping } from '@fortawesome/free-solid-svg-icons/faBasketShopping'
import { faChevronDown } from '@fortawesome/free-solid-svg-icons/faChevronDown'
import { faCircleCheck } from '@fortawesome/free-solid-svg-icons/faCircleCheck'
import { faCircleExclamation } from '@fortawesome/free-solid-svg-icons/faCircleExclamation'
import { faEnvelope } from '@fortawesome/free-solid-svg-icons/faEnvelope'
import { faLanguage } from '@fortawesome/free-solid-svg-icons/faLanguage'
import { faMessage } from '@fortawesome/free-solid-svg-icons/faMessage'
import { faScrewdriverWrench } from '@fortawesome/free-solid-svg-icons/faScrewdriverWrench'
import { faSpinner } from '@fortawesome/free-solid-svg-icons/faSpinner'
import { faTriangleExclamation } from '@fortawesome/free-solid-svg-icons/faTriangleExclamation'
import { faTrophy } from '@fortawesome/free-solid-svg-icons/faTrophy'

export const ICONS = {
  'basket-shopping': faBasketShopping,
  'chevron-down': faChevronDown,
  'circle-check': faCircleCheck,
  'circle-exclamation': faCircleExclamation,
  copyright: faCopyright,
  discord: faDiscord,
  envelope: faEnvelope,
  language: faLanguage,
  message: faMessage,
  'screwdriver-wrench': faScrewdriverWrench,
  spinner: faSpinner,
  'triangle-exclamation': faTriangleExclamation,
  trophy: faTrophy
}

export type IconName = keyof typeof ICONS
