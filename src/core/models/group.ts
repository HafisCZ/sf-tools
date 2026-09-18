import { formatPrefix } from '@utils/formatting'
import { sum } from '@utils/utils'
import { ComplexDataType } from '~/data/complex-data-type'
import { PlayaResponse } from '~/data/playa-response'
import { type RawGroup } from '~/data/types'

export const GUILD_ROLE_NONE = 0
export const GUILD_ROLE_LEADER = 1
export const GUILD_ROLE_OFFICER = 2
export const GUILD_ROLE_MEMBER = 3
export const GUILD_ROLE_INVITED = 4

export type GroupMemberActions = {
  Hydra: boolean
  Attack: boolean
  Defense: boolean
  Raid: boolean
}

export type GroupMember = {
  Role: number
  Level: number
  Knights: number | undefined
  Treasure: number
  Instructor: number
  Pet: number
  LastActive: number
  Name: string
  State: number
  Actions: GroupMemberActions
  Identifier: string
  LinkId?: string
}

export class GroupModel {
  static PET_CLASSES = [
    2, 0, 0, 1, 1, 1, 2, 2, 2, 0, 1, 1, 2, 2, 0, 0, 1, 0, 0, 2, 0, 0, 1, 1, 2, 2, 1, 0, 0, 1, 1, 2, 2, 1, 1, 0, 0, 0, 1, 2, 0, 0, 2, 2, 0, 2, 1, 1, 0, 0, 2, 0, 2, 2, 1, 1, 1, 0, 0, 0, 2, 2, 0, 1, 1, 2, 2, 1, 0, 1, 1, 2, 2, 2, 2, 2, 1, 0, 1, 0, 1, 0, 0, 0, 0, 2, 0, 2, 2, 0, 1, 1, 1, 0, 1, 1, 0, 1, 0, 2
  ]

  declare Data: RawGroup
  declare Prefix: string
  declare ID: number
  declare Identifier: string
  declare LinkId: string
  declare Name: string
  declare Rank: number
  declare Own: boolean | number
  declare Timestamp: number
  declare MembersPresent: number
  declare Honor: number
  declare PetID: number
  declare Pet: number
  declare Hydra: number
  declare HydraMax: number
  declare PetClass: number | undefined
  declare PetStrength: number
  declare PetDexterity: number
  declare PetIntelligence: number
  declare PetConstitution: number
  declare PetLuck: number
  declare PortalLife: number
  declare PortalPercent: number
  declare PortalFloor: number
  declare Raid: number
  declare Members: string[]
  declare States: number[]
  declare Levels: number[]
  declare Roles: number[]
  declare LastActives: number[]
  declare Names: string[]
  declare IsUnderAttack: boolean
  declare IsUnderAttackID: number
  declare IsAttacking: boolean
  declare IsAttackingID: number
  declare Treasures: number[]
  declare Instructors: number[]
  declare Pets: number[]
  declare MemberActions: GroupMemberActions[]
  declare Knights?: number[]
  declare MembersTotal: number
  declare TotalKnights: number
  declare TotalKnights15: number
  declare TotalInstructor: number
  declare TotalTreasure: number
  declare GroupTournament?: { Rank: number | undefined; Tokens: number | undefined }
  declare Players: GroupMember[]
  declare Description: string | undefined

  constructor(data: RawGroup) {
    this.Data = data

    this.Prefix = formatPrefix(data.prefix)
    this.ID = data.save[0]
    this.Identifier = data.prefix + '_g' + this.ID

    this.Name = data.name
    this.Rank = data.rank
    this.Own = data.own
    this.Timestamp = data.timestamp

    this.MembersPresent = 0

    this.Honor = data.save[13]
    this.PetID = data.save[377]
    this.Pet = data.save[378]
    this.Hydra = data.save[379]
    this.HydraMax = data.save[380]

    this.PetClass = this.PetID ? GroupModel.PET_CLASSES[this.PetID - 1] + 1 : undefined
    this.PetStrength = data.save[385]
    this.PetDexterity = data.save[386]
    this.PetIntelligence = data.save[387]
    this.PetConstitution = data.save[388]
    this.PetLuck = data.save[389]

    const dataType = new ComplexDataType(data.save.slice(4, 9))
    dataType.short()
    this.PortalLife = dataType.short()
    dataType.short()
    this.PortalLife += dataType.short() * 65536
    dataType.short()
    this.PortalPercent = dataType.short()
    dataType.short()
    this.PortalFloor = dataType.short()
    this.Raid = dataType.long()

    this.Members = data.save.slice(14, 64).map((mid) => data.prefix + '_p' + mid)
    this.States = data.save.slice(64, 114).map((level) => Math.trunc(level / 1000))
    this.Levels = data.save.slice(64, 114).map((level) => level % 1000)
    this.Roles = data.save.slice(314, 364)
    this.LastActives = data.save.slice(114, 164).map((ts) => parseInt(String(ts)) * 1000 + data.offset)
    this.Names = data.names

    this.IsUnderAttack = data.save[364] > 0
    this.IsUnderAttackID = data.save[364]
    this.IsAttacking = data.save[366] > 0
    this.IsAttackingID = data.save[366]

    this.Treasures = data.save.slice(214, 264)
    this.Instructors = data.save.slice(264, 314)
    this.Pets = data.save.slice(390, 440)

    this.MemberActions = (data.save.length >= 502 ? data.save.slice(445, 495) : Array.from<undefined>({ length: 50 })).map((value, index) => {
      const valueLegacy = this.States[index]

      if (typeof value === 'number') {
        return {
          Hydra: Math.trunc(value / 100) === 1,
          Attack: Math.trunc((value % 100) / 10) === 1,
          Defense: Math.trunc(value % 10) === 1,
          Raid: valueLegacy === 3
        }
      } else {
        return {
          Hydra: false,
          Attack: valueLegacy === 1,
          Defense: valueLegacy === 2,
          Raid: valueLegacy === 3
        }
      }
    })

    if (data.knights) {
      this.Knights = data.knights.slice(0, 50)
    }

    for (let i = 0; i < this.Members.length; i++) {
      if (this.Roles[i] == 0 || this.Roles[i] == GUILD_ROLE_INVITED) {
        if (this.Knights) {
          this.Knights.splice(i, 1)
        }

        this.Roles.splice(i, 1)
        this.Treasures.splice(i, 1)
        this.Instructors.splice(i, 1)
        this.Pets.splice(i, 1)
        this.States.splice(i, 1)
        this.Names.splice(i, 1)
        this.LastActives.splice(i, 1)
        this.MemberActions.splice(i, 1)
        this.Members.splice(i--, 1)
      }
    }

    this.MembersTotal = this.Members.length
    this.TotalKnights = data.save[370]
    this.TotalKnights15 = data.save[371]
    this.TotalInstructor = Math.trunc(Math.min(sum(this.Instructors), 500) / 5)
    this.TotalTreasure = Math.trunc(Math.min(sum(this.Treasures), 500) / 5)

    if (data.gtsave) {
      this.GroupTournament = {
        Rank: data.gtsave.rank,
        Tokens: data.gtsave.tokens
      }
    }

    this.Players = this.Members.map((id, i) => ({
      Role: this.Roles[i],
      Level: this.Levels[i],
      Knights: this.Knights?.[i],
      Treasure: this.Treasures[i],
      Instructor: this.Instructors[i],
      Pet: this.Pets[i],
      LastActive: this.LastActives[i],
      Name: this.Names[i],
      State: this.States[i],
      Actions: this.MemberActions[i],
      Identifier: id
    }))

    this.Description = PlayaResponse.unescape(data.description)
  }
}
