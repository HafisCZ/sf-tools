import { type SimulatorPet } from '~/sim/workers/pets'

// Index is the pet type, colours of the calendar pet cards
export const PET_ELEMENTS = [
  { color: '#a596ce', text: 'text-[#a596ce]' },
  { color: '#e9d067', text: 'text-[#e9d067]' },
  { color: '#adc35a', text: 'text-[#adc35a]' },
  { color: '#fda700', text: 'text-[#fda700]' },
  { color: '#60cdef', text: 'text-[#60cdef]' }
]

export function getMonsterId({ Type, Pet }: Pick<SimulatorPet, 'Type' | 'Pet'>) {
  return 800 + 20 * Type + Pet
}

export function getPetImageUrl(pet: Pick<SimulatorPet, 'Type' | 'Pet'>) {
  return `/res/pets/monster${getMonsterId(pet)}.png` as const
}

export function formatPetChance(chance: number) {
  return `${chance.toFixed(chance < 0.01 ? 5 : 2)}%`
}
