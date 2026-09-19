type Attribute = MainAttribute | 'Constitution' | 'Luck'

type CharacterClass = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12

type MainAttribute = 'Strength' | 'Dexterity' | 'Intelligence'

declare const WorkerGlobalScope: abstract new () => object

// Version 1.1.4 can't read oklch(), oklab() or color-mix() colours
declare function html2canvas(element: HTMLElement, options?: { logging?: boolean; backgroundColor?: string | null; allowTaint?: boolean; useCORS?: boolean; onclone?: (document: Document) => void }): Promise<HTMLCanvasElement>
