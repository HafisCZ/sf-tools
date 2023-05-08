const SimulatorResultsDialog = new (class extends Dialog {
  constructor () {
      super({
          dismissable: true
      })
  }

  _createModal () {
      return `
          <div class="small inverted bordered dialog">
              <div class="header">${intl('pets.results')}</div>
              <div class="ui three column grid" data-op="content"></div>
          </div>
      `;
  }

  _createBindings () {
      this.$content = this.$parent.operator('content');
  }

  _applyArguments (results) {
      this.$content.html(results.map(({ chance, player, boss }) => {
          const playerIndex = 20 * player.Type + player.Pet;
          const bossIndex = 20 * boss.Type + boss.Pet;

          return `
              <div class="two wide column">
                  <img src="res/pets/monster${800 + playerIndex}.png" style="height: 3em;">
              </div>
              <div class="four wide column" style="line-height: 3em; font-size: 110%;">
                  ${intl(`pets.names.${playerIndex}`)}
              </div>
              <div class="two wide column">
                  <img src="res/pets/monster${800 + bossIndex}.png" style="height: 3em;">
              </div>
              <div class="four wide column" style="line-height: 3em; font-size: 110%;">
                  ${intl(`pets.names.${bossIndex}`)}
              </div>
              <div class="four wide column text-center" style="line-height: 3em;">
                  ${chance == 0 ? intl('pets.bulk.not_possible') : `${chance.toFixed(chance < 0.01 ? 5 : 2)}%`}
              </div>
          `;
      }).join(''))
  }
})();

const SimulatorMapDialog = new (class extends Dialog {
  constructor () {
      super({
          dismissable: true
      })
  }

  _createModal () {
      return `
          <div class="very big inverted bordered dialog">
              <div class="header">${intl('pets.results')}</div>
              <div class="flex justify-content-between gap-2">
                  <div class="ui selection fluid inverted dropdown" data-op="selector">
                      <div class="text"></div>
                      <i class="dropdown icon"></i>
                  </div>
                  <div class="ui basic inverted icon button" data-position="bottom center" data-inverted="" data-tooltip="${intl('stats.copy.image')}" data-op="save">
                      <i class="download icon"></i>
                  </div>
              </div>
              <div data-op="content" class="overflow-y-scroll" style="height: 50vh;"></div>
          </div>
      `;
  }

  _createBindings () {
      this.$selector = this.$parent.operator('selector');
      
      this.$save = this.$parent.operator('save');
      this.$save.click(() => {
          const name = this.$selector.dropdown('get value');
          this._save(name);
      });

      this.$content = this.$parent.operator('content');
  }

  _save (name) {
      const $element = this.$parent.find(`[data-map="${name}"]`);
      
      this.$content.css('height', '');
      $element.find('.\\!text-white, .text-white').attr('style', 'color: black !important;');

      html2canvas($element.get(0), {
          logging: false,
          onclone: () => {
              this.$content.css('height', '50vh');
              $element.find('.\\!text-white, .text-white').removeAttr('style');
          }
      }).then((canvas) => {
          canvas.toBlob((blob) => {
              Exporter.download(`${name}.png`, blob);
          });
      });
  }

  _color (chance) {
      if (chance < 0.01) {
          return '#ffad99';
      } else if (chance >= 25) {
          return '#99ffb4'
      } else if (chance >= 10) {
          return '#daff99';
      } else if (chance >= 5) {
          return '#fdff99';
      } else {
          return '#ffdd99';
      }
  }

  _applyArguments (maps) {
      this.$selector.dropdown({
          values: maps.map(({ name }) => ({ value: SHA1(name), name })),
          onChange: (value) => {
              this.$content.find('[data-map]').hide();
              this.$content.find(`[data-map="${value}"]`).show();
          }
      });

      let content = '';
      for (const { data, name } of maps) {
          const size = data.find(entry => entry && entry.length).filter(value => typeof value !== 'undefined').length;

          content += `
              <table data-map="${SHA1(name)}" class="ui celled structured fixed basic table w-full text-center !m-0" style="display: none; font-size: 90% !important;">
                  <thead>
                      <tr>
                          ${data.find(entry => entry && entry.length).reduce((memo, chance, i) => memo + `<th class="!text-white">${intl('pets.map.gladiator')} ${i}</th>`, `<th class="!text-white">${intl('editor.level')}</th>`)}
                          ${'<th></th>'.repeat(16 - size)}
                      </tr>
                  </thead>
                  <tbody>
                      ${data.reduce((memo, entry, i) => memo + `<tr><td class="text-white">${i + 1}</td>${ entry.reduce((memo2, chance) => memo2 + `<td style="background-color: ${this._color(chance)};">${chance.toFixed(2)}%</td>`, '')}${'<td></td>'.repeat(16 - size)}</tr>`, '')}
                  </tbody>
              </table>
          `;
      }

      this.$content.html(content);

      this.$selector.dropdown('set selected', SHA1(maps[0].name));
  }
})();