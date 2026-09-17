// Font Awesome Free icons (https://fontawesome.com/license/free), each imported from its own file so the rest of the set stays out of the bundle
import { faDiscord } from '@fortawesome/free-brands-svg-icons/faDiscord'
import { faClock } from '@fortawesome/free-regular-svg-icons/faClock'
import { faCopyright } from '@fortawesome/free-regular-svg-icons/faCopyright'
import { faTrashCan } from '@fortawesome/free-regular-svg-icons/faTrashCan'
import { faBasketShopping } from '@fortawesome/free-solid-svg-icons/faBasketShopping'
import { faCheck } from '@fortawesome/free-solid-svg-icons/faCheck'
import { faChevronDown } from '@fortawesome/free-solid-svg-icons/faChevronDown'
import { faCircleCheck } from '@fortawesome/free-solid-svg-icons/faCircleCheck'
import { faCircleExclamation } from '@fortawesome/free-solid-svg-icons/faCircleExclamation'
import { faCircleUser } from '@fortawesome/free-solid-svg-icons/faCircleUser'
import { faDragon } from '@fortawesome/free-solid-svg-icons/faDragon'
import { faEnvelope } from '@fortawesome/free-solid-svg-icons/faEnvelope'
import { faExclamation } from '@fortawesome/free-solid-svg-icons/faExclamation'
import { faEyeSlash } from '@fortawesome/free-solid-svg-icons/faEyeSlash'
import { faFish } from '@fortawesome/free-solid-svg-icons/faFish'
import { faFloppyDisk } from '@fortawesome/free-solid-svg-icons/faFloppyDisk'
import { faFrog } from '@fortawesome/free-solid-svg-icons/faFrog'
import { faGear } from '@fortawesome/free-solid-svg-icons/faGear'
import { faHatWizard } from '@fortawesome/free-solid-svg-icons/faHatWizard'
import { faHorse } from '@fortawesome/free-solid-svg-icons/faHorse'
import { faLanguage } from '@fortawesome/free-solid-svg-icons/faLanguage'
import { faLock } from '@fortawesome/free-solid-svg-icons/faLock'
import { faMessage } from '@fortawesome/free-solid-svg-icons/faMessage'
import { faMoon } from '@fortawesome/free-solid-svg-icons/faMoon'
import { faPlus } from '@fortawesome/free-solid-svg-icons/faPlus'
import { faRecycle } from '@fortawesome/free-solid-svg-icons/faRecycle'
import { faRightToBracket } from '@fortawesome/free-solid-svg-icons/faRightToBracket'
import { faRotate } from '@fortawesome/free-solid-svg-icons/faRotate'
import { faScrewdriverWrench } from '@fortawesome/free-solid-svg-icons/faScrewdriverWrench'
import { faSpinner } from '@fortawesome/free-solid-svg-icons/faSpinner'
import { faStopwatch } from '@fortawesome/free-solid-svg-icons/faStopwatch'
import { faSun } from '@fortawesome/free-solid-svg-icons/faSun'
import { faThumbsUp } from '@fortawesome/free-solid-svg-icons/faThumbsUp'
import { faTriangleExclamation } from '@fortawesome/free-solid-svg-icons/faTriangleExclamation'
import { faTrophy } from '@fortawesome/free-solid-svg-icons/faTrophy'
import { faUserLock } from '@fortawesome/free-solid-svg-icons/faUserLock'
import { faWallet } from '@fortawesome/free-solid-svg-icons/faWallet'
import { faXmark } from '@fortawesome/free-solid-svg-icons/faXmark'

export const ICONS = {
  'basket-shopping': faBasketShopping,
  check: faCheck,
  'chevron-down': faChevronDown,
  'circle-check': faCircleCheck,
  'circle-exclamation': faCircleExclamation,
  'circle-user': faCircleUser,
  clock: faClock,
  copyright: faCopyright,
  discord: faDiscord,
  dragon: faDragon,
  envelope: faEnvelope,
  exclamation: faExclamation,
  'eye-slash': faEyeSlash,
  fish: faFish,
  'floppy-disk': faFloppyDisk,
  frog: faFrog,
  gear: faGear,
  'hat-wizard': faHatWizard,
  horse: faHorse,
  language: faLanguage,
  lock: faLock,
  message: faMessage,
  moon: faMoon,
  plus: faPlus,
  recycle: faRecycle,
  'right-to-bracket': faRightToBracket,
  rotate: faRotate,
  'screwdriver-wrench': faScrewdriverWrench,
  spinner: faSpinner,
  stopwatch: faStopwatch,
  sun: faSun,
  'thumbs-up': faThumbsUp,
  'trash-can': faTrashCan,
  'triangle-exclamation': faTriangleExclamation,
  trophy: faTrophy,
  'user-lock': faUserLock,
  wallet: faWallet,
  xmark: faXmark
}

export type IconName = keyof typeof ICONS
