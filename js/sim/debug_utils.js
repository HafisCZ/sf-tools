const SimulatorDebugDialog = new(class extends Dialog {
  constructor () {
    super({
      key: 'simulator_debug',
      dismissable: true,
      opacity: 0,
      containerClass: 'debug-dialog'
    })
  }

  _createModal () {
      return `
          <div class="bordered inverted dialog">
              <div class="overflow-y-scroll overflow-x-hidden pr-4">
                  <div class="ui small inverted form" data-op="content"></div>
              </div>
              <div class="ui three fluid buttons">
                  <button class="ui black button" data-op="cancel">${this.intl('cancel')}</button>
                  <button class="ui button" data-op="reset">${this.intl('reset')}</button>
                  <button class="ui button !text-black !background-orange" data-op="ok">${this.intl('ok')}</button>
              </div>
          </div>
      `;
  }

  _createBindings () {
      this.$cancelButton = this.$parent.find('[data-op="cancel"]');        
      this.$cancelButton.click(() => {
          this.close();
      });

      this.$okButton = this.$parent.find('[data-op="ok"]');
      this.$okButton.click(() => {
          this.callback(this._readData());
          this.close();
      })

      this.$resetButton = this.$parent.find('[data-op="reset"]');
      this.$resetButton.click(() => {
          this._setData(this.defaultObject, this.defaultObject);
      })

      this.$content = this.$parent.find('[data-op="content"]');
  }

  _getValue (path, def) {
      const value = this.$parent.find(`[data-path="${path}"]`).val()

      if (typeof def === 'string') {
          return value;
      } else if (typeof def === 'boolean') {
          return value !== '0'
      } else {
          return parseFloat(value || def);
      }
  }

  _convertValue (val) {
      if (typeof val === 'boolean') {
          return val ? '1' : '0';
      } else {
          return val;
      }
  }

  _readData () {
      const data = {};

      for (const [group, groupItems] of Object.entries(this.defaultObject)) {
          data[group] = {}

          for (const [key, value] of Object.entries(groupItems)) {
              if (Array.isArray(value)) {
                  data[group][key] = [];

                  for (let i = 0; i < value.length; i++) {
                      data[group][key][i] = this._getValue(`${group}.${key}.${i}`, value[i]);
                  }
              } else {
                  data[group][key] = this._getValue(`${group}.${key}`, value);
              }
          }
      }

      return data;
  }

  _formatKey (key) {
    return key.replace(/([A-Z])/g, ' $1').trim();
  }

  _setData (object, defaultObject) {
      this.defaultObject = defaultObject;
      this.object = object || defaultObject;

      let content = '';
      for (const [group, groupItems] of Object.entries(this.object)) {
          content += `
            <details class="ui accordion">
              <summary class="title">
                <h2 class="ui dividing inverted header text-orange:hover">${group}</h2>
              </summary>
            <div class="content mb-4">
          `;

          for (const [key, value] of Object.entries(groupItems)) {
              const prettyKey = this._formatKey(key);

              if (Array.isArray(value)) {
                  content += '<div class="equal width fields">';
                  for (let i = 0; i < value.length; i++) {
                      content += `
                          <div class="field">
                              <label>${prettyKey} - ${i + 1}</label>
                              <div class="ui inverted input">
                                <input type="${typeof value[i] === 'string' ? 'text' : 'number'}" data-path="${group}.${key}.${i}" value="${this._convertValue(value[i])}">
                              </div>
                          </div>
                      `;
                  }
  
                  content += '</div>';
              } else {
                  content += `
                      <div class="field">
                          <label>${prettyKey}</label>
                          <div class="ui inverted input">
                            <input type="${typeof value === 'string' ? 'text' : 'number'}" data-path="${group}.${key}" value="${this._convertValue(value)}">
                          </div>
                      </div>
                  `;
              }
          }

          content += `
              </div>
            </details>
          `;
      }

      this.$content.html(content);
  }

  _applyArguments (object, defaultObject, callback) {
      this.callback = callback;

      this._setData(object, defaultObject);
  }
})();

const SimulatorUtils = new (class {
  configure (normalConfig, debugMode = false, debugCopyCallback = null) {
    this.customConfig = null;
    this.normalConfig = normalConfig;

    this.debugMode = debugMode;
    this.debugCopyCallback = debugCopyCallback;

    if (debugMode) {
      this._insertDebugElements()
    }
  }

  _insertDebugElements () {
    const $dialogButton = $(`
      <div class="item !p-0">
        <button class="ui basic inverted icon button !box-shadow-none" data-position="bottom center" data-tooltip="${intl('simulator.configure')}" data-inverted="">
          <i class="wrench icon"></i>
        </button>
      </div>
    `).click(() => {
      DialogController.open(
          SimulatorDebugDialog,
          this.customConfig,
          this.normalConfig,
          (config) => {
            this.customConfig = config;
            this._renderConfig();
          }
      );
    });

    const $copyButton = $(`
      <div class="item !p-0">
        <button class="ui basic inverted icon button !box-shadow-none" data-position="bottom center" data-tooltip="${intl('simulator.configure_copy')}" data-inverted="">
          <i class="copy icon"></i>
        </button>
      </div>
    `).click(() => this._executeCopy());
    
    $dialogButton.insertAfter($('.ui.huge.menu .header.item'))
    $copyButton.insertAfter($dialogButton);
  }

  _executeCopy () {
    if (this.debugCopyCallback) {
      this.debugCopyCallback(this.customConfig);
    }
  }

  _renderConfig () {
    if (typeof this.$display === 'undefined') {
      this.$display = $('<div class="text-white position-absolute left-8 bottom-8" style="font-size: 90%;"></div>').appendTo($(document.body));
    }

    let content = '';
    if (this.customConfig) {
        for (const [type, value] of Object.entries(CONFIG)) {
            const differences = [];
            for (const [subtype, subvalue] of Object.entries(value)) {
                const customValue = _dig(this.customConfig, type, subtype);

                if (Array.isArray(subvalue) ? customValue.some((v, i) => v != subvalue[i]) : customValue != subvalue) {
                    differences.push(`<div>${subtype}: <span class="text-red">${subvalue}</span> -&gt; <span class="text-greenyellow">${customValue}</span></div>`)
                }
            }

            if (differences.length > 0) {
                content += `<div><h4 class="!mt-2 !mb-0">${type}</h4>${differences.join('')}</div>`;
            }
        }
    }

    this.$display.html(content);
  }

  handlePaste (json) {
    if (typeof json === 'object' && json.type === 'custom') {
      const { data, config } = json;

      if (this.debugMode) {
        this.customConfig = config;
        this._renderConfig();
      }

      return data;
    } else {
      return json;
    }
  }

  get config () {
    return this.customConfig;
  }
})();