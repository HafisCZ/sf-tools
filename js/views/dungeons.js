const SimulatorThresholdDialog = new (class extends Dialog {
  _createModal () {
      return `
          <div class="small inverted bordered dialog">
              <div class="header">${intl(`dungeons.simulate_next_settings.title`)}</div>
              <div class="ui inverted form">
                  <div class="field">
                      <label>${intl(`dungeons.simulate_next_settings.label`)}</label>
                      <div class="ui range small inverted slider" data-op="slider"></div>
                  </div>
                  <div class="two fields">
                      <div class="field">
                          <label>${intl(`general.min`)}</label>
                          <div class="ui inverted input">
                              <input type="text" data-op="min">
                          </div>
                      </div>
                      <div class="field">
                          <label>${intl(`general.max`)}</label>
                          <div class="ui inverted input">
                              <input type="text" data-op="max">
                          </div>
                      </div>
                  </div>
              </div>
              <div class="ui two fluid buttons">
                  <button class="ui black button" data-op="cancel">${intl('dialog.shared.cancel')}</button>
                  <button class="ui button !text-black !background-orange" data-op="ok">${intl('dialog.shared.ok')}</button>
              </div>
          </div>
      `;
  }

  _validatedValue ($input, minValue, maxValue) {
      const value = Number($input.val());
      if (isNaN(value) || value < minValue || value > maxValue) {
          $input.closest('.field').addClass('error');

          return null;
      } else {
          $input.closest('.field').removeClass('error');

          return Math.round(value * 10) / 10;
      }
  }

  _update (updateInputs) {
      this.$slider.slider('set rangeValue', this.currentMin, this.currentMax, updateInputs);
  }

  _createBindings () {
      this.$slider = this.$parent.find('[data-op="slider"]');
      this.$slider.slider({
          min: 0,
          max: 100,
          step: 0.1
      });

      this.$slider.slider('setting', 'onMove', (_span, min, max) => {
          this.currentMin = Math.round(min * 10) / 10;
          this.currentMax = Math.round(max * 10) / 10;

          this.$min.val(this.currentMin);
          this.$max.val(this.currentMax);
      });
  
      this.$min = this.$parent.find('[data-op="min"]');
      this.$min.on('input', () => {
          const value = this._validatedValue(this.$min, 0, this.currentMax);
          if (value) {
              this.currentMin = value;
              this._update(false);
          }
      });
      
      this.$max = this.$parent.find('[data-op="max"]');
      this.$max.on('input', () => {
          const value = this._validatedValue(this.$max, this.currentMin, 100);
          if (value) {
              this.currentMax = value;
              this._update(false);
          }
      });

      this.$okButton = this.$parent.find('[data-op="ok"');
      this.$okButton.click(() => {
          this.callback(
              this.currentMin,
              this.currentMax
          );

          this.close();
      });

      this.$cancelButton = this.$parent.find('[data-op="cancel"]');
      this.$cancelButton.click(() => {
          this.close();
      });
  }

  _applyArguments (currentMin, currentMax, callback) {
      this.currentMin = currentMin;
      this.currentMax = currentMax;
      this.callback = callback;

      this._update(true);
  }
})()

const SimulatorResultsDialog = new (class extends Dialog {
  constructor () {
      super({
          dismissable: true
      })
  }

  _createModal () {
      return `
          <div class="tight inverted bordered very small dialog">
              <div class="header flex justify-content-between !p-2" style="border-bottom: 1px solid #262626;">
                  <div>${intl(`dungeons.results`)}</div>
                  <div data-op="screenshot" class="ui tiny basic inverted icon button" data-inverted="" data-position="bottom center" data-tooltip="${intl('stats.copy.image')}">
                      <i class="download icon"></i>
                  </div>
              </div>
              <div data-op="experience"></div>
              <div class="px-4" style="border-bottom: 1px solid #262626;">
                  <canvas data-op="chart" class="w-full"></canvas>
              </div>
              <div class="overflow-y-auto" style="max-height: 65vh;">
                  <div class="ui grid !m-0" data-op="content"></div>
              </div>
          </div>
      `;
  }

  _createBindings () {
      this.$experience = this.$parent.operator('experience');
      this.$content = this.$parent.operator('content');

      this.chart = new Chart(this.$parent.operator('chart'), {
          type:'line',data:{datasets:[{fill:!1,borderWidth:1.5,data:[]}]},options:{title:{display:!0},legend:{display:!1},scales:{yAxes:[{gridLines:{color:'#2e2e2e',zeroLineColor:'#2e2e2e'},display:!0,ticks:{min:0,max:100,padding:10,stepSize:20,display:!1}}],xAxes:[{display:!1}]},tooltips:{enabled:!1},animation:{duration:0},events:[],hover:{animationDuration:0,},showTooltips:!1,responsiveAnimationDuration:0,elements:{line:{borderColor:'white',tension:0},point:{radius:0}}}
      });

      this.$screenshot = this.$parent.operator('screenshot');
      this.$screenshot.click(() => {
          const $contentParent = this.$content.parent();
          $contentParent.css('max-height', '');
          $contentParent.css('color', 'black');
          $contentParent.find('.dungeon-shadow').css('color', 'purple');

          html2canvas(this.$content.get(0), {
              logging: false,
              onclone: () => {
                  $contentParent.css('max-height', '65vh');
                  $contentParent.css('color', '');
                  $contentParent.find('.dungeon-shadow').css('color', '');
              }
          }).then((canvas) => {
              canvas.toBlob((blob) => {
                  window.download(`dungeons_${Date.now()}.png`, blob);
              });
          });
      });
  }

  _applyArguments (entries, experience, renderChart) {
      // Display total experience
      this.$experience.html(
          experience ? `<div>${intl('dungeons.experience', { experience: formatAsSpacedNumber(experience, ' ') })}</div>` : ''
      )

      // Display all entries
      this.$content.html(entries.map(({ boss, dungeon, score, healths, iterations }, index) => {
          return `
              <div class="row" data-id="${index}" style="padding: 0; padding-left: 8px;">
                  <div class="eleven wide column" style="position: relative; padding-top: 1rem; padding-bottom: 1rem;">
                      <span class="${dungeon.shadow ? 'dungeon-shadow' : ''}"">
                          <img class="ui centered image boss-image" style="position: absolute; left: 0; height: 2.5em; top: 0.5em; width: 2.5em;" src="${_classImageUrl(boss.class)}">&nbsp;
                          <span style="position: absolute; left: 3.75em; top: 0.4em; font-size: 80%;">${dungeon.name}</span>
                          <span style="position: absolute; left: 3em; top: 1.4em;">#${boss.pos} - ${boss.name}</span>
                      </span>
                  </div>
                  <div class="five wide column text-center" style="padding-top: 1rem; padding-bottom: 1rem;">${score == 0 ? intl('pets.bulk.not_possible') : `${ (100 * score / iterations).toFixed(2) }%`}</div>
              </div>
          `;
      }).join(''));

      // Attach hover listeners
      this.$content.find('.row').mouseenter((event) => {
          const { boss, dungeon, score, healths, iterations } = entries[event.currentTarget.dataset.id];

          renderChart(this.chart, dungeon, boss, score, iterations, healths);
      }).first().trigger('mouseenter');
  }
})()