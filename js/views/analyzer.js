const AnalyzerOptionsDialog = new (class extends Dialog {
  constructor () {
      super({
          key: 'analyzer_options',
          dismissable: true,
          opacity: 0
      });
  }

  _createModal () {
      return `
          <div class="small bordered inverted dialog">
              <div class="header">${this.intl('title')}</div>
              <div>
                  <div class="ui small inverted form" data-op="content"></div>
              </div>
              <button class="ui button fluid !text-black !background-orange" data-op="ok">${intl('dialog.shared.ok')}</button>
          </div>
      `;
  }

  _createBindings () {
      this.$ok = this.$parent.operator('ok');
      this.$ok.click(() => this.close());

      this.$content = this.$parent.operator('content');
  }

  _applyArguments (options, data) {
      if (!this.$content.empty()) return;

      for (const [ key, option ] of Object.entries(data)) {
          if (option.type === 'dropdown') {
              const $element = $(`
                  <div class="field">
                      <label>${this.intl(`option.${key}.title`)}</label>
                      <div class="ui selection inverted fluid dropdown">
                          <div class="text"></div>
                          <i class="dropdown icon"></i>
                      </div>
                  </div>
              `);

              const selectedValue = options[key];

              $element.find('.ui.dropdown').dropdown({
                  values: option.keys.map((value) => ({ value, name: this.intl(`option.${key}.value.${value}`), selected: value === selectedValue })),
                  onChange: (value) => {
                      options[key] = value;
                      option.onChange();
                  }
              })

              $element.appendTo(this.$content);
          } else if (option.type === 'number') {
              const $element = $(`
                  <div class="field">
                      <label>${this.intl(`option.${key}.title`)}</label>
                      <div class="ui inverted input">
                          <input type="number" value="${options[key]}">
                      </div>
                  </div>
              `);

              $element.find('.ui.input').change((event) => {
                  options[key] = parseInt(event.target.value);
                  option.onChange();
              })

              $element.appendTo(this.$content);
          }
      }
  }
})();

const FightStatisticalAnalysisDialog = new (class extends Dialog {
  constructor () {
      super({
          key: 'fight_statistical_analysis',
          dismissable: true,
          opacity: 0
      })

      this.keywords = ['Player 1', 'Player 2', 'Player 1 Attacking', 'Player 2 Attacking', 'Attacker', 'Attacker State', 'Target', 'Target State', 'Critical', 'Missed', 'Damage', 'Rage', 'Special', 'Type', 'Last Round'];
  }

  _createModal () {
      return `
          <div class="bordered inverted dialog">
              <div class="header">${this.intl('title')}</div>
              <div>${this.intl('variables')}</div>
              <div class="text-gray">${this.keywords.map((keyword) => `<code>${keyword}</code>`).join(',&nbsp; ')}</div>
              <div class="ui inverted form flex flex-col gap-4 pr-4 overflow-y-scroll" data-op="content" style="height: 50vh;"></div>
              <div class="ui two fluid buttons">
                  <button class="ui button !text-black !background-orange" data-op="add">${this.intl('add')}</button>
                  <button class="ui black button" data-op="cancel">${intl('dialog.shared.close')}</button>
              </div>
          </div>
      `;
  }

  _createBindings () {
      this.$closeButton = this.$parent.operator('cancel');
      this.$closeButton.click(() => {
          this.close();
      })

      this.$content = this.$parent.operator('content');

      this.$add = this.$parent.operator('add');
      this.$add.click(() => {
          this._inject();
      })

      const constants = new Constants({
          // Classes
          'warrior': 1,
          'mage': 2,
          'scout': 3,
          'assassin': 4,
          'battlemage': 5,
          'berserker': 6,
          'demonhunter': 7,
          'druid': 8,
          'bard': 9,
      });

      this.environment = {
          functions: {},
          variables: {},
          constants
      }
  }

  _inject () {
      const index = this.groups.length;

      const $group = $(`
          <div class="fields !mb-0">
              <div class="twelve wide field">
                  <label>${this.intl('selector')}</label>
                  <div class="ta-wrapper" style="height: initial;">
                      <input data-op="selector" class="ta-area" data-op="primary" type="text" placeholder="${this.intl('selector')}">
                      <div data-op="overlay" class="ta-content" style="width: 100%; margin-top: -2em; margin-left: 1em;"></div>
                  </div>
              </div>
              <div class="four wide field">
                  <label>${this.intl('count')}</label>
                  <div class="ui inverted centered input">
                      <input data-op="count" type="text" disabled>
                  </div>
              </div>
          </div>
      `).appendTo(this.$content);

      const $selector = $group.operator('selector');
      const $overlay = $group.operator('overlay');
      const $count = $group.operator('count');

      $selector.on('change input', (event) => {
          const html = Highlighter.expression(event.currentTarget.value || '', this.environment, this.keywords).text;
          $overlay.html(html);

          this._changed();
      })

      this.groups.push({
          index,
          selector: $selector,
          count: $count
      })

      this._changed();
  }

  _changed () {
      const globalScope = new ExpressionScope(this.environment).add({ 'Player 1': this.fighterA, 'Player 2': this.fighterB });
      
      for (const { selector, count } of this.groups) {
          const expression = new Expression(selector.val() || 'true');

          count.val(this.rounds.filter((round) => expression.eval(globalScope.copy().addSelf(round))).length);
      }
  }

  _applyArguments ({ fights, fighterA, fighterB }) {
      this.fighterA = fighterA;
      this.fighterB = fighterB;

      this.rounds = fights.map((fight) => fight.rounds.filter((round) => !round.attackSpecial).map(({ attacker, target, attackCrit, attackMissed, attackDamage, attackRage, attackSpecial, attackType, attackerSpecialState, targetSpecialState }, index, array) => ({
          Attacker: attacker,
          Target: target,
          'Attacker State': attackerSpecialState,
          'Target State': targetSpecialState,
          'Player 1 Attacking': attacker.ID === fighterA.ID,
          'Player 2 Attacking': attacker.ID === fighterB.ID,
          Critical: attackCrit,
          Missed: attackMissed,
          Damage: attackDamage,
          Rage: attackRage,
          Special: attackSpecial,
          Type: attackType,
          'Last Round': index === array.length - 1
      }))).flat();

      this.groups = [];

      this.$content.empty();

      this._inject();
  }
})();

// Custom fighter
class FighterModel {
  constructor (data, fightType) {
      let dataType = new ComplexDataType(data);
      dataType.assert(47);

      this.ID = dataType.long();
      this.Name = dataType.string();
      this.Level = dataType.long();
      this.MaximumLife = dataType.long();
      this.Life = dataType.long();

      this.Strength = {
          Total: dataType.long()
      };

      this.Dexterity = {
          Total: dataType.long()
      };

      this.Intelligence = {
          Total: dataType.long()
      };

      this.Constitution = {
          Total: dataType.long()
      };

      this.Luck = {
          Total: dataType.long()
      };

      this.Face = {
          Mouth: dataType.long(),
          Hair: {
              Type: dataType.long() % 100,
              Color: Math.trunc(dataType.back(1).long() / 100)
          },
          Brows: {
              Type: dataType.long() % 100,
              Color: Math.trunc(dataType.back(1).long() / 100)
          },
          Eyes: dataType.long(),
          Beard: {
              Type: dataType.long() % 100,
              Color: Math.trunc(dataType.back(1).long() / 100)
          },
          Nose: dataType.long(),
          Ears: dataType.long(),
          Special: dataType.long(),
          Special2: dataType.long(),
          Portrait: dataType.long()
      };

      this.Race = dataType.long();
      this.Gender = dataType.long();
      this.Class = dataType.long();

      this.Items = {
          Wpn1: new ItemModel(dataType.sub(12), 1, [1, 1]),
          Wpn2: new ItemModel(dataType.sub(12), 2, [1, 2])
      }

      if (this.Face.Mouth < 0) {
          this.Boss = true;
          this.Name = this._findName(fightType, -this.Face.Mouth);
      }
  }

  _findName (type, face) {
      if (NAME_UNIT_COMPANION[face]) {
          return NAME_UNIT_COMPANION[face];
      } else if (type == FIGHT_TYPES.Shadow) {
          return `Shadow ${ NAME_MONSTER[face] }`;
      } else if (NAME_MONSTER[face]) {
          return NAME_MONSTER[face];
      } else if (type == FIGHT_TYPES.Underworld) {
          return NAME_UNIT_UNDERWORLD[Math.trunc((face - 899) / 20)];
      } else {
          return 'Unknown';
      }
  }
}