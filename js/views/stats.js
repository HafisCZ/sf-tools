const FileEditDialog = new (class FileEditDialog extends Dialog {
  constructor () {
      super({
          key: 'file_edit',
          opacity: 0
      });
  }

  _createModal () {
      return `
          <div class="small bordered inverted dialog">
              <div class="left header">${this.intl('title')}</div>
              <div class="ui inverted form">
                  <div class="field">
                      <label>${this.intl('timestamp')}</label>
                      <div class="ui inverted input">
                          <input data-op="timestamp" type="text">
                      </div>
                  </div>
              </div>
              <div class="ui two fluid buttons">
                  <button class="ui black button" data-op="cancel">${this.intl('cancel')}</button>
                  <button class="ui button !text-black !background-orange" data-op="save">${this.intl('save')}</button>
              </div>
          </div>
      `;
  }

  _createBindings () {
      this.$parent.find('[data-op="cancel"]').click(() => {
          this.close();
      });

      this.$parent.find('[data-op="save"]').click(() => {
          const newTimestamp = Math.trunc(_parseDate(this.$timestamp.val()) / 60000);
          if (newTimestamp && newTimestamp != this.truncatedTimestamp) {
              this.close();
              Loader.toggle(true);
              DatabaseManager.rebase(this.sourceTimestamp, newTimestamp * 60000).then(this.callback);
          } else {
              this.close();
          }
      });

      this.$timestamp = this.$parent.find('[data-op="timestamp"]')
  }

  _applyArguments (timestamp, callback) {
      this.callback = callback;
      this.sourceTimestamp = timestamp;
      this.truncatedTimestamp = Math.trunc(timestamp / 60000);
      this.$timestamp.val(_formatDate(timestamp));
  }
})();

const EditFileTagDialog = new (class EditFileTagDialog extends Dialog {
  constructor () {
      super({
          key: 'edit_file_tag',
          opacity: 0
      });
  }

  _createModal () {
      return `
          <div class="small bordered inverted dialog">
              <div class="header">${this.intl('title')}</div>
              <div class="ui inverted form">
                  <div class="field">
                      <label>${this.intl('current')}:</label>
                      <div class="ui inverted input">
                          <input data-op="old-tags" type="text" placeholder="${this.intl('none')}" disabled>
                      </div>
                  </div>
                  <div class="field">
                      <label>${this.intl('replacement')}:</label>
                      <div class="ui inverted input">
                          <input data-op="new-tags" type="text" placeholder="${this.intl('none')}">
                      </div>
                  </div>
              </div>
              <div class="ui two fluid buttons">
                  <button class="ui black button" data-op="cancel">${this.intl('cancel')}</button>
                  <button class="ui button !text-black !background-orange" data-op="save">${this.intl('save')}</button>
              </div>
          </div>
      `;
  }

  _createBindings () {
      this.$oldTags = this.$parent.find('[data-op="old-tags"]');
      this.$newTags = this.$parent.find('[data-op="new-tags"]');

      this.$parent.find('[data-op="cancel"]').click(() => {
          this.close();
      });

      this.$parent.find('[data-op="save"]').click(() => {
          const tag = this.$newTags.val().trim();
          this.close();
          Loader.toggle(true);
          DatabaseManager.setTag(this.timestamps, tag).then(this.callback);
      });
  }

  _applyArguments (timestamps, callback) {
      this.timestamps = timestamps;
      this.callback = callback;

      const tags = Object.entries(DatabaseManager.findUsedTags(timestamps));
      if (tags.length == 1) {
          const tag = _dig(tags, 0, 0);
          if (tag == 'undefined') {
              this.$oldTags.val('');
          } else {
              this.$oldTags.val(tag);
          }
      } else {
          this.$oldTags.val(tags.map(([key, count]) => `${key === 'undefined' ? this.intl('none') : key} (${count})`).join(', '));
      }

      this.$newTags.val('');
  }
})();

const ProfileCreateDialog = new (class ProfileCreateDialog extends Dialog {
  constructor () {
      super({
          key: 'profile_create',
          opacity: 0
      });
  }

  _createModal () {
      return `
          <div class="bordered inverted dialog">
              <div class="left separated header">${this.intl('title')}</div>
              <div class="ui inverted form">
                  <div class="two fields">
                      <div class="four wide field">
                          <label>${this.intl('id')}:</label>
                          <div class="ui inverted input">
                              <input class="!text-center" data-op="id" type="text" disabled>
                          </div>
                      </div>
                      <div class="eight wide field">
                          <label>${this.intl('name')}:</label>
                          <div class="ui inverted input">
                              <input data-op="name" type="text">
                          </div>
                      </div>
                      <div class="four wide field">
                          <label>${this.intl('slot')}:</label>
                          <div class="ui fluid selection inverted dropdown" data-op="slot">
                              <div class="text"></div>
                              <i class="dropdown icon"></i>
                          </div>
                      </div>
                  </div>
                  <h3 class="header mb-0">${this.intl('player.primary')}</h3>
                  <div class="two fields">
                      <div class="field">
                          <label>${this.intl('index')}:</label>
                          <div class="ui fluid search selection inverted dropdown" data-op="primary-index">
                              <div class="text"></div>
                              <i class="dropdown icon"></i>
                          </div>
                      </div>
                      <div class="field">
                          <label>${this.intl('operation')}:</label>
                          <select class="ui fluid search selection inverted dropdown" data-op="primary-operator">
                              <option value="equals">${this.intl('equals')}</option>
                              <option value="above">${this.intl('above')}</option>
                              <option value="below">${this.intl('below')}</option>
                              <option value="between">${this.intl('between')}</option>
                          </select>
                      </div>
                  </div>
                  <div class="two fields">
                      <div class="field">
                          <label>${this.intl('value')} 1:</label>
                          <div class="ta-editor" style="height: initial;">
                              <input class="ta-editor-textarea" style="padding-left: 1em !important;" data-op="primary" type="text" placeholder="${this.intl('ast.primary')}">
                              <div data-op="primary-content" class="ta-editor-overlay" style="width: 100%; margin-top: 0.66em; margin-left: 1em;"></div>
                          </div>
                      </div>
                      <div class="field">
                          <label>${this.intl('value')} 2:</label>
                          <div class="ta-editor" style="height: initial;">
                              <input class="ta-editor-textarea" style="padding-left: 1em !important;" data-op="primary-2" type="text" placeholder="${this.intl('ast.primary')}">
                              <div data-op="primary-content-2" class="ta-editor-overlay" style="width: 100%; margin-top: 0.66em; margin-left: 1em;"></div>
                          </div>
                      </div>
                  </div>
                  <h3 class="header mb-0">${this.intl('player.secondary')}</h3>
                  <div class="field">
                      <label>${this.intl('secondary')}:</label>
                      <div class="ta-editor">
                          <input class="ta-editor-textarea" style="padding-left: 1em !important;" data-op="secondary" type="text" placeholder="${this.intl('ast.secondary')}">
                          <div data-op="secondary-content" class="ta-editor-overlay" style="width: 100%; margin-top: 0.66em; margin-left: 1em;"></div>
                      </div>
                  </div>
                  <h3 class="header mb-0">${this.intl('group.primary')}</h3>
                  <div class="two fields">
                      <div class="field">
                          <label>${this.intl('index')}:</label>
                          <div class="ui fluid search selection inverted dropdown" data-op="primary-index-g">
                              <div class="text"></div>
                              <i class="dropdown icon"></i>
                          </div>
                      </div>
                      <div class="field">
                          <label>${this.intl('operation')}:</label>
                          <select class="ui fluid search selection inverted dropdown" data-op="primary-operator-g">
                              <option value="equals">${this.intl('equals')}</option>
                              <option value="above">${this.intl('above')}</option>
                              <option value="below">${this.intl('below')}</option>
                              <option value="between">${this.intl('between')}</option>
                          </select>
                      </div>
                  </div>
                  <div class="two fields">
                      <div class="field">
                          <label>${this.intl('value')} 1:</label>
                          <div class="ta-editor" style="height: initial;">
                              <input class="ta-editor-textarea" style="padding-left: 1em !important;" data-op="primary-g" type="text" placeholder="${this.intl('ast.primary')}">
                              <div data-op="primary-content-g" class="ta-editor-overlay" style="width: 100%; margin-top: 0.66em; margin-left: 1em;"></div>
                          </div>
                      </div>
                      <div class="field">
                          <label>${this.intl('value')} 2:</label>
                          <div class="ta-editor" style="height: initial;">
                              <input class="ta-editor-textarea" style="padding-left: 1em !important;" data-op="primary-2-g" type="text" placeholder="${this.intl('ast.primary')}">
                              <div data-op="primary-content-2-g" class="ta-editor-overlay" style="width: 100%; margin-top: 0.66em; margin-left: 1em;"></div>
                          </div>
                      </div>
                  </div>
                  <h3 class="header mb-0">${this.intl('group.secondary')}</h3>
                  <div class="field">
                      <label>${this.intl('secondary')}:</label>
                      <div class="ta-editor">
                          <input class="ta-editor-textarea" style="padding-left: 1em !important;" data-op="secondary-g" type="text" placeholder="${this.intl('ast.secondary')}">
                          <div data-op="secondary-content-g" class="ta-editor-overlay" style="width: 100%; margin-top: 0.66em; margin-left: 1em;"></div>
                      </div>
                  </div>
              </div>
              <div class="ui two fluid buttons">
                  <button class="ui black button" data-op="cancel">${this.intl('cancel')}</button>
                  <button class="ui button !text-black !background-orange" data-op="save">${this.intl('save')}</button>
              </div>
          </div>
      `;
  }

  _createBindings () {
      this.$id = this.$parent.find('[data-op="id"]');
      this.$name = this.$parent.find('[data-op="name"]');
      this.$slot = this.$parent.find('[data-op="slot"]');

      // Secondary filter
      this.$secondary = this.$parent.find('[data-op="secondary"]');
      this.$secondaryContent = this.$parent.find('[data-op="secondary-content"]');

      this.$secondary.on('change input', (e) => {
          this.$secondaryContent.html(Highlighter.expression($(e.currentTarget).val() || '', undefined, ProfilesTab.PLAYER_EXPRESSION_CONFIG).text);
      });

      this.$secondaryG = this.$parent.find('[data-op="secondary-g"]');
      this.$secondaryContentG = this.$parent.find('[data-op="secondary-content-g"]');

      this.$secondaryG.on('change input', (e) => {
          this.$secondaryContentG.html(Highlighter.expression($(e.currentTarget).val() || '', undefined, ProfilesTab.GROUP_EXPRESSION_CONFIG).text);
      });

      // Primary filter
      this.$primaryIndex = this.$parent.find('[data-op="primary-index"]');
      this.$primaryOperator = this.$parent.find('[data-op="primary-operator"]');
      this.$primary = this.$parent.find('[data-op="primary"]');
      this.$primaryContent = this.$parent.find('[data-op="primary-content"]');
      this.$primary2 = this.$parent.find('[data-op="primary-2"]');
      this.$primaryContent2 = this.$parent.find('[data-op="primary-content-2"]');

      this.$primary.on('change input', (e) => {
          this.$primaryContent.html(Highlighter.expression($(e.currentTarget).val() || '', undefined, DEFAULT_EXPRESSION_CONFIG).text);
      });

      this.$primary2.on('change input', (e) => {
          this.$primaryContent2.html(Highlighter.expression($(e.currentTarget).val() || '', undefined, DEFAULT_EXPRESSION_CONFIG).text);
      });

      this.$primaryIndex.dropdown({
          values: ['none', 'own', 'identifier', 'timestamp', 'group', 'prefix', 'tag'].map(v => {
              return {
                  name: v === 'none' ? this.intl('none') : v.charAt(0).toUpperCase() + v.slice(1),
                  value: v,
                  selected: v === 'none'
              };
          })
      }).dropdown('setting', 'onChange', (value) => {
          if (value === 'none') {
              this.$primaryOperator.closest('.field').addClass('disabled');
              this.$primary.val('').trigger('change').closest('.field').addClass('disabled');
              this.$primary2.val('').trigger('change').closest('.field').addClass('disabled');
          } else {
              this.$primaryOperator.closest('.field').removeClass('disabled');
              this.$primary.closest('.field').removeClass('disabled');
              if (this.$primaryOperator.dropdown('get value') === 'between') {
                  this.$primary2.closest('.field').removeClass('disabled');
              }
          }
      }).dropdown('set selected', 'none');

      this.$primaryOperator.dropdown('setting', 'onChange', (value) => {
          if (value === 'between') {
              this.$primary2.closest('.field').removeClass('disabled');
          } else {
              this.$primary2.closest('.field').addClass('disabled');
          }
      }).dropdown('set selected', 'equals');

      this.$slot.dropdown({
          values: [
              {
                  name: this.intl('default'),
                  value: ''
              },
              ... [1, 2, 3, 4, 5].map((i) => ({
                  name: i,
                  value: i
              }))
          ]
      }).dropdown('set selected', '');

      this.$primaryIndexG = this.$parent.find('[data-op="primary-index-g"]');
      this.$primaryOperatorG = this.$parent.find('[data-op="primary-operator-g"]');
      this.$primaryG = this.$parent.find('[data-op="primary-g"]');
      this.$primaryContentG = this.$parent.find('[data-op="primary-content-g"]');
      this.$primary2G = this.$parent.find('[data-op="primary-2-g"]');
      this.$primaryContent2G = this.$parent.find('[data-op="primary-content-2-g"]');

      this.$primaryG.on('change input', (e) => {
          this.$primaryContentG.html(Highlighter.expression($(e.currentTarget).val() || '', undefined, DEFAULT_EXPRESSION_CONFIG).text);
      });

      this.$primary2G.on('change input', (e) => {
          this.$primaryContent2G.html(Highlighter.expression($(e.currentTarget).val() || '', undefined, DEFAULT_EXPRESSION_CONFIG).text);
      });

      this.$primaryIndexG.dropdown({
          values: ['none', 'own', 'identifier', 'timestamp', 'prefix'].map(v => {
              return {
                  name: v === 'none' ? this.intl('none') : v.charAt(0).toUpperCase() + v.slice(1),
                  value: v,
                  selected: v === 'none'
              };
          })
      }).dropdown('setting', 'onChange', (value) => {
          if (value === 'none') {
              this.$primaryOperatorG.closest('.field').addClass('disabled');
              this.$primaryG.val('').trigger('change').closest('.field').addClass('disabled');
              this.$primary2G.val('').trigger('change').closest('.field').addClass('disabled');
          } else {
              this.$primaryOperatorG.closest('.field').removeClass('disabled');
              this.$primaryG.closest('.field').removeClass('disabled');
              if (this.$primaryOperatorG.dropdown('get value') === 'between') {
                  this.$primary2G.closest('.field').removeClass('disabled');
              }
          }
      }).dropdown('set selected', 'none');

      this.$primaryOperatorG.dropdown('setting', 'onChange', (value) => {
          if (value === 'between') {
              this.$primary2G.closest('.field').removeClass('disabled');
          } else {
              this.$primary2G.closest('.field').addClass('disabled');
          }
      }).dropdown('set selected', 'equals');

      this.$parent.find('[data-op="cancel"]').click(() => {
          this.close();
      });

      this.$parent.find('[data-op="save"]').click(() => {
          const slot = this.$slot.dropdown('get value');
          const primaryName = this.$primaryIndex.dropdown('get value');
          const primaryNameG = this.$primaryIndexG.dropdown('get value');
          const primaryMode = this.$primaryOperator.dropdown('get value');
          const primaryModeG = this.$primaryOperatorG.dropdown('get value');
          const primaryValue = this.$primary.val();
          const primaryValueG = this.$primaryG.val();
          const primaryValue2 = this.$primary2.val();
          const primaryValue2G = this.$primary2G.val();

          ProfileManager.setProfile(this.id, Object.assign(this.profile || {}, {
              name: this.$name.val() || `${this.intl('profile')} ${this.id}`,
              slot: slot,
              primary: primaryName === 'none' ? null : {
                  name: primaryName,
                  mode: primaryMode,
                  value: primaryMode === 'between' ? [ primaryValue, primaryValue2 ] : [ primaryValue ]
              },
              secondary: this.$secondary.val(),
              primary_g: primaryNameG === 'none' ? null : {
                  name: primaryNameG,
                  mode: primaryModeG,
                  value: primaryModeG === 'between' ? [ primaryValueG, primaryValue2G ] : [ primaryValueG ]
              },
              secondary_g: this.$secondaryG.val()
          }));
          this.close();
          this.callback();
      });
  }

  _applyArguments (callback, id) {
      this.callback = callback;
      this.id = id || SHA1(String(Date.now())).slice(0, 4);
      this.profile = undefined;

      if (id) {
          this.profile = ProfileManager.getProfile(id);

          const { name, primary, secondary, primary_g, secondary_g } = this.profile;
          this.$id.val(id);
          this.$slot.dropdown('set selected', this.profile.slot || '');

          if (primary) {
              const { mode, name, value } = primary;

              this.$primaryIndex.dropdown('set selected', name);
              this.$primaryOperator.dropdown('set selected', mode);
              this.$primary.val(value[0] || '').trigger('change');
              this.$primary2.val(value[1] || '').trigger('change');
          } else {
              this.$primaryIndex.dropdown('set selected', 'none');
              this.$primaryOperator.dropdown('set selected', 'equals');
              this.$primary.val('').trigger('change');
              this.$primary2.val('').trigger('change');
          }

          if (primary_g) {
              const { mode, name, value } = primary_g;

              this.$primaryIndexG.dropdown('set selected', name);
              this.$primaryOperatorG.dropdown('set selected', mode);
              this.$primaryG.val(value[0] || '').trigger('change');
              this.$primary2G.val(value[1] || '').trigger('change');
          } else {
              this.$primaryIndexG.dropdown('set selected', 'none');
              this.$primaryOperatorG.dropdown('set selected', 'equals');
              this.$primaryG.val('').trigger('change');
              this.$primary2G.val('').trigger('change');
          }

          this.$secondary.val(secondary).trigger('change');
          this.$secondaryG.val(secondary_g).trigger('change');
          this.$name.val(name || `${this.intl('profile')} ${id}`);
      } else {
          this.$id.val(this.id);
          this.$slot.dropdown('set selected', '');
          this.$primaryIndex.dropdown('set selected', 'none');
          this.$primaryIndexG.dropdown('set selected', 'none');
          this.$primaryOperator.dropdown('set selected', 'equals');
          this.$primaryOperatorG.dropdown('set selected', 'equals');
          this.$primary.val('').trigger('change');
          this.$primaryG.val('').trigger('change');
          this.$primary2.val('').trigger('change');
          this.$primary2G.val('').trigger('change');
          this.$secondary.val('').trigger('change');
          this.$secondaryG.val('').trigger('change');
          this.$name.val('');
      }
  }
})();

const TemplateSaveDialog = new (class TemplateSaveDialog extends Dialog {
  constructor () {
      super({
          key: 'template_save',
          dismissable: true
      });
  }

  _createModal () {
      return `
          <div class="very small bordered inverted dialog">
              <div class="header">${this.intl('title')}</div>
              <div class="ui inverted form">
                  <div class="field">
                      <label>${this.intl('select')}:</label>
                      <div class="ui search selection inverted dropdown" data-op="dropdown">
                          <div class="text"></div>
                          <i class="dropdown icon"></i>
                      </div>
                  </div>
              </div>
              <div class="ui two fluid buttons">
                  <button class="ui black button" data-op="cancel">${this.intl('cancel')}</button>
                  <button class="ui button !color-black !background-orange" data-op="save">${this.intl('save')}</button>
              </div>
          </div>
      `;
  }

  _createBindings () {
      this.$parent.find('[data-op="cancel"]').click(() => {
          this.close();
      });

      this.$parent.find('[data-op="save"]').click(() => {
          this.callback(this._getName());
          this.close();
      });

      this.$dropdown = this.$parent.find('[data-op="dropdown"]');
  }

  _getName () {
      const dropdownText = this.$dropdown.dropdown('get value');

      return dropdownText.trim() || `New template (${_formatDate(Date.now())})`;
  }

  _applyArguments (name, callback) {
      this.callback = callback;

      this.$dropdown.dropdown({
          allowAdditions: true,
          hideAdditions: false,
          placeholder: this.intl('select'),
          values: TemplateManager.sortedList().map(({ name }) => {
              return {
                  value: name,
                  name
              }
          })
      }).dropdown('set selected', name || '');
  }
})();

const DataManageDialog = new (class DataManageDialog extends Dialog {
  constructor () {
      super({
          key: 'data_manage',
          opacity: 0
      });
  }

  _createModal () {
      return `
          <div class="small bordered inverted dialog">
              <div class="header">${this.intl('title')}</div>
              <div class="overflow-y-auto" style="max-height: 60vh;">
                  <div class="ui form" data-op="content"></div>
              </div>
              <div class="ui inverted checkbox ml-8" data-op="checkbox">
                  <input type="checkbox"><label>${this.intl('skip_next')}</label>
              </div>
              <div class="ui two fluid buttons">
                  <button class="ui black button" data-op="cancel">${this.intl('cancel')}</button>
                  <button class="ui button !text-black !background-orange" data-op="ok">${this.intl('ok')}</button>
              </div>
          </div>
      `;
  }

  _createBindings () {
      this.$cancelButton = this.$parent.find('[data-op="cancel"]');
      this.$cancelButton.click(() => {
          this.close();
          this.callback();
      });

      this.$okButton = this.$parent.find('[data-op="ok"]');
      this.$okButton.click(() => {
          this.close();

          if (this.$checkbox.checkbox('is checked')) {
              SiteOptions.unsafe_delete = true;
          }

          DatabaseManager.safeRemove(this.data, () => this.callback(), true);
      });

      this.$content = this.$parent.find('[data-op="content"]');
      this.$checkbox = this.$parent.find('[data-op="checkbox"]');
  }

  _applyArguments (data, callback) {
      this.callback = callback;
      this.data = Object.assign({ identifiers: [], timestamps: [], instances: [] }, data);

      let { identifiers, timestamps, instances } = this.data;
      let content = '';

      if (timestamps.length > 0) {
          content += `
              <div>
                  <h3>${this.intl('label.file')}</h3>
                  <ul>
                      ${timestamps.map(ts => `<li style="margin-bottom: 5px;">${_formatDate(ts)}</li>`).join('')}
                  </ul>
              </div>
          `;
      }

      let players = [];
      let groups = [];

      if (identifiers.length > 0) {
          players.push(
              ...identifiers.filter(id => DatabaseManager.isPlayer(id)).map(id => DatabaseManager.Players[id].Latest.Data).map(({ prefix, name, timestamp }) => ({ prefix: _formatPrefix(prefix), name, timestamp: _formatDate(timestamp) }))
          )

          groups.push(
              ...identifiers.filter(id => DatabaseManager.isGroup(id)).map(id => DatabaseManager.Groups[id].Latest.Data).map(({ prefix, name, timestamp }) => ({ prefix: _formatPrefix(prefix), name, timestamp: _formatDate(timestamp) }))
          )
      }

      if (instances.length > 0) {
          players.push(
              ...instances.filter(({ identifier }) => DatabaseManager.isPlayer(identifier)).map(({ prefix, name, timestamp }) => ({ prefix: _formatPrefix(prefix), name, timestamp: _formatDate(timestamp) }))
          )

          groups.push(
              ...instances.filter(({ identifier }) => DatabaseManager.isGroup(identifier)).map(({ prefix, name, timestamp }) => ({ prefix: _formatPrefix(prefix), name, timestamp: _formatDate(timestamp) }))
          )
      }

      if (players.length > 0) {
          content += `
              <div>
                  <h3>${this.intl('label.player')}</h3>
                  <ul class="px-12">
                      ${players.map(({ name, prefix, timestamp }) => `<li style="margin-bottom: 5px;" class="flex justify-content-between"><div>${prefix} - ${name}</div><div>${timestamp}</div></li>`).join('')}
                  </ul>
              </div>
          `;
      }

      if (groups.length > 0) {
          content += `
              <div>
                  <h3>${this.intl('label.group')}</h3>
                  <ul class="px-12">
                      ${groups.map(({ name, prefix, timestamp }) => `<li style="margin-bottom: 5px;" class="flex justify-content-between"><div>${prefix} - ${name}</div><div>${timestamp}</div></li>`).join('')}
                  </ul>
              </div>
          `;
      }

      this.$content.html(content);

      this.$checkbox.checkbox('set unchecked');
  }
})();

const ImportFileDialog = new (class ImportFileDialog extends Dialog {
  _createModal () {
      return `
          <div class="very small inverted dialog">
              <div class="left header">${intl('stats.files.online.title')}</div>
              <div class="text-center">
                  <p>${intl('stats.files.online.prompt')}</p>
                  <div class="ui fluid inverted centered input">
                      <input type="text" placeholder="" data-op="input">
                  </div>
                  <p data-op="error" class="text-red mt-4">${intl('stats.files.online.invalid')}</p>
              </div>
              <div class="ui fluid two buttons">
                  <div class="ui black button" data-op="cancel">${intl('stats.files.online.cancel')}</div>
                  <div class="ui button !text-black !background-orange" data-op="ok">${intl('stats.files.online.ok')}</div>
              </div>
          </div>
      `;
  }

  _update (file) {
      this._setLoading(false);

      if (file) {
          this.close();
          Loader.toggle(true);
          DatabaseManager.import(JSON.parse(file).data).then(() => {
              this.callback();
          });
      } else {
          this.$field.addClass('error').transition('shake');
          this.$error.show();
      }
  }

  _setLoading (loading) {
      this.$error.hide();
      this.$field.removeClass('error');

      if (loading) {
          this.$ok.addClass('loading disabled');
          this.$cancel.addClass('disabled');
          this.$input.attr('readonly', '');
      } else {
          this.$ok.removeClass('loading disabled');
          this.$cancel.removeClass('disabled');
          this.$input.removeAttr('readonly');
      }
  }

  _createBindings () {
      this.$input = this.$parent.operator('input');
      this.$field = this.$input.parent();

      this.$error = this.$parent.operator('error');

      this.$cancel = this.$parent.operator('cancel');
      this.$cancel.click(() => {
          this.close();
      })

      this.$ok = this.$parent.operator('ok');
      this.$ok.click(() => {
          const key = this.$input.val().trim();
          if (key) {
              this._setLoading(true);

              SiteAPI.get('file_get', { key }).then(({ file }) => {
                  this._update(file.content);
              }).catch(() => {
                  this._update();
              });
          } else {
              this.$field.addClass('error').transition('shake');
          }
      });
  }

  _applyArguments (callback) {
      this.callback = callback;

      this._setLoading(false);
      this.$input.val('');
  }
})();

const ExportFileDialog = new (class ExportFileDialog extends Dialog {
    _createModal () {
        return `
            <div class="small bordered inverted dialog">
                <div class="header">${intl('stats.share.title')}</div>
                <div class="height: 17em;">
                    <div class="ui inverted form" data-op="form">
                        <div class="field" data-op="file-container">
                            <label>${intl('stats.share.file')}</label>
                            <div class="ui selection inverted dropdown" data-op="file">
                                <div class="text"></div>
                                <i class="dropdown icon"></i>
                            </div>
                        </div>
                        <div class="field">
                            <label>${intl('stats.share.format')}</label>
                            <div class="ui selection inverted dropdown" data-op="format">
                                <div class="text"></div>
                                <i class="dropdown icon"></i>
                            </div>
                        </div>
                        <div class="field !mt-6">
                            <div class="ui inverted checkbox" data-op="public">
                                <input type="checkbox" name="public">
                                <label for="public">${intl('stats.share.public')}</label>
                            </div>
                        </div>
                    </div>
                    <div data-op="code-container">
                        <div class="mt-6">
                            <h4 class="ui inverted header">${intl('stats.share.code')}:</h4>
                            <div class="text-center">
                                <code style="white-space: pre;" data-op="code"></code>
                            </div>
                        </div>
                        <div class="text-gray mt-6">${intl('stats.share.expire')}</div>
                    </div>
                </div>
                <div class="ui fluid two buttons">
                    <div class="ui black button" data-op="cancel">${intl('dialog.shared.cancel')}</div>
                    <div class="ui button !text-black !background-orange" data-op="ok">${intl('stats.share.get')}</div>
                </div>
            </div>
        `;
    }

    _createBindings () {
        this.$format = this.$parent.operator('format');
        this.$format.dropdown({
            values: ['json', 'code', 'code_reusable'].map((value, i) => ({ value, name: intl(`stats.share.formats.${value}`), selected: i === 0 }))
        });

        this.$public = this.$parent.operator('public');
        this.$public.checkbox('set unchecked');
        
        this.$codeContainer = this.$parent.operator('code-container');
        this.$code = this.$parent.operator('code');

        this.$fileContainer = this.$parent.operator('file-container');
        this.$file = this.$parent.operator('file');

        this.$cancel = this.$parent.operator('cancel');
        this.$cancel.click(() => {
            this.close();
        });

        this.$ok = this.$parent.operator('ok');
        this.$ok.click(() => {
            this._exportOrClose();
        });

        this.$form = this.$parent.operator('form');
    }

    async _exportFile () {
        const fileGetter = typeof this.files === 'function' ? this.files : this.files[this.$file.dropdown('get value')];
        const file = await fileGetter();

        const filePublic = this.$public.checkbox('is checked');
        if (filePublic) {
            for (const [index, group] of Object.entries(file.groups)) {
                if (group.own) {
                    file.groups[index] = ModelUtils.toOtherGroup(group);
                }
            }

            for (const [index, player] of Object.entries(file.players)) {
                if (player.own) {
                    file.players[index] = ModelUtils.toOtherPlayer(player);
                }
            }
        }

        return file;
    }

    _exportOrClose () {
        const mode = this.$format.dropdown('get value');
        if (mode === 'json') {
            this._setLoading(true);
            this._exportFile().then((data) => {
                Exporter.json(
                    data,
                    `${this.filesPrefix || 'export'}_${Exporter.time}`
                )

                this._setLoading(false);
                this.close();
            })
        } else if (this.code) {
            this.close();
        } else {
            const reusable = this.$format.dropdown('get value') === 'code_reusable';

            this._setLoading(true);
            this._publish(reusable);
        }
    }

    _applyArguments (files, filesPrefix) {
        this.files = files;
        this.filesPrefix = filesPrefix;
        this.code = null;

        if (typeof this.files === 'function') {
            this.$fileContainer.hide();
        } else {
            const keys = Object.keys(this.files)

            this.$fileContainer.show();
            this.$file.dropdown({
                values: keys.map((value) => ({ value, name: intl(`stats.share.files.${value}`), selected: value === keys[0] }))
            })
        }

        this.$public.checkbox(SiteOptions.export_public_only ? 'set checked' : 'set unchecked');
        this.$ok.text(intl('stats.share.get'))
        this.$codeContainer.hide();
        this.$form.show();
    }

    _setLoading (loading) {
        if (loading) {
            this.$ok.addClass('loading disabled');
            this.$cancel.addClass('disabled');
        } else {
            this.$ok.removeClass('loading disabled');
            this.$cancel.removeClass('disabled');
        }
    }

    async _publish (reusable) {
        SiteAPI.post('file_create', {
            content: JSON.stringify({ data: await this._exportFile() }),
            multiple: reusable
        }).then(({ file }) => {
            this._setLoading(false);

            if (file.key) {
                this.code = file.key;
    
                this.$form.hide();
                this.$codeContainer.show();
                this.$code.text(file.key);

                this.$ok.text(intl('dialog.shared.ok'));
            } else {
                this.$ok.transition('shake');
            }
        }).catch(() => {
            this._setLoading(false);
            this.$ok.transition('shake');
        })
    }
})();

const ScriptRepositoryDialog = new (class ScriptRepositoryDialog extends Dialog {
  constructor () {
      super({
          key: 'script_repository',
          dismissable: true
      })
  }

  _createModal () {
      return `
          <div class="inverted big bordered dialog">
              <div class="header flex justify-content-between items-center">
                  <div>${this.intl('title')}</div>
                  <i class="ui small link close icon" data-op="close"></i>
              </div>
              <div class="ui inverted form" style="margin-bottom: -1em;">
                <div class="field">
                    <label></label>
                    <div class="ui inverted icon input">
                        <i class="search icon"></i>
                        <input type="text" data-op="list-search" placeholder="${this.intl('search')}">
                    </div>
                </div>
              </div>
              <div class="gap-2 overflow-y-scroll" style="height: 60vh; display: grid; grid-template-columns: repeat(2, 49%); align-content: start;" data-op="list"></div>
              <div class="ui inverted form">
                  <div class="field">
                      <label>${this.intl('private_code.label')}</label>    
                      <div class="ui inverted icon input">
                          <input type="text" placeholder="${this.intl('private_code.placeholder')}" data-op="code">
                          <i class="ui sign in alternate link icon" data-op="code-submit"></i>
                      </div>
                  </div>
              </div>
          </div>
      `;
  }

  _createBindings () {
      this.$list = this.$parent.operator('list');
      
      this.$listSearch = this.$parent.operator('list-search');
      this.$listSearch.on('input', () => {
          this.#updateSearch();
      })

      this.$close = this.$parent.operator('close');
      this.$close.click(() => {
          this.close();
      });

      this.$code = this.$parent.operator('code');
      this.$codeSubmit = this.$parent.operator('code-submit');

      const codeSubmit = () => {
          const key = this.$code.val().trim();
          if (key) {
              this._fetchScript(key).catch(() => {
                  this.$code.closest('.field').addClass('error').transition('shake');
              });
          } else {
              this.$code.closest('.field').addClass('error').transition('shake');
          }
      }

      this.$codeSubmit.click(() => codeSubmit());
      this.$code.keypress((event) => {
          if (event.which === 13) {
              codeSubmit();
          }
      });
    }

  _fetchScript (key) {
      return SiteAPI.get('script_get', { key }).then(({ script }) => {
          this._applyScript(script.content);
      });
  }

  _applyScript (script) {
      this.callback(script);
      this.close();
  }

  #updateSearch () {
    const value = this.$listSearch.val().toLowerCase();

    this.$parent.find('[data-script-name]').each((_, element) => {
        if (element.dataset.scriptName.toLowerCase().startsWith(value)) {
            element.style.display = 'flex';
        } else {
            element.style.display = 'none';
        }
    })
  }

  _createSegment (key, name, author, version, createdAt) {
      return `
          <div data-script-key="${key}" data-script-name="${name}" class="!border-radius-1 border-gray p-4 background-dark:hover cursor-pointer flex gap-2 items-center" style="height: 90px;">
              <i class="ui big ${DefaultScripts.exists(key) ? 'archive' : 'globe'} disabled icon mr-2"></i>
              <div>    
                  <div>${name}</div>
                  <div class="text-gray mt-1">${intl('dialog.script_repository.list.about', { author })}</div>
                  ${version ? `<div class="text-gray">v${version} - ${_formatDate(Date.parse(createdAt))}</div>` : ''}
              </div>
          </div>
      `;
  }

  _showOnline (scripts) {
      let content = '';
      for (const { author, description, key, version, date } of _sortDesc(scripts, (script) => Date.parse(script.date))) {
          content += this._createSegment(key, description, author, version, date);
      }

      this.$list.append(content);
      this._updateListeners();
  }

  _applyArguments (callback) {
      this.callback = callback;

      let content = '';
      for (const [type, { author, description }] of DefaultScripts.entries()) {
          if (author) {
              content += this._createSegment(type, description, author, null, null);
          }
      }

      this.$list.html(content);
      this.$listSearch.val('');

      this._updateListeners();

      const cache = Store.shared.get('templateCache', { content: [], expire: 0 });
      if (cache.expire < Date.now()) {
          SiteAPI.get('script_list').then(({ scripts }) => {
              Store.shared.set('templateCache', {
                  content: scripts,
                  expire: Date.now() + 3600000
              });

              this._showOnline(scripts);
          }).catch(() => {
              this.$list.append(`
                  <div>
                      <b>${intl('stats.scripts.online.not_available')}</b>
                  </div>
              `)
          })
      } else {
          this._showOnline(cache.content);
      }
  }

  _updateListeners () {
      const $items = this.$list.find('[data-script-key]');
      $items.off('click').on('click', (event) => {
          const key = event.currentTarget.dataset.scriptKey;
          if (DefaultScripts.exists(key)) {
              this._applyScript(DefaultScripts.getContent(key));
          } else {
              const $icon = $(event.currentTarget).find('i').removeClass('archive globe').addClass('loading sync');
              this._fetchScript(key).catch(() => {
                  $icon.removeClass('loading sync').addClass('text-red warning');
              });
          }
      });
  }
})();

const ScriptArchiveDialog = new (class ScriptArchiveDialog extends Dialog {
  constructor () {
      super({
          key: 'script_archive',
          dismissable: true
      })
  }

  _createModal () {
      return `
          <div class="inverted small bordered dialog">
              <div class="header flex justify-content-between items-center">
                  <div>${this.intl('title')}</div>
                  <i class="ui small link close icon" data-op="close"></i>
              </div>
              <div class="flex flex-col gap-2 overflow-y-scroll" style="height: 50vh;" data-op="list"></div>
              <div class="ui black fluid button" data-op="clear">${this.intl('clear')}</div>
          </div>
      `;
  }

  _createBindings () {
      this.$list = this.$parent.operator('list');

      this.$clear = this.$parent.operator('clear');
      this.$clear.click(() => {
          ScriptArchive.clear();
          this.callback(true);
          this.close();
      })

      this.$close = this.$parent.operator('close');
      this.$close.click(() => {
          this.close();
      });
  }

  _getIcon (type) {
      if (type === 'create') {
          return 'plus';
      } else if (type === 'overwrite') {
          return 'pencil alternate';
      } else if (type === 'save') {
          return 'save';
      } else if (type === 'remove') {
          return 'trash alternate outline';
      } else if (type === 'discard' ) {
          return 'recycle';
      } else {
          return 'question';
      }
  }

  _getColor (type) {
    return '';
  }

  _scriptName (name) {
    if (name) {
        return Scripts.findScript(name)?.name || name;
    } else {
        return this.intl('unknown');
    }
  }

  _createSegment (type, name, version, timestamp, temporary) {
      return `
          <div data-archive-key="${timestamp}" class="!border-radius-1 border-gray p-4 background-dark:hover cursor-pointer flex gap-2 items-center">
              <i class="ui big ${this._getIcon(type)} disabled icon"></i>
              <div>
                  <div>${this.intl(`types.${type}`)}${temporary ? ` ${this.intl('item.temporary')}` : ''}: ${_escape(this._scriptName(name))}</div>
                  <div class="text-gray">v${isNaN(version) ? 1 : version} - ${this.intl(`item.description`, { change: _formatDate(timestamp), expire: _formatDate(timestamp + ScriptArchive.dataExpiry) })}</div>
              </div>
              <i class="ui large !ml-auto copy outline text-gray text-white:hover icon" title="${intl('editor.copy')}" data-archive-copy="${timestamp}"></i>
          </div>
      `;
  }

  _applyArguments (callback) {
      this.callback = callback;

      let content = '';
      for (const { type, name, version, timestamp, temporary } of ScriptArchive.all()) {
          content += this._createSegment(type, name, version, timestamp, temporary);
      }

      this.$list.html(content);
      this.$list.find('[data-archive-key]').on('click', (event) => {
          this.callback(ScriptArchive.get(event.currentTarget.dataset.archiveKey));

          this.close();
      });
      this.$list.find('[data-archive-copy]').on('click', (event) => {
        _stopAndPrevent(event);

        copyText(ScriptArchive.get(event.currentTarget.dataset.archiveCopy));

        Toast.info(this.intl('title'), this.intl('copy_toast'))``
      })
  }
})();

const ScriptCreateDialog = new (class ScriptCreateDialog extends Dialog {
    constructor () {
        super({
            key: 'script_create',
            dismissable: true
        })
    }

    _createModal () {
        return `
            <div class="ui small bordered inverted dialog">
                <div class="header flex justify-content-between items-center">
                    <div>${this.intl('title')}</div>
                    <i class="ui small link close icon" data-op="close"></i>
                </div>
                <div class="ui inverted form">
                    <div class="field">
                        <label>${this.intl('name')}</label>
                        <div class="ui inverted input">
                            <input type="text" data-op="name">
                        </div>
                    </div>
                    <div class="field">
                        <label>${this.intl('description')}</label>
                        <div class="ui inverted input">
                            <textarea rows="3" data-op="description"></textarea>
                        </div>
                    </div>
                    <div class="field">
                        <label>${this.intl('source')}</label>
                        <div class="ui fluid selection inverted search dropdown" data-op="source">
                            <div class="text"></div>
                            <i class="dropdown icon"></i>
                        </div>
                    </div>
                </div>
                <div class="ui fluid two buttons">
                    <div class="ui black button" data-op="close">${intl('dialog.shared.cancel')}</div>
                    <div class="ui button !text-black !background-orange" data-op="create">${this.intl('create')}</div>
                </div>
            </div>
        `;
    }

    _createBindings () {
        this.$close = this.$parent.operator('close');
        this.$close.click(() => {
            this.close();
        });

        this.$name = this.$parent.operator('name');
        this.$description = this.$parent.operator('description');
        this.$source = this.$parent.operator('source');

        this.$create = this.$parent.operator('create');
        this.$create.click(() => {
            const name = this.$name.val().trim();
            const description = this.$description.val().trim();

            const source = this.$source.dropdown('get value');

            if (name && source) {
                this.callback(name, description, this._getContentFromSource(source), source);
                this.close();
            }
        });
    }

    _getContentFromSource (source) {
        switch (source) {
            case '_empty': return '';
            case '_current': return this.editorContent;
            case '_player': return DefaultScripts.getContent('player');
            case '_group': return DefaultScripts.getContent('group');
            case '_players': return DefaultScripts.getContent('players');
            default: {
                return Scripts.getContent(source);
            }
        }
    }

    _applyArguments (editorContent, contentLock, callback) {
        this.editorContent = editorContent;
        this.callback = callback;

        this.$name.val(`New script ${_formatDate(Date.now())}`);

        this.$source.dropdown({
            values: [
                { value: '_empty', name: this.intl('content.empty'), icon: 'minus' },
                { value: '_current', name: this.intl('content.current'), icon: 'minus' },
                { type: 'header', name: this.intl('category.defaults') },
                { value: '_players', name: this.intl('content.players'), icon: 'database' },
                { value: '_group', name: this.intl('content.group'), icon: 'archive' },
                { value: '_player', name: this.intl('content.player'), icon: 'user' },
                { type: 'header', name: this.intl('category.clone') },
                ...Scripts.sortedList().map((script) => ({ value: script.key, name: script.name, icon: 'archive' }))
            ]
        });

        this.$source.dropdown('set selected', contentLock || '_current');
        
        if (contentLock) {
            this.$source.addClass('disabled');
        } else {
            this.$source.removeClass('disabled');
        }
    }
})

const ScriptManageDialog = new (class ScriptManageDialog extends Dialog {
  constructor () {
      super({
          key: 'script_manage',
          dismissable: true
      })
  }

  _createModal () {
      return `
        <div class="ui small bordered inverted dialog">
            <div class="header flex justify-content-between items-center">
                <div>${this.intl('title')}</div>
                <i class="ui small link close icon" data-op="close"></i>
            </div>
            <div class="ui inverted form">
                <div class="field">
                    <h3 class="ui inverted header">${this.intl('category.general')}</h3>
                </div>
                <div class="field">
                    <label>${this.intl('script.name')}</label>
                    <div class="ui inverted centered input">
                        <input type="text" data-field="name">
                    </div>
                </div>
                <div class="field">
                    <label>${this.intl('script.description')}</label>
                    <div class="ui inverted input">
                        <textarea rows="3" data-field="description"></textarea>
                    </div>
                </div>
                <div class="three fields">
                    <div class="field">
                        <label>${this.intl('script.created_at')}</label>
                        <div class="ui inverted centered input">
                            <input type="text" readonly data-field="created_at">
                        </div>
                    </div>
                    <div class="field">
                        <label>${this.intl('script.updated_at')}</label>
                        <div class="ui inverted centered input">
                            <input type="text" readonly data-field="updated_at">
                        </div>
                    </div>
                    <div class="field">
                        <label>${this.intl('script.version')}</label>
                        <div class="ui inverted centered input">
                            <input type="text" readonly data-field="version">
                        </div>
                    </div>
                </div>
                <div class="field">
                    <label>${this.intl('script.tables')}</label>
                    <div class="ui fluid selection inverted multiple dropdown" data-field="tables">
                        <div class="text"></div>
                        <i class="dropdown icon"></i>
                    </div>
                </div>
                <div class="field !mt-8">
                    <h3 class="ui inverted header">${this.intl('category.remote')}</h3>
                </div>
                <div class="three fields">
                    <div class="field">
                        <label>${this.intl('script.remote_synchronized_at')}</label>
                        <div class="ui inverted centered input">
                            <input type="text" readonly data-field="remote.synchronized_at">
                        </div>
                    </div>
                    <div class="field">
                        <label>${this.intl('script.remote_key')}</label>
                        <div class="ui inverted centered input">
                            <input type="text" readonly data-field="remote.key">
                        </div>
                    </div>
                    <div class="field">
                        <label>${this.intl('script.remote_version')}</label>
                        <div class="ui inverted centered input">
                            <input type="text" readonly data-field="remote.version">
                        </div>
                    </div>
                </div>
                <div class="two fields">
                    <div class="field">
                        <div class="ui basic inverted fluid button" data-op="action-remote-add">
                            <i class="ui cloud upload alternate icon"></i> ${this.intl('action.remote_add')}
                        </div>
                        <div class="ui basic inverted fluid button" data-op="action-remote-update">
                            <i class="ui sync alternate icon"></i> ${this.intl('action.remote_update')}
                        </div>
                    </div>
                    <div class="field">
                        <div class="ui basic inverted fluid button" data-op="action-remote-remove">
                            <i class="ui cloud download alternate icon"></i> ${this.intl('action.remote_remove')}
                        </div>
                    </div>
                </div>
            </div>
        </div>
      `;
  }

  _createBindings () {
    this.$close = this.$parent.operator('close');
    this.$close.click(() => {
        this.close();
    });

    this.$fields = this.$parent.find('[data-field]');

    this.$nameField = this.$parent.find('[data-field="name"]');
    this.$nameField.on('input change', () => {
        const name = this.$nameField.val().trim();
        
        if (name) {
            this.script = Scripts.update(this.script.key, { name }, false);
      
            this.callback();
        }
    });

    this.$descriptionField = this.$parent.find('[data-field="description"]');
    this.$descriptionField.on('input change', () => {
      this.script = Scripts.update(this.script.key, {
        description: this.$descriptionField.val().trim()
      }, false);

      this.callback();
    });

    this.$tablesField = this.$parent.find('[data-field="tables"]');
    this.$tablesField.dropdown({
        placeholder: this.intl('script.tables'),
        values: [
            { value: 'players', name: intl('stats.scripts.targets.players'), icon: 'database' },
            { value: 'group', name: intl('stats.scripts.targets.group'), icon: 'archive' },
            { value: 'player', name: intl('stats.scripts.targets.player'), icon: 'user' }
        ],
        onChange: () => {
            this.script = Scripts.update(this.script.key, {
                tables: this.$tablesField.dropdown('get values')
            }, false);

            this.callback();
        }
    })

    this.$remoteAdd = this.$parent.operator('action-remote-add');
    this.$remoteUpdate = this.$parent.operator('action-remote-update');
    this.$remoteRemove = this.$parent.operator('action-remote-remove');

    // Bindings
    this.$remoteAdd.click(() => {
      const { key, name, content } = this.script;

      this.$remoteAdd.addClass('loading disabled');

      SiteAPI.post('script_create', { description: name, author: 'unknown', content }).then(({ script: { key: remoteKey, secret: remoteSecret } }) => {
        this.script = Scripts.remoteAdd(key, remoteKey, remoteSecret);
      }).catch(({ error }) => {
        this.#error(error);
      }).finally(() => {
        this.$remoteAdd.removeClass('loading disabled');
        
        this.#refresh();
      });
    });

    this.$remoteUpdate.click(() => {
      const { key, name, content, remote: { key: remoteKey, secret: remoteSecret } } = this.script;

      this.$remoteUpdate.addClass('loading disabled');
      this.$remoteRemove.addClass('disabled');
      
      SiteAPI.post('script_update', { description: name, content, key: remoteKey, secret: remoteSecret }).then(({ script: { key: remoteKey, secret: remoteSecret } }) => {
        this.script = Scripts.remoteAdd(key, remoteKey, remoteSecret);
      }).catch(({ error }) => {
        this.#error(error);
      }).finally(() => {
        this.$remoteUpdate.removeClass('loading disabled');
        this.$remoteRemove.removeClass('disabled');
        
        this.#refresh();
      });
    });

    this.$remoteRemove.click(() => {
      const { key, remote: { key: remoteKey, secret: remoteSecret } } = this.script;

      this.$remoteUpdate.addClass('disabled');
      this.$remoteRemove.addClass('loading disabled');

      SiteAPI.get('script_delete', { key: remoteKey, secret: remoteSecret }).then(() => {
        this.script = Scripts.remoteRemove(key);
      }).catch(({ error }) => {
        this.#error(error);
      }).finally(() => {
        this.$remoteUpdate.removeClass('disabled');
        this.$remoteRemove.removeClass('loading disabled');

        this.#refresh();
      });
    });
  }

  #error (reason) {
    Toast.error(this.intl('error'), reason);
  }

  #refresh () {
    this.$fields.each((_, element) => {
      const field = element.dataset.field;
      const value = _dig(this.script, ...field.split('.'));

      if (field.endsWith('_at')) {
        element.value = _formatDate(value);
      } else if (field.endsWith('version') && value) {
        element.value = `v${value}`;
      } else if (field === 'tables') {
        this.$tablesField.dropdown('clear', true);
        this.$tablesField.dropdown('set selected', value || ['players', 'group', 'player'], true);
      } else {
        element.value = value || '';
      }
    });

    if (this.script.remote) {
      this.$remoteAdd.hide();
      this.$remoteUpdate.show();
      this.$remoteRemove.removeClass('disabled');

      if (this.script.version === this.script.remote.version) {
        this.$remoteUpdate.addClass('disabled');
      } else {
        this.$remoteUpdate.removeClass('disabled');
      }
    } else {
      this.$remoteAdd.show();
      this.$remoteUpdate.hide();
      this.$remoteRemove.addClass('disabled');
    }
  }

  _applyArguments (key, callback) {
    this.script = Scripts.findScript(key);
    this.callback = callback;

    this.#refresh();
  }
})();

const PlayerDetailDialog = new (class PlayerDetailDialog extends Dialog {
  constructor () {
    super({
      dismissable: true,
      containerClass: '!items-start'
    })
  }

  intl (key) {
    return intl(`stats.player.${key}`);
  }

  _createModal () {
    return `
      <div class="medium big basic inverted dialog mt-8">
      <i class="ui large link close icon position-fixed" style="right: 1.5em; top: 1.5em;" data-op="close"></i>
        <div data-op="content" class="position-relative" style="line-height: 1.4;"></div>
      </div>
    `;
  }

  _createBindings () {
    this.$close = this.$parent.operator('close');
    this.$close.click(() => this.close());
    
    this.$content = this.$parent.operator('content');
  }

  _applyArguments ({ identifier, timestamp, reference }) {
    let playerObject = DatabaseManager.getPlayer(identifier);
    let timestampsReverse = playerObject.List.map((p) => p.Timestamp).reverse(); // Newest to oldest
    let timestamps = playerObject.List.map((p) => p.Timestamp); // Oldest to newest
    let timestampCurrent = timestamps.find(t => t <= timestamp) || playerObject.LatestTimestamp;
    let timestampReference = timestampsReverse.find(t => t >= reference && t <= timestampCurrent);
    if (!timestampReference) {
        timestampReference = timestampCurrent;
    }

    let player = DatabaseManager.getPlayer(identifier, timestampCurrent);
    let compare = DatabaseManager.getPlayer(identifier, timestampReference);

    var diff = player.Timestamp != compare.Timestamp;
    var asDiff = (a, b, formatter) => {
        if (a != b && b != undefined && a != undefined) {
            var fnum = formatter ? formatter(a - b) : (a - b);
            return ` <span>${ a - b > 0 ? `+${ fnum }` : fnum }</span>`;
        } else {
            return '';
        }
    }

    this.$content.html(`
        <div class="detail-top">
            <img class="ui image" src="${_classImageUrl(player.Class)}">
            <h1 class="ui header">${ player.Level } - ${ player.Name }</h1>
        </div>
        <div class="detail-timestamp">
            ${ _formatDate(player.Timestamp) }${ diff ? ` - ${ _formatDate(compare.Timestamp) }` : '' }
        </div>
        <div class="detail-identifier">
            ${ player.Identifier }
        </div>
        <div class="detail-content">
            <div class="detail-panel">
                <!-- Player -->
                <div class="detail-entry" style="border-bottom: white solid 1px;">
                    <div class="detail-item">${this.intl('attributes')}</div>
                </div>
                <div class="detail-entry">
                    <div class="detail-item">${intl('general.attribute1')}</div>
                    <div class="detail-item text-center">${ formatAsSpacedNumber(player.Strength.Total) }${ asDiff(player.Strength.Total, compare.Strength.Total, formatAsSpacedNumber) }</div>
                </div>
                <div class="detail-entry">
                    <div class="detail-item">${intl('general.attribute2')}</div>
                    <div class="detail-item text-center">${ formatAsSpacedNumber(player.Dexterity.Total) }${ asDiff(player.Dexterity.Total, compare.Dexterity.Total, formatAsSpacedNumber) }</div>
                </div>
                <div class="detail-entry">
                    <div class="detail-item">${intl('general.attribute3')}</div>
                    <div class="detail-item text-center">${ formatAsSpacedNumber(player.Intelligence.Total) }${ asDiff(player.Intelligence.Total, compare.Intelligence.Total, formatAsSpacedNumber) }</div>
                </div>
                <div class="detail-entry">
                    <div class="detail-item">${intl('general.attribute4')}</div>
                    <div class="detail-item text-center">${ formatAsSpacedNumber(player.Constitution.Total) }${ asDiff(player.Constitution.Total, compare.Constitution.Total, formatAsSpacedNumber) }</div>
                </div>
                <div class="detail-entry">
                    <div class="detail-item">${intl('general.attribute5')}</div>
                    <div class="detail-item text-center">${ formatAsSpacedNumber(player.Luck.Total) }${ asDiff(player.Luck.Total, compare.Luck.Total, formatAsSpacedNumber) }</div>
                </div>
                <br/>
                <div class="detail-entry" style="border-bottom: white solid 1px;">
                    <div class="detail-item">${this.intl('basis')}</div>
                </div>
                <div class="detail-entry">
                    <div class="detail-item">${intl('general.attribute1')}</div>
                    <div class="detail-item text-center">${ formatAsSpacedNumber(player.Strength.Base) }${ asDiff(player.Strength.Base, compare.Strength.Base, formatAsSpacedNumber) }</div>
                </div>
                <div class="detail-entry">
                    <div class="detail-item">${intl('general.attribute2')}</div>
                    <div class="detail-item text-center">${ formatAsSpacedNumber(player.Dexterity.Base) }${ asDiff(player.Dexterity.Base, compare.Dexterity.Base, formatAsSpacedNumber) }</div>
                </div>
                <div class="detail-entry">
                    <div class="detail-item">${intl('general.attribute3')}</div>
                    <div class="detail-item text-center">${ formatAsSpacedNumber(player.Intelligence.Base) }${ asDiff(player.Intelligence.Base, compare.Intelligence.Base, formatAsSpacedNumber) }</div>
                </div>
                <div class="detail-entry">
                    <div class="detail-item">${intl('general.attribute4')}</div>
                    <div class="detail-item text-center">${ formatAsSpacedNumber(player.Constitution.Base) }${ asDiff(player.Constitution.Base, compare.Constitution.Base, formatAsSpacedNumber) }</div>
                </div>
                <div class="detail-entry">
                    <div class="detail-item">${intl('general.attribute5')}</div>
                    <div class="detail-item text-center">${ formatAsSpacedNumber(player.Luck.Base) }${ asDiff(player.Luck.Base, compare.Luck.Base, formatAsSpacedNumber) }</div>
                </div>
                <br/>
                <div class="detail-entry" style="border-bottom: white solid 1px;">
                    <div class="detail-item">${this.intl('miscellaneous')}</div>
                </div>
                <div class="detail-entry">
                    <div class="detail-item">${this.intl('armor')}</div>
                    <div class="detail-item text-center">${ formatAsSpacedNumber(player.Armor) }${ asDiff(player.Armor, compare.Armor, formatAsSpacedNumber) }</div>
                </div>
                <div class="detail-entry">
                    <div class="detail-item">${this.intl('damage')}</div>
                    <div class="detail-item text-center">${ formatAsSpacedNumber(player.Damage.Min) } - ${ formatAsSpacedNumber(player.Damage.Max) }</div>
                </div>
                ${ player.Class == ASSASSIN ? `
                    <div class="detail-entry">
                        <div class="detail-item"></div>
                        <div class="detail-item text-center">${ formatAsSpacedNumber(player.Damage2.Min) } - ${ formatAsSpacedNumber(player.Damage2.Max) }</div>
                    </div>
                ` : '' }
                <br/>
                <div class="detail-entry">
                    <div class="detail-item">${this.intl('health')}</div>
                    <div class="detail-item text-center">${ formatAsSpacedNumber(player.Health) }</div>
                </div>
                ${ player.Potions[0].Size ? `
                    <br/>
                    <div class="detail-entry" style="border-bottom: white solid 1px;">
                        <div class="detail-item">${this.intl('potions')}</div>
                    </div>
                    ${player.Potions.map(potion => {
                        if (potion.Size) {
                            return `
                                <div class="detail-entry">
                                    <div class="detail-item">${intl(`general.potion${potion.Type}`)}</div>
                                    <div class="detail-item text-center">+ ${potion.Size}%</div>
                                </div>
                            `;
                        } else {
                            return '';
                        }
                    }).join('')}
                ` : '' }
            </div>
            <div class="detail-panel">
                ${ player.hasGuild() ? `
                    <div class="detail-entry" style="border-bottom: white solid 1px;">
                        <div class="detail-item">${this.intl('guild')}</div>
                    </div>
                    <div class="detail-entry">
                        <div class="detail-item">${this.intl('name')}</div>
                        <div class="detail-item text-center">${ player.Group.Name }</div>
                    </div>
                    ${ player.Group.Role ? `
                        <div class="detail-entry">
                            <div class="detail-item">${this.intl('role')}</div>
                            <div class="detail-item text-center">${intl(`general.rank${player.Group.Role}`)}</div>
                        </div>
                    ` : '' }
                    <div class="detail-entry">
                        <div class="detail-item">${this.intl('joined_on')}</div>
                        <div class="detail-item text-center">${ _formatDate(player.Group.Joined) }</div>
                    </div>
                    <br/>
                ` : '' }
                <!-- Group -->
                <div class="detail-entry" style="border-bottom: white solid 1px;">
                    <div class="detail-item">${this.intl('bonuses')}</div>
                </div>
                <div class="detail-entry">
                    <div class="detail-item">${this.intl('scrapbook')}</div>
                    <div class="detail-item text-center">${ player.Book } / ${ PlayerModel.SCRAPBOOK_COUNT }${ asDiff(player.Book, compare.Book, formatAsSpacedNumber) }</div>
                </div>
                ${ player.Own || player.Achievements.Owned > 0 ? `
                    <div class="detail-entry">
                        <div class="detail-item">${this.intl('achievements')}</div>
                        <div class="detail-item text-center">${ player.Achievements.Owned } / ${ PlayerModel.ACHIEVEMENTS_COUNT }${ asDiff(player.Achievements.Owned, compare.Achievements.Owned, formatAsSpacedNumber) }</div>
                    </div>
                ` : '' }
                ${ player.Mount ? `
                    <div class="detail-entry">
                        <div class="detail-item">${this.intl('mount')}</div>
                        <div class="detail-item text-center">${ player.MountValue }%</div>
                    </div>
                ` : '' }
                <div class="detail-entry">
                    <div class="detail-item">${this.intl('heath_bonus')}</div>
                    <div class="detail-item text-center">${ player.Dungeons.Player }%${ asDiff(player.Dungeons.Player, compare.Dungeons.Player) }</div>
                </div>
                <div class="detail-entry">
                    <div class="detail-item">${this.intl('damage_bonus')}</div>
                    <div class="detail-item text-center">${ player.Dungeons.Group }%${ asDiff(player.Dungeons.Group, compare.Dungeons.Group) }</div>
                </div>
                ${ player.Group && player.Group.Treasure ? `
                    <div class="detail-entry">
                        <div class="detail-item">${this.intl('treasure')}</div>
                        <div class="detail-item text-center">${ player.Group.Treasure }${ asDiff(player.Group.Treasure, compare.Group.Treasure) }</div>
                    </div>
                ` : '' }
                ${ player.Group && player.Group.Instructor ? `
                    <div class="detail-entry">
                        <div class="detail-item">${this.intl('instructor')}</div>
                        <div class="detail-item text-center">${ player.Group.Instructor }${ asDiff(player.Group.Instructor, compare.Group.Instructor) }</div>
                    </div>
                ` : '' }
                ${ player.Group && player.Group.Pet ? `
                    <div class="detail-entry">
                        <div class="detail-item">${this.intl('pet')}</div>
                        <div class="detail-item text-center">${ player.Group.Pet }${ asDiff(player.Group.Pet, compare.Group.Pet) }</div>
                    </div>
                ` : '' }
                ${ player.Fortress && player.Fortress.Knights ? `
                    <div class="detail-entry">
                        <div class="detail-item">${this.intl('knights')}</div>
                        <div class="detail-item text-center">${ player.Fortress.Knights }${ asDiff(player.Fortress.Knights, compare.Fortress.Knights) }</div>
                    </div>
                ` : '' }
                <br/>
                <div class="detail-entry" style="border-bottom: white solid 1px;">
                    <div class="detail-item">${this.intl('runes.title')}</div>
                </div>
                ${ player.Runes.Gold ? `
                    <div class="detail-entry">
                        <div class="detail-item">${intl('general.rune1')}</div>
                        <div class="detail-item text-center">+ ${ player.Runes.Gold }%</div>
                    </div>
                ` : '' }
                ${ player.Runes.XP ? `
                    <div class="detail-entry">
                        <div class="detail-item">${intl('general.rune4')}</div>
                        <div class="detail-item text-center">+ ${ player.Runes.XP }%</div>
                    </div>
                ` : '' }
                ${ player.Runes.Chance ? `
                    <div class="detail-entry">
                        <div class="detail-item">${intl('general.rune2')}</div>
                        <div class="detail-item text-center">+ ${ player.Runes.Chance }%</div>
                    </div>
                ` : '' }
                ${ player.Runes.Quality ? `
                    <div class="detail-entry">
                        <div class="detail-item">${intl('general.rune3')}</div>
                        <div class="detail-item text-center">+ ${ player.Runes.Quality }</div>
                    </div>
                ` : '' }
                ${ player.Runes.Health ? `
                    <div class="detail-entry">
                        <div class="detail-item">${intl('general.rune5')}</div>
                        <div class="detail-item text-center">+ ${ player.Runes.Health }%</div>
                    </div>
                ` : '' }
                ${ player.Runes.DamageFire || player.Runes.Damage2Fire ? `
                    <div class="detail-entry">
                        <div class="detail-item">${intl('general.rune10')}</div>
                        <div class="detail-item text-center">+ ${ player.Runes.DamageFire }%${ player.Class == 4 ? ` / ${ player.Runes.Damage2Fire }%` : '' }</div>
                    </div>
                ` : '' }
                ${ player.Runes.DamageCold || player.Runes.Damage2Cold ? `
                    <div class="detail-entry">
                        <div class="detail-item">${intl('general.rune11')}</div>
                        <div class="detail-item text-center">+ ${ player.Runes.DamageCold }%${ player.Class == 4 ? ` / ${ player.Runes.Damage2Cold }%` : '' }</div>
                    </div>
                ` : '' }
                ${ player.Runes.DamageLightning || player.Runes.Damage2Lightning ? `
                    <div class="detail-entry">
                        <div class="detail-item">${intl('general.rune12')}</div>
                        <div class="detail-item text-center">+ ${ player.Runes.DamageLightning }%${ player.Class == 4 ? ` / ${ player.Runes.Damage2Lightning }%` : '' }</div>
                    </div>
                ` : '' }
                ${ player.Runes.ResistanceFire ? `
                    <div class="detail-entry">
                        <div class="detail-item">${intl('general.rune6')}</div>
                        <div class="detail-item text-center">+ ${ player.Runes.ResistanceFire }%</div>
                    </div>
                ` : '' }
                ${ player.Runes.ResistanceCold ? `
                    <div class="detail-entry">
                        <div class="detail-item">${intl('general.rune7')}</div>
                        <div class="detail-item text-center">+ ${ player.Runes.ResistanceCold }%</div>
                    </div>
                ` : '' }
                ${ player.Runes.ResistanceLightning ? `
                    <div class="detail-entry">
                        <div class="detail-item">${intl('general.rune8')}</div>
                        <div class="detail-item text-center">+ ${ player.Runes.ResistanceLightning }%</div>
                    </div>
                ` : '' }
            </div>
            <div class="detail-panel">
                <!-- Fortress -->
                <div class="detail-entry" style="border-bottom: white solid 1px;">
                    <div class="detail-item">${this.intl('fortress.title')}</div>
                </div>
                <div class="detail-entry">
                    <div class="detail-item">${this.intl('fortress.upgrades')}</div>
                    <div class="detail-item text-center">${ player.Fortress.Upgrades }${ asDiff(player.Fortress.Upgrades, compare.Fortress.Upgrades) }</div>
                </div>
                <div class="detail-entry">
                    <div class="detail-item">${this.intl('fortress.rank')}</div>
                    <div class="detail-item text-center">${ player.Fortress.Rank }${ asDiff(player.Fortress.Rank, compare.Fortress.Rank) }</div>
                </div>
                <div class="detail-entry">
                    <div class="detail-item">${this.intl('fortress.honor')}</div>
                    <div class="detail-item text-center">${ player.Fortress.Honor }${ asDiff(player.Fortress.Honor, compare.Fortress.Honor) }</div>
                </div>
                <br/>
                <div class="detail-entry">
                    <div class="detail-item">${this.intl('fortress.building1')}</div>
                    <div class="detail-item text-center">${ player.Fortress.Fortress }${ asDiff(player.Fortress.Fortress, compare.Fortress.Fortress) }</div>
                </div>
                <div class="detail-entry">
                    <div class="detail-item">${this.intl('fortress.building2')}</div>
                    <div class="detail-item text-center">${ player.Fortress.LaborerQuarters }${ asDiff(player.Fortress.LaborerQuarters, compare.Fortress.LaborerQuarters) }</div>
                </div>
                <div class="detail-entry">
                    <div class="detail-item">${this.intl('fortress.building3')}</div>
                    <div class="detail-item text-center">${ player.Fortress.WoodcutterGuild }${ asDiff(player.Fortress.WoodcutterGuild, compare.Fortress.WoodcutterGuild) }</div>
                </div>
                <div class="detail-entry">
                    <div class="detail-item">${this.intl('fortress.building4')}</div>
                    <div class="detail-item text-center">${ player.Fortress.Quarry }${ asDiff(player.Fortress.Quarry, compare.Fortress.Quarry) }</div>
                </div>
                <div class="detail-entry">
                    <div class="detail-item">${this.intl('fortress.building5')}</div>
                    <div class="detail-item text-center">${ player.Fortress.GemMine }${ asDiff(player.Fortress.GemMine, compare.Fortress.GemMine) }</div>
                </div>
                <div class="detail-entry">
                    <div class="detail-item">${this.intl('fortress.building6')}</div>
                    <div class="detail-item text-center">${ player.Fortress.Academy }${ asDiff(player.Fortress.Academy, compare.Fortress.Academy) }</div>
                </div>
                <div class="detail-entry">
                    <div class="detail-item">${this.intl('fortress.building7')}</div>
                    <div class="detail-item text-center">${ player.Fortress.ArcheryGuild }${ asDiff(player.Fortress.ArcheryGuild, compare.Fortress.ArcheryGuild) } (${ player.Fortress.ArcheryGuild * 2 }x ${ player.Fortress.Archers }${ asDiff(player.Fortress.Archers, compare.Fortress.Archers) })</div>
                </div>
                <div class="detail-entry">
                    <div class="detail-item">${this.intl('fortress.building8')}</div>
                    <div class="detail-item text-center">${ player.Fortress.Barracks }${ asDiff(player.Fortress.Barracks, compare.Fortress.Barracks) } (${ player.Fortress.Barracks * 3 }x ${ player.Fortress.Warriors }${ asDiff(player.Fortress.Warriors, compare.Fortress.Warriors) })</div>
                </div>
                <div class="detail-entry">
                    <div class="detail-item">${this.intl('fortress.building9')}</div>
                    <div class="detail-item text-center">${ player.Fortress.MageTower }${ asDiff(player.Fortress.MageTower, compare.Fortress.MageTower) } (${ player.Fortress.MageTower }x ${ player.Fortress.Mages }${ asDiff(player.Fortress.Mages, compare.Fortress.Mages) })</div>
                </div>
                <div class="detail-entry">
                    <div class="detail-item">${this.intl('fortress.building10')}</div>
                    <div class="detail-item text-center">${ player.Fortress.Treasury }${ asDiff(player.Fortress.Treasury, compare.Fortress.Treasury) }</div>
                </div>
                <div class="detail-entry">
                    <div class="detail-item">${this.intl('fortress.building11')}</div>
                    <div class="detail-item text-center">${ player.Fortress.Smithy }${ asDiff(player.Fortress.Smithy, compare.Fortress.Smithy) }</div>
                </div>
                <div class="detail-entry">
                    <div class="detail-item">${this.intl('fortress.building12')}</div>
                    <div class="detail-item text-center">${ player.Fortress.Fortifications }${ asDiff(player.Fortress.Fortifications, compare.Fortress.Fortifications) } (${ player.Fortress.Wall }${ asDiff(player.Fortress.Wall, compare.Fortress.Wall) })</div>
                </div>
                ${ player.Fortress.Upgrade.Building >= 0 ? `
                    <br/>
                    <div class="detail-entry" style="border-bottom: white solid 1px;">
                        <div class="detail-item">${this.intl('fortress.working')}</div>
                    </div>
                    <div class="detail-entry">
                        <div class="detail-item">${this.intl(`fortress.building${player.Fortress.Upgrade.Building + 1}`)}</div>
                        <div class="detail-item text-center">${ _formatDate(player.Fortress.Upgrade.Finish) }</div>
                    </div>
                ` : '' }
                ${ player.Own ? `
                    <br/>
                    <div class="detail-entry" style="border-bottom: white solid 1px;">
                        <div class="detail-item">${this.intl('extras.title')}</div>
                    </div>
                    <div class="detail-entry">
                        <div class="detail-item">${this.intl('extras.registered')}</div>
                        <div class="detail-item text-center">${ _formatDate(player.Registered) }</div>
                    </div>
                    ${ player.WebshopID ? `
                        <div class="detail-entry">
                            <div class="detail-item">${this.intl('extras.webshopid')}</div>
                            <div class="detail-item text-center hover-to-display">
                                <div class="to-display">${ player.WebshopID }</div>
                                <div class="to-hover">${this.intl('extras.webshopid_placeholder')}</div>    
                            </div>
                        </div>
                    ` : '' }
                ` : '' }
            </div>
        </div>
    `);
  }
})()

const EditorShortcutsDialog = new (class EditorShortcutsDialog extends Dialog {
    constructor () {
        super({
            dismissable: true,
            opacity: 0,
            key: 'editor_shortcuts'
        })
    }

    _createModal () {
        const SHORTCUTS = [
            'ctrl_space',
            'ctrl_s',
            'ctrl_shift_s',
            'tab',
            'shift_tab',
            'ctrl_shift_x',
            'ctrl_c',
            'ctrl_v',
            'ctrl_x'
        ];

        return `
            <div class="small inverted bordered dialog">
                <div class="header flex justify-content-between items-center">
                    <div>${this.intl('title')}</div>
                    <i class="ui small link close icon" data-op="close"></i>
                </div>
                <div class="flex w-full overflow-y-scroll flex-col gap-4" style="height: 50vh">
                    ${
                        SHORTCUTS.map((shortcut) => {
                            return `
                                <div>
                                    <div class="font-bold">${this.intl(`shortcuts.${shortcut}.key`)}</div>
                                    <div class="text-gray">&bullet; ${this.intl(`shortcuts.${shortcut}.description`).replaceAll('>', '>&bullet; ')}</div>
                                </div>
                            `;
                        }).join('')
                    }
                </div>
            </div>
        `;
    }
    
    _createBindings () {
        this.$close = this.$parent.operator('close');
        this.$close.click(() => {
            this.close();
        });
    }
})

const ScriptManualDialog = new (class ScriptManualDialog extends Dialog {
    constructor () {
        super({
            dismissable: true,
            opacity: 0,
            key: 'script_manual'
        })
    }

    _createModal () {
        let content = '';
        let navigation = '';

        const data = [
            [
                'command',
                'ta-keyword',
                _sortDesc(ScriptCommands.keys().map((key) => ScriptCommands[key]), (command) => command.metadata.isDeprecated ? 0 : 1).map((command) => {
                    return `
                        ${command.syntax.encodedText.replace(/(&lt;[a-z\|]+&gt;)/g, '<span class="ta-constant">$1</span>').replace(/(\([a-z\|]+\))/g, '<span class="ta-value">$1</span>')}
                        ${command.metadata.isDeprecated ? ` <sup class="text-gray">(${this.intl('deprecated')})</sup>` : ''}
                    `
                })
            ],
            [
                'header',
                'ta-reserved-public',
                TABLE_EXPRESSION_CONFIG.all('header', 'public')
            ],
            [
                'header_protected',
                'ta-reserved-protected',
                TABLE_EXPRESSION_CONFIG.all('header', 'protected')
            ],
            [
                'header_private',
                'ta-reserved-private',
                TABLE_EXPRESSION_CONFIG.all('header', 'private')
            ],
            [
                'header_scoped',
                'ta-reserved-scoped',
                TABLE_EXPRESSION_CONFIG.all('accessor')
            ],
            [
                'function',
                'ta-function',
                TABLE_EXPRESSION_CONFIG.all('function')
            ],
            [
                'variable',
                'ta-constant',
                TABLE_EXPRESSION_CONFIG.all('variable')
            ],
            [
                'enum',
                'ta-enum',
                TABLE_EXPRESSION_CONFIG.all('enumeration')
            ],
            [
                'constant',
                'ta-constant',
                Constants.DEFAULT.keys(),
                Constants.DEFAULT.Values
            ]
        ];

        for (const [type, klass, list, descriptions] of data) {
            let innerContent = '';
            for (const item of list) {
                const key = item.replace(/([A-Z])/g, ' $1').toLowerCase().replace(/ /g, '_').replace(/_{2,}/, '_').replace(/^_/, '');
                const description = (descriptions ? descriptions.get(item) : false) || (Localization.hasTranslation(`dialog.script_manual.description.${type}.${key}`) ? this.intl(`description.${type}.${key}`) : false);

                innerContent += `<div>${item}${description ? `<br><span class="text-gray font-monospace">${description}</span>` : ''}</div>`
            }

            navigation += `
                <div data-item="${type}" data-class="${klass}" class="!border-radius-1 border-gray p-4 background-dark:hover cursor-pointer flex gap-2 items-center">
                    <div>${this.intl(`heading.${type}`)}</div>
                </div>
            `;

            content += `
                <div data-page="${type}" class="flex flex-col gap-4">${innerContent}</div>
            `;
        }

        return `
            <div class="big inverted bordered dialog">
                <div class="header flex justify-content-between items-center">
                    <div>${this.intl('title')}</div>
                    <i class="ui small link close icon" data-op="close"></i>
                </div>
                <div class="flex w-full" style="height: 70vh;">
                    <div class="flex flex-col gap-2 pr-2" data-op="navigation" style="width: 33%; border-right: 1px solid #262626;">${navigation}</div>
                    <div class="overflow-y-scroll p-4" style="width: 67%; border-top: 1px solid #262626;">${content}</div>
                </div>
            </div>
        `
    }

    _showPage (name) {
        this.$pages.hide();
        this.$pages.filter(`[data-page="${name}"]`).show();

        this.$items.each((i, obj) => {
            obj.classList[obj.dataset.item === name ? 'add' : 'remove'](obj.dataset.class);
        })
    }

    _createBindings () {
        this.$close = this.$parent.operator('close');
        this.$close.click(() => {
            this.close();
        });

        this.$pages = this.$parent.find('[data-page]');

        this.$items = this.$parent.find('[data-item]');
        this.$items.click((event) => {
            this._showPage(event.currentTarget.dataset.item);
        });
    }

    _applyArguments () {
        this._showPage(this.$items.first().attr('data-item'));
    }
})()
