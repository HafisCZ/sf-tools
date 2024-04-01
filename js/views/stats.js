class ManageLinkDialog extends Dialog {
    static OPTIONS = {
        key: 'manage_link',
        opacity: 0,
        dismissable: true
    }

    render () {
        return `
            <div class="small bordered inverted dialog">
                <div class="left header">${this.intl('title')}</div>
                <div class="flex flex-col gap-4" data-op="link">
                    <div class="font-bold">${this.intl('link.heading1')}</div>
                    <div class="flex flex-col gap-1" data-op="list1"></div>
                    <div class="font-bold">${this.intl('link.heading2')}</div>
                    <div class="flex flex-col gap-1" data-op="list2"></div>
                    <br>
                    <div><i class="ui text-orange exclamation triangle icon"></i> ${this.intl('link.warning')}</div>
                </div>
                <div class="flex flex-col gap-4" data-op="unlink">
                    <div class="font-bold">${this.intl('unlink.heading1')}</div>
                    <div class="flex flex-col gap-1" data-op="list1"></div>
                    <div class="font-bold">${this.intl('unlink.heading2')}</div>
                    <div class="flex flex-col gap-1" data-op="list2"></div>
                    <br>
                    <div><i class="ui text-orange exclamation triangle icon"></i> ${this.intl('unlink.warning')}</div>
                </div>
                <div class="ui two fluid buttons">
                    <button class="ui black button" data-op="cancel">${intl('dialog.shared.cancel')}</button>
                    <button class="ui button !text-black !background-orange" data-op="save">${intl('dialog.shared.apply')}</button>
                </div>
            </div>
        `;
    }

    #createItem ({ Identifier: identifier, Prefix: prefix, Name: name }) {
        return `
            <div class="border-gray p-2 !border-radius-1 flex">
                <div style="flex: 0 0 50%;"><i class="ui ${DatabaseManager.isPlayer(identifier) ? 'user' : 'archive'} icon"></i> ${name}</div>
                <div style="flex: 0 0 50%;">${prefix}</div>
            </div>
        `;
    }

    handle (linkIds) {
        this.$link = this.$parent.operator('link');
        this.$unlink = this.$parent.operator('unlink');

        this.$parent.find('[data-op="cancel"]').click(() => {
            this.close(false);
        });

        this.$parent.operator('save').click(async () => {
            if (this.objects.length > 1) {
                // Link objects together
                await DatabaseManager.link(
                    this.objects.map((object) => object.Latest.LinkId),
                    this.objects[0].Latest.LinkId
                );
            } else {
                // Unlink objects
                await DatabaseManager.unlink(
                    this.objects[0].Latest.LinkId
                );
            }

            this.close(true);
        })

        this.objects = _sortDesc(linkIds.map((linkId) => DatabaseManager.getAny(linkId)), (object) => object.LatestTimestamp);

        if (linkIds.length > 1) {
            // Link
            this.$link.show();
            this.$unlink.hide();

            this.$link.operator('list1').html(this.objects.flatMap((object) => Object.values(object.Links).map((link) => this.#createItem(link))).join(''));
            this.$link.operator('list2').html(this.#createItem(this.objects[0].Latest));
        } else {
            // Unlink
            this.$link.hide();
            this.$unlink.show();

            this.$unlink.operator('list1').html(this.#createItem(this.objects[0].Latest));
            this.$unlink.operator('list2').html(Object.values(this.objects[0].Links).map((link) => this.#createItem(link)).join(''));
        }
    }
}

class FileEditDialog extends Dialog {
  static OPTIONS = {
    key: 'file_edit',
    opacity: 0
  }

  render () {
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

  handle (timestamp) {
      this.$parent.find('[data-op="cancel"]').click(() => {
        this.close(false)
      });

      this.$parent.find('[data-op="save"]').click(async () => {
          const newTimestamp = Math.trunc(_parseDate(this.$timestamp.val()) / 60000);
          if (newTimestamp && newTimestamp != this.truncatedTimestamp) {
            this.hide();

            Loader.toggle(true);

            await DatabaseManager.updateTimestamp(this.sourceTimestamp, newTimestamp * 60000);

            this.close(true)
          } else {
            this.close(false)
          }
      });

      this.$timestamp = this.$parent.find('[data-op="timestamp"]')

      this.sourceTimestamp = timestamp;
      this.truncatedTimestamp = Math.trunc(timestamp / 60000);
      this.$timestamp.val(_formatDate(timestamp));
  }
}

class TagDialog extends Dialog {
  static OPTIONS = {
    key: 'edit_file_tag',
    opacity: 0
  }

  render () {
      return `
        <div class="small bordered inverted dialog">
          <div class="header">${this.intl('title')}</div>
          <div class="ui inverted form">
            <div class="field">
              <label>${this.intl('current')}</label>
              <div style="overflow-y: auto; height: 30vh;">
                <div data-op="tags" class="flex flex-wrap gap-2"></div>
              </div>
            </div>
            <div class="field">
              <label>${this.intl('insert.title')}</label>
              <div class="ui icon right action inverted input">
                <input type="text" placeholder="${this.intl('insert.placeholder')}" data-op="insert-input">
                <div class="ui inverted basic compact button" data-inverted="" data-op="insert-button" data-tooltip="${this.intl('insert.tooltip')}">
                  <i class="fitted plus icon"></i>
                </div>
              </div>
            </div>
          </div>
          <div class="ui three fluid buttons">
            <button class="ui black button" data-op="cancel">${this.intl('cancel')}</button>
            <button class="ui black button" data-op="clear">${this.intl('clear')}</button>
            <button class="ui button !text-black !background-orange" data-op="save">${intl('dialog.shared.apply')}</button>
          </div>
        </div>
      `;
  }

  #insertTag () {
    const name = this.$insertInput.val().trim();
    if (name) {
      _pushUnlessIncludes(this.tags, name);
      this.#renderTags();

      this.$insertInput.val('');
    }
  }

  handle (type, array) {
    this.$tags = this.$parent.operator('tags');
    this.$tags.click((event) => {
      if (event.target.nodeName === 'I') {
        this.tags.splice(+event.target.closest('[data-tag]').dataset.tag, 1);
        this.#renderTags();
      }
    })

    this.$clear = this.$parent.operator('clear');
    this.$clear.click(() => {
      this.tags = [];
      this.#renderTags();
    })

    this.$insertInput = this.$parent.operator('insert-input');
    this.$insertInput.keydown((event) => {
        if (event.originalEvent.key === 'Enter') {
            this.#insertTag()
        }
    });

    this.$insertButton = this.$parent.operator('insert-button');
    this.$insertButton.click(() => this.#insertTag());

    this.$parent.find('[data-op="cancel"]').click(() => {
      this.close(false)
    });

    this.$parent.find('[data-op="save"]').click(async () => {
      const instances = this.#getInstances();

      Loader.toggle(true);

      await DatabaseManager.setTags(instances, this.tags);

      this.close(true);
    });

    this.type = type;
    this.array = array;

    this.$insertInput.val('');

    this.tags = this.#getTags();

    this.#renderTags();
  }

  #getInstances () {
    if (this.type === 'timestamps') {
        const { players, groups } = DatabaseManager.getFile(undefined, this.array);

        return [
            ...players,
            ...groups
        ]
    } else {
        return this.array;
    }
  }

  #renderTags () {
    let html = '';

    for (let i = 0; i < this.tags.length; i++) {
      const tag = this.tags[i]

      html += `
        <div data-tag="${i}" class="flex items-center" style="background-color: ${_strToHSL(tag)}; color: white; border-radius: 0.5em; padding: 0.5em 0.75em 0.5em 1em;">
          <div>${tag}</div>
          <div class="!ml-4 flex items-center">
            <i class="cursor-pointer fitted ui text-black close icon"></i>
          </div>
        </div>
      `;
    }

    this.$tags.html(html);
  }

  #getTags () {
    if (this.type === 'timestamps') {
      return Object.keys(DatabaseManager.getTagsForTimestamp(this.array));
    } else {
      return _uniq(this.array.flatMap((instance) => _wrapOrEmpty(instance.tag)));
    }
  }
}

class ProfileCreateDialog extends Dialog {
  static OPTIONS = {
    key: 'profile_create',
    opacity: 0
  }

  render () {
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

  handle (id) {
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
        this.close(false);
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

          this.close(true);
      });

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
}

class DataManageDialog extends Dialog {
  static OPTIONS = {
    key: 'data_manage',
    opacity: 0
  }

  render () {
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

  handle (rawData) {
      const data = Object.assign({ identifiers: [], timestamps: [], instances: [] }, rawData)

      this.$cancelButton = this.$parent.find('[data-op="cancel"]');
      this.$cancelButton.click(() => {
          this.close(false);
      });

      this.$okButton = this.$parent.find('[data-op="ok"]');
      this.$okButton.click(async () => {
          if (this.$checkbox.checkbox('is checked')) {
              SiteOptions.unsafe_delete = true;
          }

          this.hide();

          await DatabaseManager.safeRemove(data, true)

          this.close(true)
      });

      this.$content = this.$parent.find('[data-op="content"]');
      this.$checkbox = this.$parent.find('[data-op="checkbox"]');

      let { identifiers, timestamps, instances } = data;
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
  }
}

class ImportFileDialog extends Dialog {
  render () {
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

  #update (file) {
      this.#setLoading(false);

      if (file) {
          this.hide();

          Loader.toggle(true);

          DatabaseManager.import(JSON.parse(file).data).then(() => {
              this.close(true);
          });
      } else {
          this.$field.addClass('error').transition('shake');
          this.$error.show();
      }
  }

  #setLoading (loading) {
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

  handle () {
    this.$input = this.$parent.operator('input');
    this.$field = this.$input.parent();

    this.$error = this.$parent.operator('error');

    this.$cancel = this.$parent.operator('cancel');
    this.$cancel.click(() => {
      this.close(false);
    })

    this.$ok = this.$parent.operator('ok');
    this.$ok.click(() => {
        const key = this.$input.val().trim();
        if (key) {
            this.#setLoading(true);

            SiteAPI.get('file_get', { key }).then(({ file }) => {
                this.#update(file.content);
            }).catch(() => {
                this.#update();
            });
        } else {
            this.$field.addClass('error').transition('shake');
        }
    });

    this.#setLoading(false);
  }
}

class ExportFileDialog extends Dialog {
    render () {
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

    handle (files, filesPrefix) {
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
          this.close(false);
      });

      this.$ok = this.$parent.operator('ok');
      this.$ok.click(() => {
          this.#exportOrClose();
      });

      this.$form = this.$parent.operator('form');

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

    async #exportFile () {
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

    #exportOrClose () {
        const mode = this.$format.dropdown('get value');
        if (mode === 'json') {
            this.#setLoading(true);
            this.#exportFile().then((data) => {
                Exporter.json(
                    data,
                    `${this.filesPrefix || 'export'}_${Exporter.time}`
                )

                this.#setLoading(false);
                this.close(true)
            })
        } else if (this.code) {
            this.close(false)
        } else {
            const reusable = this.$format.dropdown('get value') === 'code_reusable';

            this.#setLoading(true);
            this.#publish(reusable);
        }
    }

    #setLoading (loading) {
        if (loading) {
            this.$ok.addClass('loading disabled');
            this.$cancel.addClass('disabled');
        } else {
            this.$ok.removeClass('loading disabled');
            this.$cancel.removeClass('disabled');
        }
    }

    async #publish (reusable) {
        SiteAPI.post('file_create', {
            content: JSON.stringify({ data: await this.#exportFile() }),
            multiple: reusable
        }).then(({ file }) => {
            this.#setLoading(false);

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
            this.#setLoading(false);
            this.$ok.transition('shake');
        })
    }
}

class ScriptRepositoryDialog extends Dialog {
  static OPTIONS = {
    key: 'script_repository',
    dismissable: true
  }

  render () {
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
              <div class="gap-2 overflow-y-scroll flex flex-col" style="height: 60vh; padding-right: 0.5em;" data-op="list"></div>
              <div class="overflow-y-scroll flex flex-col items-center justify-content-center" style="height: 60vh; padding-right: 0.5em;" data-op="list-add">
                <div class="flex flex-col gap-4" style="width: 50%;">
                  <div class="ui inverted form">
                    <div class="field">
                      <label>${this.intl('list_add_key')}</label>
                      <div class="ui inverted centered input">
                        <input type="text" maxlength="12" data-op="list-add-key">
                      </div>
                    </div>
                    <div class="ui inverted checkbox mb-4" data-op="list-add-create">
                        <input type="checkbox"><label>${this.intl('list_add_create')}</label>
                    </div>
                  </div>
                  <div class="ui fluid two buttons gap-2">
                    <div class="ui black button" data-op="list-add-cancel">${intl('dialog.shared.cancel')}</div>
                    <div class="ui !text-black !background-orange button" data-op="list-add-accept">${this.intl('list_add_accept')}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
      `;
  }

  #showListAdd (show) {
    if (show) {
      this.$list.hide();
      this.$listAdd.show();

      this.$listAddKey.val('').focus();

      this.$listAddCreate.checkbox('set checked');

      this.$listSearch.parent('.input').addClass('disabled');
    } else {
      this.$list.show();
      this.$listAdd.hide();

      this.$listSearch.parent('.input').removeClass('disabled');
    }
  }

  handle () {
    this.$list = this.$parent.operator('list');
    this.$listAdd = this.$parent.operator('list-add');
    this.$listAddKey = this.$parent.operator('list-add-key');
    this.$listAddKey.on('keydown', (event) => {
      if (event.originalEvent.key === 'Enter') {
          this.$listAddAccept.click();
      }
    })

    this.$listAddCreate = this.$parent.operator('list-add-create');
    this.$listAddCreate.checkbox();

    this.$listAddCancel = this.$listAdd.operator('list-add-cancel');
    this.$listAddCancel.click(() => {
      this.#showListAdd(false);
    });

    this.$listAddAccept = this.$listAdd.operator('list-add-accept');
    this.$listAddAccept.click(async () => {
      const key = this.$listAddKey.val();

      this.$listAddAccept.addClass('loading disabled');
      this.$listAddCancel.addClass('disabled');

      try {
        const script = await SiteAPI.get('script_info', { key }).then(({ script }) => script);

        StoreCache.invalidate('remote_scripts');

        Scripts.remoteAdd(script.key, { version: script.version, updated_at: Date.parse(script.updated_at) });

        if (this.$listAddCreate.checkbox('is checked')) {
          const { script } = await SiteAPI.get('script_get', { key });

          this.#createScript(script);
        } else {
          this.#showListAdd(false);

          this.#resetList();
          this.#loadList();
        }
      } catch (e) {
        Toast.error(this.intl('error_fetch.title'), this.intl('error_fetch.message'));
      }

      this.$listAddAccept.removeClass('loading disabled');
      this.$listAddCancel.removeClass('disabled');
    })
    
    this.$listSearch = this.$parent.operator('list-search');
    this.$listSearch.on('input', () => {
        this.#updateSearch();
    })

    this.$close = this.$parent.operator('close');
    this.$close.click(() => {
        this.close(false)
    });

    this.$list.click((event) => {
      const realTarget = event.target;
      const realContainer = realTarget.closest('[data-script-key], [data-script-add]');
      
      if (!realContainer || realTarget.closest('.ui.input')) {
        return;
      }
      
      const key = realContainer.dataset.scriptKey;
      if (realTarget.closest('.ui.button')) {
        Scripts.remoteRemove(key);

        StoreCache.invalidate('remote_scripts');

        realContainer.remove();
      } else if (key) {
        this.hide()

        Loader.toggle(true);

        if (DefaultScripts.exists(key)) {
          this.#createScript(DefaultScripts.get(key));
        } else {
          SiteAPI.get('script_get', { key }).then(({ script }) => this.#createScript(script)).catch(() => Toast.error(this.intl('error_fetch.title'), this.intl('error_fetch.message')))
        }
      } else {
        this.#showListAdd(true);
      }
    })

    this.#showListAdd(false);

    this.$listSearch.val('');

    this.#resetList();
    this.#loadList();
  }

  #createScript (script) {
    Loader.toggle(false);

    this.replace(
        [
            ScriptEditDialog,
            _pick(script, ['name', 'description', 'content']),
            '_current'
        ],
        ([value, _script]) => {
            if (value) {
                const { key } = Scripts.create(_script);
    
                return [true, key];
            } else {
                return [false];
            }
        }
    )
  }

  #updateSearch () {
    const value = _escape(this.$listSearch.val().toLowerCase());

    this.$parent.find('[data-script-name]').each((_, element) => {
        if (element.dataset.scriptName.toLowerCase().includes(value)) {
            element.style.display = 'grid';
        } else {
            element.style.display = 'none';
        }
    })
  }

  #createInputSegment () {
    return `
      <div data-script-add data-script-name="" class="!border-radius-1 border-gray text-gray p-4 background-dark:hover cursor-pointer gap-2 border-dashed" style="min-height: 80px; display: grid; grid-template-columns: 98%;">
        <div class="flex gap-2 items-center justify-content-center pointer-events-none">
          <i class="ui big plus disabled icon"></i>
          <div>${this.intl('list_add')}</div>
        </div>
      </div>
    `
  }

  #createSegmentIcon (key, visibility) {
    if (Scripts.remoteGet(key) && visibility === 'private') {
      return `<i class="ui eye slash outline icon" title="${this.intl('list.private')}"></i>`;
    } else if (DefaultScripts.exists(key)) {
      return `<i class="ui archive icon" title="${this.intl('list.default')}"></i>`;
    } else {
      return `<i class="ui globe icon" title="${this.intl('list.public')}"></i>`;
    }
  }

  #createSegment (identifier, { name, description, author, key, version, updated_at, uses, visibility }) {
    const savedRemote = Scripts.remoteGet(key);

    return `
      <div data-script-key="${identifier}" data-script-name="${_escape(name)}" class="!border-radius-1 border-gray p-4 background-dark:hover cursor-pointer gap-2 items-center" style="display: grid; grid-template-columns: 58% 20% 15% 5%;">
        <div class="flex flex-col gap-2">
          <div>${this.#createSegmentIcon(key || identifier, visibility)} ${_escape(name)}</div>
          <div class="text-gray">${this.intl(typeof uses !== 'undefined' ? 'list.about_with_uses' : 'list.about', { author: _escape(author), uses })}</div>
          <div class="text-gray wrap-pre">${_escape(description || this.intl('list.no_description'))}</div>
        </div>
        <div class="flex flex-col gap-2 text-center" style="visibility: ${key ? 'visible' : 'hidden'};">
          <div>v${version}${savedRemote && savedRemote.version < version ? ` <span class="text-orange">${this.intl('list.new')}</span>` : ''}</div>
          <div class="text-gray">${updated_at ? _formatDate(Date.parse(updated_at)) : ''}</div>
        </div>
        <div style="visibility: ${key ? 'visible' : 'hidden'};">
          <div class="ui inverted small input text-center" style="width: 8rem;">
            <input type="text" readonly value="${key}" style="font-family: monospace;">
          </div>
        </div>
        <div style="visibility: ${savedRemote ? 'visible' : 'hidden'};">
          <div class="ui inverted orange basic icon small button" title="${this.intl('list.remove')}">
            <i class="ui times icon"></i>
          </div>
        </div>
      </div>
    `;
  }

  #resetList () {
    this.$list.html(`
      <div class="flex flex-col gap-8 items-center justify-content-center h-full opacity-50">
        <img src="res/favicon.png" class="loader" width="100">
      </div>
    `);
  }

  async #loadList () {
    let content = this.#createInputSegment();

    try {
      const remoteScripts = await StoreCache.use(
        'remote_scripts',
        () => SiteAPI.get('script_list', { include: Scripts.remoteList() }).then(({ scripts }) => scripts),
        StoreCache.hours(1)
      );

      for (const script of _sortDesc(remoteScripts, ({ updated_at }) => updated_at ? Date.parse(updated_at) : 0)) {
        content += this.#createSegment(script.key, script);
      }
    } catch (e) {
      Toast.error(this.intl('error_fetch.title'), this.intl('error_fetch.message'));
    }

    for (const [type, script] of DefaultScripts.entries()) {
      if (script.author) {
        content += this.#createSegment(type, script);
      }
    }

    this.$list.html(content);
  }
}

class ScriptArchiveDialog extends Dialog {
  static OPTIONS = {
    key: 'script_archive',
    dismissable: true
  }

  render () {
      return `
          <div class="inverted small bordered dialog">
              <div class="header flex justify-content-between items-center">
                  <div>${this.intl('title')}</div>
                  <i class="ui small link close icon" data-op="close"></i>
              </div>
              <div class="ui inverted form">
                <div class="field">
                    <label>${this.intl('filter')}</label>
                    <div class="ui fluid selection inverted search dropdown" data-op="filter">
                        <div class="text"></div>
                        <i class="dropdown icon"></i>
                    </div>
                </div>
              </div>
              <div class="flex flex-col gap-2 overflow-y-scroll" style="height: 50vh;" data-op="list"></div>
              <div class="ui black fluid button" data-op="clear">${this.intl('clear')}</div>
          </div>
      `;
  }

  #updateSearch (value) {
    this.$list.find('[data-archive-type]').each((_, element) => {
        if (value === '' || element.dataset.archiveType === value) {
            element.style.display = 'flex';
        } else {
            element.style.display = 'none';
        }
    })
  }

  #getIcon (type) {
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

  #getColor (type) {
    if (type === 'create') {
        return '18cc51';
    } else if (type === 'overwrite') {
        return 'fc351c';
    } else if (type === 'save') {
        return '18cc51';
    } else if (type === 'remove') {
        return 'fc351c';
    } else if (type === 'discard' ) {
        return 'fc351c';
    } else {
        return '404040';
    }
  }

  #scriptName (name) {
    if (name) {
        return Scripts.findScript(name)?.name || name;
    } else {
        return this.intl('unknown');
    }
  }

  #createSegment (type, name, version, timestamp, temporary) {
      return `
          <div data-archive-type="${type}" data-archive-key="${timestamp}" class="!border-radius-1 border-gray p-4 background-dark:hover cursor-pointer flex gap-2 items-center" style="border-color: #${this.#getColor(type)}60;">
              <i class="ui big ${this.#getIcon(type)} disabled icon" style="color: #${this.#getColor(type)};"></i>
              <div>
                  <div>${this.intl(`types.${type}`)}${temporary ? ` ${this.intl('item.temporary')}` : ''}: ${_escape(this.#scriptName(name))}</div>
                  <div class="text-gray">v${isNaN(version) ? 1 : version} - ${this.intl(`item.description`, { change: _formatDate(timestamp), expire: _formatDate(timestamp + ScriptArchive.DATA_LIFETIME) })}</div>
              </div>
              <i class="ui large !ml-auto copy outline text-gray text-white:hover icon" title="${intl('editor.copy')}" data-archive-copy="${timestamp}"></i>
          </div>
      `;
  }

  handle () {
    this.$list = this.$parent.operator('list');

    this.$listFilter = this.$parent.operator('filter');
    this.$listFilter.dropdown({
      values: [
          { value: '', name: this.intl('types.all'), icon: 'question' },
          { value: 'create', name: this.intl('types.create'), icon: 'plus' },
          { value: 'overwrite', name: this.intl('types.overwrite'), icon: 'pencil alternate' },
          { value: 'save', name: this.intl('types.save'), icon: 'save' },
          { value: 'remove', name: this.intl('types.remove'), icon: 'trash alternate outline' },
          { value: 'discard', name: this.intl('types.discard'), icon: 'recycle' }
      ],
      onChange: (value) => {
          this.#updateSearch(value);
      }
    })

    this.$clear = this.$parent.operator('clear');
    this.$clear.click(() => {
        ScriptArchive.clear();
        this.close(false);
    })

    this.$close = this.$parent.operator('close');
    this.$close.click(() => {
        this.close(false)
    });

    let content = '';
    for (const { type, name, version, timestamp, temporary } of ScriptArchive.all()) {
        content += this.#createSegment(type, name, version, timestamp, temporary);
    }

    this.$list.html(content);
    this.$list.find('[data-archive-key]').on('click', (event) => {
        this.close(true, ScriptArchive.get(event.currentTarget.dataset.archiveKey));
    });

    this.$list.find('[data-archive-copy]').on('click', (event) => {
      _stopAndPrevent(event);

      copyText(ScriptArchive.get(event.currentTarget.dataset.archiveCopy));

      Toast.info(this.intl('title'), this.intl('copy_toast'));
    });

    this.$listFilter.dropdown('set selected', '');
  }
}

class ScriptEditDialog extends Dialog {
    static OPTIONS = {
      key: 'script_edit',
      dismissable: true
    }

    render () {
        return `
            <style>
                [data-dialog-name="script_edit"] [data-table][data-active="true"] > i.times {
                    display: none;
                }
        
                [data-dialog-name="script_edit"] [data-table][data-active="true"] > i:not(.times) {
                    display: block;
                }

                [data-dialog-name="script_edit"] [data-table][data-active="false"] {
                    opacity: 50%;
                }

                [data-dialog-name="script_edit"] [data-table][data-active="false"] > i.times {
                    display: block;
                }
        
                [data-dialog-name="script_edit"] [data-table][data-active="false"] > i:not(.times) {
                    display: none;
                }
            </style>
            <div class="ui small bordered inverted dialog">
                <div class="header flex justify-content-between items-center">
                    <div data-op="title"></div>
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
                    <div class="field !mb-0">
                        <label>${this.intl('tables')}</label>
                        <div class="grid gap-2" style="grid-template-columns: repeat(2, 1fr);" data-op="tables">
                            <div data-table="players" class="!border-radius-1 border-gray p-3 !pl-4 background-dark:hover cursor-pointer flex gap-2 items-center">
                                <i class="ui times icon"></i>
                                <i class="ui database icon"></i>
                                <div>${intl('stats.topbar.players')}</div>
                            </div>
                            <div data-table="groups" class="!border-radius-1 border-gray p-3 !pl-4 background-dark:hover cursor-pointer flex gap-2 items-center">
                                <i class="ui times icon"></i>
                                <i class="ui database icon"></i>
                                <div>${intl('stats.topbar.groups')}</div>
                            </div>
                            <div data-table="player" class="!border-radius-1 border-gray p-3 !pl-4 background-dark:hover cursor-pointer flex gap-2 items-center">
                                <i class="ui times icon"></i>
                                <i class="ui user icon"></i>
                                <div>${intl('stats.topbar.players_grid')}</div>
                            </div>
                            <div data-table="group" class="!border-radius-1 border-gray p-3 !pl-4 background-dark:hover cursor-pointer flex gap-2 items-center">
                                <i class="ui times icon"></i>
                                <i class="ui archive icon"></i>
                                <div>${intl('stats.topbar.groups_grid')}</div>
                            </div>
                        </div>
                    </div>
                    <div class="field !mt-4">
                        <label>${this.intl('source')}</label>
                        <div class="ui fluid selection inverted search dropdown" data-op="source">
                            <div class="text"></div>
                            <i class="dropdown icon"></i>
                        </div>
                    </div>
                </div>
                <div class="ui fluid two buttons">
                    <button class="ui black button" data-op="close">${intl('dialog.shared.cancel')}</button>
                    <button class="ui button !text-black !background-orange" data-op="create">${intl('dialog.shared.save')}</button>
                </div>
            </div>
        `;
    }

    #setTables (tables) {
        this.$tables.find('[data-table]').each((_, element) => {
            element.dataset.active = tables.includes(element.dataset.table);
        })
    }

    #getTables () {
        return this.$tables.find('[data-table]').get().filter((element) => element.dataset.active === 'true').map((element) => element.dataset.table);
    }

    #getContentFromSource (source) {
        switch (source) {
            case '_empty': return '';
            case '_current': return this.script.content;
            case '_players': return DefaultScripts.getContent('players');
            case '_groups': return DefaultScripts.getContent('groups');
            case '_player': return DefaultScripts.getContent('player');
            case '_group': return DefaultScripts.getContent('group');
            default: {
                return Scripts.getContent(source);
            }
        }
    }

    handle (script, contentLock) {
      this.$close = this.$parent.operator('close');
      this.$close.click(() => {
          this.close(false)
      });

      this.$title = this.$parent.operator('title');
      this.$name = this.$parent.operator('name');
      this.$name.on('keydown', (event) => {
          if (event.originalEvent.key === 'Enter') {
              this.$create.click();
          }
      })

      this.$description = this.$parent.operator('description');
      this.$source = this.$parent.operator('source');

      this.$create = this.$parent.operator('create');
      this.$create.click(() => {
          const script = {
              name: this.$name.val().trim(),
              description: this.$description.val().trim(),
              tables: this.#getTables()
          }

          if (!script.name) {
              // Require script name
              Toast.warn(this.intl('error_title'), this.intl('error_name_blank'));

              return;
          }

          if (this.script.key) {
            this.close(true, script, null);
          } else {
            const source = this.$source.dropdown('get value');

            this.close(true, Object.assign(script, { content: this.#getContentFromSource(source) }), source);
          }
      });

      this.$tables = this.$parent.operator('tables');
      this.$tables.find('[data-table]').click((event) => {
          const element = event.currentTarget;

          if (element.dataset.active = (element.dataset.active !== 'true')) {
              if (element.dataset.table === 'groups') {
                  this.#setTables(['groups']);
              } else {
                  this.#setTables(this.#getTables().filter((table) => table !== 'groups'));
              }
          }
      })

      if (typeof script.key === 'undefined') {
        // Create script
        this.script = Object.assign({ name: `New script ${_formatDate(Date.now())}`, description: '' }, script);
        
        this.$title.text(this.intl('title.create'));

        this.$source.parent('.field').show();

        this.$source.dropdown({
            values: [
                { value: '_empty', name: this.intl('content.empty'), icon: 'minus' },
                { value: '_current', name: this.intl('content.current'), icon: 'minus' },
                { type: 'header', name: this.intl('category.defaults') },
                { value: '_players', name: intl('stats.topbar.players'), icon: 'database' },
                { value: '_groups', name: intl('stats.topbar.groups'), icon: 'database' },
                { value: '_player', name: intl('stats.topbar.players_grid'), icon: 'user' },
                { value: '_group', name: intl('stats.topbar.groups_grid'), icon: 'archive' },
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

        setTimeout(() => this.$name.focus(), 100);
      } else {
          this.script = script;
          
          this.$title.text(this.intl('title.edit'));
      
          this.$source.parent('.field').hide();
      }

      this.$name.val(this.script.name);
      this.$description.val(this.script.description);

      this.#setTables(this.script.tables || ['players', 'player', 'group']);
    }
}

class PlayerDetailDialog extends Dialog {
  static OPTIONS = {
    dismissable: true,
    containerClass: '!items-start'
  }

  intl (key) {
    return intl(`stats.player.${key}`);
  }

  render () {
    return `
      <div class="medium big basic inverted dialog mt-8">
      <i class="ui large link close icon position-fixed" style="right: 1.5em; top: 1.5em;" data-op="close"></i>
        <div data-op="content" class="position-relative" style="line-height: 1.4;"></div>
      </div>
    `;
  }

  handle ({ identifier, timestamp, reference }) {
    this.$close = this.$parent.operator('close');
    this.$close.click(() => this.close(false));
    
    this.$content = this.$parent.operator('content');

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
            ${ DatabaseManager.getLinkedIdentifiers(identifier).join(' / ') }
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
}

class EditorShortcutsDialog extends Dialog {
    static OPTIONS = {
      dismissable: true,
      opacity: 0,
      key: 'editor_shortcuts'
    }

    render () {
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
    
    handle () {
        this.$close = this.$parent.operator('close');
        this.$close.click(() => {
            this.close(false);
        });
    }
}

class ScriptManualDialog extends Dialog {
    static OPTIONS = {
      dismissable: true,
      opacity: 0,
      key: 'script_manual'
    }

    render () {
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
                'header_group',
                'ta-reserved-group',
                TABLE_EXPRESSION_CONFIG.all('header', 'group')
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

    #showPage (name) {
        this.$pages.hide();
        this.$pages.filter(`[data-page="${name}"]`).show();

        this.$items.each((i, obj) => {
            obj.classList[obj.dataset.item === name ? 'add' : 'remove'](obj.dataset.class);
        })
    }

    handle () {
        this.$close = this.$parent.operator('close');
        this.$close.click(() => {
          this.close(false)
        });

        this.$pages = this.$parent.find('[data-page]');

        this.$items = this.$parent.find('[data-item]');
        this.$items.click((event) => {
            this.#showPage(event.currentTarget.dataset.item);
        });

        this.#showPage(this.$items.first().attr('data-item'));
    }
}
