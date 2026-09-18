import { formatDate } from '@utils/formatting'
import { filterInPlace, isEmpty, pushUnique, toArray } from '@utils/utils'
import { DatabaseManager } from '~/data/database-manager'
import { GroupModel } from '~/data/group-model'
import { PlayerModel } from '~/data/player-model'
import { type RawGroup, type RawPlayer } from '~/data/types'
import { Logger } from '~/site/logger'
import { Store } from '~/site/store'
import { ScriptType } from './commands'
import { DefaultScripts } from './default-scripts'
import { ExpressionScope } from './expression'
import { TABLE_EXPRESSION_CONFIG, type ExpressionConfig } from './expression-config'
import { Script, type ScriptAction, type ScriptTracker } from './script'

export class Actions {
  static #script: string
  static #defaultScript: string

  static #instance: Script
  static #actions: ScriptAction[]
  static #trackers: Record<string, ScriptTracker>

  static #expressionConfig: ExpressionConfig | undefined

  static get EXPRESSION_CONFIG() {
    if (this.#expressionConfig === undefined) {
      const config = TABLE_EXPRESSION_CONFIG.clone()
      for (const name of ['players', 'groups']) {
        config.register('variable', 'scope', name, (scope) => scope.get(name))
      }

      this.#expressionConfig = config
    }

    return this.#expressionConfig
  }

  static init() {
    this.#defaultScript = DefaultScripts.getContent('actions')

    this.#loadScript()
    this.#executeScript()
  }

  static #loadScript() {
    this.#script = Store.get('actions_script', this.#defaultScript)
  }

  static #saveScript() {
    Store.set('actions_script', this.#script)
  }

  static #executeScript() {
    this.#instance = new Script(this.#script || '', ScriptType.Action)

    this.#actions = this.#instance.actions
    this.#trackers = this.#instance.trackers
  }

  static getScript() {
    return this.#script
  }

  static getInstance() {
    return this.#instance
  }

  static getActions() {
    return this.#actions
  }

  static getTrackers() {
    return this.#trackers
  }

  static resetScript() {
    Store.remove('actions_script')

    this.#loadScript()
    this.#executeScript()
  }

  static setScript(script: string) {
    this.#script = script

    this.#saveScript()
    this.#executeScript()
  }

  static apply(unfilteredPlayers: RawPlayer[], unfilteredGroups: RawGroup[]) {
    if (isEmpty(this.#actions)) {
      return {
        players: unfilteredPlayers,
        groups: unfilteredGroups
      }
    } else {
      const players = unfilteredPlayers.map((data) => new PlayerModel(data))
      const groups = unfilteredGroups.map((data) => new GroupModel(data))

      this.#applyTags(players, groups)
      this.#applyFilters(players, groups)

      return {
        players: players.map((player) => player.Data),
        groups: groups.map((group) => group.Data)
      }
    }
  }

  static #applyTags(players: PlayerModel[], groups: GroupModel[]) {
    const tagFile = this.#actions.filter((action) => action.type === 'tag_file')
    for (const {
      type,
      args: [tagExpression, conditionExpression]
    } of tagFile) {
      Logger.log('ACTIONS', `Applying action ${type}`)

      const scope = new ExpressionScope().add({
        players: Object.assign(
          players.map((p) => [p, p]),
          { segmented: true }
        ),
        groups
      })

      if (conditionExpression ? conditionExpression.eval(scope) : true) {
        const tag = tagExpression.eval(scope) as string

        for (const player of players) {
          const existingTags = toArray(player.Data.tag)
          pushUnique(existingTags, tag)

          player.Data.tag = existingTags
        }

        for (const group of groups) {
          const existingTags = toArray(group.Data.tag)
          pushUnique(existingTags, tag)

          group.Data.tag = existingTags
        }
      }
    }

    const tagPlayer = this.#actions.filter((action) => action.type === 'tag_player')
    for (const {
      type,
      args: [tagExpression, conditionExpression]
    } of tagPlayer) {
      Logger.log('ACTIONS', `Applying action ${type}`)

      for (const player of players) {
        const scope = new ExpressionScope().with(player, player)

        if (conditionExpression ? conditionExpression.eval(scope) : true) {
          const tag = tagExpression.eval(scope) as string

          const existingTags = toArray(player.Data.tag)
          pushUnique(existingTags, tag)

          player.Data.tag = existingTags
        }
      }
    }

    const tagGroup = this.#actions.filter((action) => action.type === 'tag_group')
    for (const {
      type,
      args: [tagExpression, conditionExpression]
    } of tagGroup) {
      Logger.log('ACTIONS', `Applying action ${type}`)

      for (const group of groups) {
        const scope = new ExpressionScope().with(group, group)

        if (conditionExpression ? conditionExpression.eval(scope) : true) {
          const tag = tagExpression.eval(scope) as string

          const existingTags = toArray(group.Data.tag)
          pushUnique(existingTags, tag)

          group.Data.tag = existingTags
        }
      }
    }
  }

  static #applyFilters(players: PlayerModel[], groups: GroupModel[]) {
    const selectsPlayer = this.#actions.filter((action) => action.type === 'select_player').map((action) => action.args[0])
    const rejectsPlayer = this.#actions.filter((action) => action.type === 'reject_player').map((action) => action.args[0])

    if (rejectsPlayer.length) {
      Logger.log('ACTIONS', `Applying action ${'reject_player'}`)

      filterInPlace(players, (player) => {
        const scope = new ExpressionScope().with(player, player)

        return !rejectsPlayer.some((expression) => expression.eval(scope))
      })
    }

    if (selectsPlayer.length) {
      Logger.log('ACTIONS', `Applying action ${'select_player'}`)

      filterInPlace(players, (player) => {
        const scope = new ExpressionScope().with(player, player)

        return selectsPlayer.some((expression) => expression.eval(scope))
      })
    }

    const selectsGroup = this.#actions.filter((action) => action.type === 'select_group').map((action) => action.args[0])
    const rejectsGroup = this.#actions.filter((action) => action.type === 'reject_group').map((action) => action.args[0])

    if (rejectsGroup.length) {
      Logger.log('ACTIONS', `Applying action ${'reject_group'}`)

      filterInPlace(groups, (group) => {
        const scope = new ExpressionScope().with(group, group)

        return !rejectsGroup.some((expression) => expression.eval(scope))
      })
    }

    if (selectsGroup.length) {
      Logger.log('ACTIONS', `Applying action ${'select_group'}`)

      filterInPlace(groups, (group) => {
        const scope = new ExpressionScope().with(group, group)

        return selectsGroup.some((expression) => expression.eval(scope))
      })
    }
  }

  static updateFromScript(trackers: Record<string, ScriptTracker>) {
    if (Object.keys(trackers).length > 0) {
      // Get current tracker settings
      const trackerSettings = Actions.getInstance()
      let trackerCode = trackerSettings.code

      // Go through all required trackers
      let isset = false
      for (const [trackerName, tracker] of Object.entries(trackers)) {
        if (trackerName in trackerSettings.trackers) {
          if (tracker.hash != trackerSettings.trackers[trackerName].hash) {
            Logger.log('TRACKER', `Tracker ${trackerName} with hash ${tracker.hash} found but overwritten by ${trackerSettings.trackers[trackerName].hash}!`)
          }
        } else {
          trackerCode += `${trackerCode ? '\n' : ''}${tracker.str} # Automatic entry from ${formatDate(Date.now())}`
          isset = true

          Logger.log('TRACKER', `Tracker ${trackerName} with hash ${tracker.hash} added automatically!`)
        }
      }

      // Save settings
      if (isset) {
        Actions.setScript(trackerCode)
        void DatabaseManager.refreshTrackers()
      }
    }
  }
}
