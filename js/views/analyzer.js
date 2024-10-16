class AnalyzerOptionsDialog extends Dialog {
  static OPTIONS = {
    key: 'analyzer_options',
    dismissable: true,
    opacity: 0
  }

  render () {
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

  handle (options, data) {
      this.$ok = this.$parent.operator('ok');
      this.$ok.click(() => {
        this.close(false)
      });

      this.$content = this.$parent.operator('content');

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
}

class FightStatisticalAnalysisDialog extends Dialog {
    static OPTIONS = {
        key: 'fight_statistical_analysis',
        dismissable: true,
        opacity: 0
    }

    render () {
      this.ExpressionConfig = DEFAULT_EXPRESSION_CONFIG.clone();

      for (const name of ['Player 1 Attacking', 'Player 2 Attacking', 'Attacker', 'Attacker State', 'Target', 'Target State', 'Critical', 'Missed', 'Damage', 'Rage', 'Special', 'Type', 'First Round', 'Last Round', 'Attacker State Display', 'Target State Display']) {
          this.ExpressionConfig.register('accessor', 'none', name, (object) => object[name]);
      }

      return `
          <div class="bordered inverted dialog">
              <div class="header">${this.intl('title')}</div>
              <div>${this.intl('variables')}</div>
              <div class="text-gray">${this.ExpressionConfig.all('accessor').map((keyword) => `<code>${keyword}</code>`).join(',&nbsp; ')}</div>
              <div class="ui inverted form flex flex-col gap-4 pr-4 overflow-y-scroll" data-op="content" style="height: 50vh;"></div>
              <div class="ui two fluid buttons">
                  <button class="ui button !text-black !background-orange" data-op="add">${this.intl('add')}</button>
                  <button class="ui black button" data-op="cancel">${intl('dialog.shared.close')}</button>
              </div>
          </div>
      `;
  }

  handle ({ fights, fighterA, fighterB }) {
      this.$closeButton = this.$parent.operator('cancel');
      this.$closeButton.click(() => {
        this.close(false)
      })

      this.$content = this.$parent.operator('content');

      this.$add = this.$parent.operator('add');
      this.$add.click(() => {
          this.#inject();
      })

      this.environment = {
          functions: {},
          variables: {},
          constants: new Constants(
            _hashToMap({
                '@attack_normal': 0,
                '@attack_critical': 1,
                '@attack_blocked': 3,
                '@attack_evaded': 4,
                '@attack_critical_blocked': 8,
                '@attack_critical_evaded': 9,
                '@attack_secondary_normal': 10,
                '@attack_secondary_critical': 11,
                '@attack_secondary_blocked': 13,
                '@attack_secondary_evaded': 14,
                '@attack_secondary_critical_blocked': 18,
                '@attack_secondary_critical_evaded': 19,
                '@attack_chain_normal': 20,
                '@attack_chain_critical': 21,
                '@attack_chain_blocked': 23,
                '@attack_chain_evaded': 24,
                '@attack_chain_critical_blocked': 28,
                '@attack_chain_critical_evaded': 29,
                '@attack_catapult': 2,
                '@attack_fireball': 15,
                '@attack_fireball_blocked': 16,
                '@attack_swoop': 5,
                '@attack_swoop_blocked': 6,
                '@attack_swoop_evaded': 7,
                '@attack_revive': 100
            })
          )
      }

      this.fighterA = fighterA;
      this.fighterB = fighterB;

      this.rounds = fights.map((fight) => fight.rounds.filter((round) => !round.attackTypeSpecial).map(({ attacker, target, attackTypeCritical, defenseType, attackDamage, attackRage, attackTypeSpecial, attackType, attackerState, targetState, attackerSpecialDisplay, targetSpecialDisplay }, index, array) => ({
          'Attacker': attacker,
          'Target': target,
          'Attacker State': attackerState,
          'Attacker State Display': attackerSpecialDisplay,
          'Target State': targetState,
          'Target State Display': targetSpecialDisplay,
          'Player 1 Attacking': attacker.ID === fighterA.ID,
          'Player 2 Attacking': attacker.ID === fighterB.ID,
          'Critical': attackTypeCritical,
          'Missed': defenseType,
          'Damage': attackDamage,
          'Rage': attackRage,
          'Special': attackTypeSpecial,
          'Type': attackType,
          'First Round': index === 0,
          'Last Round': index === array.length - 1
      }))).flat();

      this.groups = [];

      this.#inject();
  }

  #inject () {
      const index = this.groups.length;

      const $group = $(`
          <div class="fields !mb-0">
              <div class="twelve wide field">
                  <label>${this.intl('selector')}</label>
                  <div class="ta-editor" style="height: initial;">
                      <input data-op="selector" class="ta-editor-textarea" style="padding-left: 1em !important;" data-op="primary" type="text" placeholder="${this.intl('selector')}">
                      <div data-op="overlay" class="ta-editor-overlay" style="width: 100%; margin-top: 0.66em; margin-left: 1em;"></div>
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
          const html = Highlighter.expression(event.currentTarget.value || '', this.environment, this.ExpressionConfig).text;
          $overlay.html(html);

          this.#changed();
      })

      this.groups.push({
          index,
          selector: $selector,
          count: $count
      })

      this.#changed();
  }

  #changed () {
      const globalScope = new ExpressionScope(this.environment);
      
      for (const { selector, count } of this.groups) {
          const expression = Expression.create(selector.val() || 'true', null, this.ExpressionConfig);
          
          if (expression) {
            count.val(this.rounds.filter((round) => expression.eval(globalScope.clone().addSelf(round))).length);
          }
      }
  }
}

class AnalyzerAutofillDialog extends Dialog {
    static OPTIONS = {
      key: 'analyzer_autofill',
      dismissable: true,
      opacity: 0
    }

    render () {
        return `
            <div class="small bordered inverted dialog">
                <div class="header flex justify-content-between items-center">
                    <div>${this.intl('title')}</div>
                    <i class="ui small link close icon" data-op="close"></i>
                </div>
                <div class="ui inverted form">
                    <div class="field">
                        <div class="ui inverted input">
                            <input type="text" data-op="search" placeholder="${this.intl('search')}">
                        </div>
                    </div>
                </div>
                <div class="ui inverted form flex flex-col gap-4 pr-4 overflow-y-scroll" data-op="content" style="height: 50vh;"></div>
            </div>
        `;
    }

    handle () {
        this.$content = this.$parent.operator('content');
        
        this.$close = this.$parent.operator('close');
        this.$close.click(() => {
          this.close(false)
        })

        this.$search = this.$parent.operator('search');
        this.$search.on('input change', () => {
            this.#refresh();
        })

        this.#generateContent();
        this.#refresh();
    }

    #refresh () {
        const term = this.$search.val().trim().toLowerCase();
        if (term.length > 0) {
            for (const item of this.items) {
                item.element[item.dungeon.includes(term) || item.boss.includes(term) ? 'show' : 'hide']();
            }
        } else {
            for (const item of this.items) {
                item.element.show();
            }
        }
    }

    #getBossRunes (runes) {
        let values = [0, 0, 0];
    
        if (runes && runes.res) {
            values = runes.res;
        }

        return {
            Health: 0,
            ResistanceFire: values[0],
            ResistanceCold: values[1],
            ResistanceLightning: values[2]
        }
    }

    #convert (dungeon, data) {
        return {
            Armor: data.armor || ((dungeon.armor_multiplier || 1) * (data.level * CONFIG.fromIndex(data.class).MaximumDamageReduction)),
            Dungeons: { Group: 0 },
            Fortress: { Gladiator: data.gladiator || 0 },
            Runes: this.#getBossRunes(data.runes),
            Items: {
                Hand: {},
                Wpn1: {
                    AttributeTypes: { 2: data.runes ? data.runes.type : 0 },
                    Attributes: { 2: data.runes ? data.runes.damage : 0 },
                    DamageMax: data.max,
                    DamageMin: data.min,
                    HasEnchantment: false
                },
                Wpn2: {
                    AttributeTypes: { 2: data.runes ? data.runes.type : 0 },
                    Attributes: { 2: data.runes ? data.runes.damage : 0 },
                    DamageMax: data.max,
                    DamageMin: data.min,
                    HasEnchantment: false
                }
            }
        };
    }

    #generateContent () {
        for (const dungeon of Object.values(DUNGEON_DATA)) {
            dungeon.name = intl(`dungeon_enemies.${dungeon.intl}.name`);
    
            for (const enemy of Object.values(dungeon.floors)) {
                enemy.name = intl(`monsters.${enemy.id}`);
            }
        }

        this.items = [];
        this.$content.empty();

        for (const dungeon of _sortAsc(Object.values(DUNGEON_DATA), ({ pos }) => pos).filter(({ floors }) => Object.keys(floors).length > 0)) {
            for (const boss of Object.values(dungeon.floors)) {
                const $element = $(`
                    <div class="!border-radius-1 border-gray p-2 background-dark:hover cursor-pointer flex gap-4 items-center">
                        <img class="ui image" style="width: 3em; height: 3em;" src="${_classImageUrl(boss.class)}">
                        <div>
                            <div class="text-gray">${dungeon.name}</div>
                            <div>${boss.pos}. ${boss.name}</div>
                        </div>
                        <div style="margin-left: auto; mr-1">
                            <i class="ui big ${dungeon.shadow ? 'users purple' : 'user'} disabled icon"></i>
                        </div>
                    </div>
                `);

                $element.click(() => {
                    this.close(true, this.#convert(dungeon, boss));
                })

                this.$content.append($element);

                this.items.push({
                    dungeon: dungeon.name.toLowerCase(),
                    boss: boss.name.toLowerCase(),
                    element: $element
                })
            }
        }
    }
}

// Custom fighter
class FighterModel {
  constructor (data, fightType) {
      let dataType = new ComplexDataType(data);
      dataType.assert(47);

      this.ID = dataType.long();
      this.Name = dataType.string();
      this.Level = dataType.long();
      this.TotalHealth = dataType.long();
      this.Health = dataType.long();

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
          Wpn1: new ItemModel(dataType.sub(12), 1, 9),
          Wpn2: new ItemModel(dataType.sub(12), 1, 10)
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
          return `Shadow ${ intl(`monsters.${face}`) }`;
      } else if (Localization.hasTranslation(`monsters.${face}`)) {
          return intl(`monsters.${face}`);
      } else if (type == FIGHT_TYPES.Underworld) {
          return NAME_UNIT_UNDERWORLD[Math.trunc((face - 899) / 20)];
      } else {
          return 'Unknown';
      }
  }
}