class Dialog {
    constructor (options) {
        this.options = Object.assign({
            opacity: 0.85,
            dismissable: false,
            key: ''
        }, options || {});
    }

    intl (key, args = {}) {
        return intl(`dialog.${this.options.key}.${key}`, args);
    }

    open (...args) {
        return new Promise((resolve) => {
            if (this.openRequested) {
                this.resolve = resolve;

                if (!this._hasParent()) {
                    const $dialog = $(this._createModal());
                    const $container = $(`<div class="dialog container" style="display: none; background: rgba(0, 0, 0, ${this.options.opacity})"></div>`);

                    $container.append($dialog);
                    $(document.body).append($container);

                    this.$parent = $container;

                    this._createBindings();
                }

                if (this.options.dismissable) {
                    this.$parent.click((event) => {
                        if (event.target.classList.contains('container')) {
                            this.close(false);
                        }
                    });
                }

                this._applyArguments(...args);
                this.$parent.show();
            } else {
                resolve();
            }
        });
    }

    close (value) {
        this.openRequested = false;

        if (this._hasParent() && this.resolve) {
            this.$parent.hide();
            this.resolve(value);
            this.resolve = undefined;
        }
    }

    requestOpen () {
        this.openRequested = true;
    }

    _hasParent () {
        return typeof this.$parent !== 'undefined';
    }

    _applyArguments () {

    }

    _createModal () {
        return '';
    }

    _createBindings () {

    }
}

const Toast = new (class {
    info (title, message, requireClick) {
        this._show(null, title, message, requireClick);
    }

    warn (title, message, requireClick) {
        this._show('orange exclamation triangle', title, message, requireClick);
    }

    error (title, message, requireClick) {
        this._show('red exclamation circle', title, message, requireClick);
    }

    _show (icon, title, message, requireClick) {
        $.toast({
            title: icon ? `<i class="ui ${icon} icon"></i> ${title}` : title,
            message,
            position: 'bottom left',
            displayTime: requireClick ? 0 : 6000,
            class: 'custom-toast'
        })
    }
})();

const DialogController = new (class {
    constructor () {
        this.promise = Promise.resolve();
    }

    open (popup, ...args) {
        popup.requestOpen();
        return (this.promise = this.promise.then(() => popup.open(...args)));
    }

    close (popup) {
        popup.close();
    }
})();

const TermsAndConditionsDialog = new (class extends Dialog {
    _createModal () {
        return `
            <div class="small inverted dialog">
                <div class="header"><u>Terms and Conditions</u></div>
                <div class="overflow-y-scroll" style="max-height: 65vh;">
                    <h4 class="text-center text-orange">§1 General use</h4>
                    <ul>
                        <li>It is advised to never share HAR files as they <b>might</b> contain private data such as IP address and cookies.</li>
                        <li class="mt-2">The site is distributed <b>AS IS</b> wthout any warranties. You are fully responsible for use of this site.</li>
                        <li class="mt-2">You're free to share, copy and modify the site, but you are not allowed to distribute it or any of it's parts without explicit approval.</li>
                        <li class="mt-2">You agree to limit data collection from the game to reasonable amounts.</li>
                        <li class="mt-2">You agree to follow the Shakes & Fidget <a href="https://cdn.playa-games.com/res/sfgame3/legal/html/terms_en.html">Terms and Conditions</a></li>
                        <li class="mt-2">You are not allowed to automate any part of this tool.</li>
                    </ul>
                    <h4 class="text-center text-orange">§2 Endpoint</h4>
                    <ul>
                        <li>Endpoint is a Unity application bundled with the tool that allows you to log into the game and collect limited data about yourself and your guild members without the lengthy process of creating a HAR file.</li>
                        <li class="mt-2">It is not possible to capture any other players than those listed above.</li>
                        <li class="mt-2">Everything happens locally in a identical way to playing the game through browser.</li>
                    </ul>
                    <h4 class="text-center text-orange">§3 Integrated share service</h4>
                    <ul>
                        <li>All data shared via the integrated share function is not protected in any other way other than the share key.</li>
                        <li class="mt-2">The shared data might be deleted at any point of time, up to full 2 days.</li>
                    </ul>
                    <h4 class="text-center text-orange">§4 Sentry</h4>
                    <ul>
                        <li>All errors raised during use of this tool will be reported via Sentry.io tool.</li>
                        <li class="mt-2">These reports are anonymous so that it's not possible to track their origin.</li>
                        <li class="mt-2">Please note that certain ad-blockers might prevent Sentry from working.</li>
                        <li class="mt-2">If you want to contribute to this project I recommend disabling ad-blockers for this site.</li>
                    </ul>
                </div>
                <button class="ui green fluid button" data-op="accept">I understand & accept these terms</button>
            </div>
        `;
    }

    _createBindings () {
        this.$parent.find('[data-op="accept"]').click(() => {
            SiteOptions.terms_accepted = true;
            this.close();
        });
    }
})();

const ChangeLogDialog = new (class extends Dialog {
    constructor () {
        super({
            key: 'changelog'
        });
    }

    _createModal () {
        const release = MODULE_VERSION;
        const entries = CHANGELOG[release];

        let content = '';
        if (Array.isArray(entries)) {
            content += '<ul>';
            for (const entry of entries) {
                content += `<li class="mt-2">${entry}</li>`
            }

            content += '</ul>';
        } else if (entries) {
            for (const [ category, changes ] of Object.entries(entries)) {
                content += `<h4 class="text-orange text-center">${category}</h4><ul>`
                for (const entry of changes) {
                    content += `<li class="mt-2">${entry}</li>`
                }

                content += '</ul>';
            }
        }

        return `
            <div class="small inverted dialog">
                <div class="header">${this.intl('release')} <span class="text-orange">${release}</span></div>
                <div class="overflow-y-scroll" style="max-height: 50vh;">
                    ${content}
                </div>
                <button class="ui black fluid button" data-op="accept">${this.intl('continue')}</button>
            </div>
        `;
    }

    _createBindings () {
        this.$parent.find('[data-op="accept"]').click(() => {
            SiteOptions.version_accepted = MODULE_VERSION;
            this.close();
        });
    }
})();

const Loader = new (class extends Dialog {
    constructor () {
        super({
            opacity: 0
        });
    }

    _createModal () {
        return `
            <div class="basic dialog">
                <div class="flex flex-col gap-8 items-center">
                    <img src="res/favicon.png" class="loader" width="100">
                    <div class="ui active tiny progress" data-percent="0" style="width: 200px;">
                        <div class="bar" style="background: #888 !important;"></div>
                    </div>
                </div>
            </div>
        `;
    }

    _createBindings () {
        this.$progress = this.$parent.find('.progress');
    }

    _applyArguments (options) {
        if (options && options.progress) {
            this.$progress.show();
            this.$progress.progress({ percent: 0 });
        } else {
            this.$progress.hide();
        }
    }

    progress (percent) {
        this.$progress.progress({ percent: Math.trunc(100 * percent) });
    }

    toggle (open, options = null) {
        DialogController[open ? 'open' : 'close'](Loader, options);
    }
})();

const HtmlDialog = new (class extends Dialog {
    _createModal () {
        return `
            <div class="big inverted dialog">
                <div class="header flex justify-content-between items-center">
                    <div></div>
                    <span data-op="title"></span>
                    <i class="ui small link close icon" data-op="close"></i>
                </div>
                <div class="overflow-y-scroll" data-op="content" style="max-height: 80vh;"></div>
            </div>
        `;
    }

    _createBindings () {
        this.$title = this.$parent.find('[data-op="title"]');
        this.$content = this.$parent.find('[data-op="content"]');

        this.$close = this.$parent.find('[data-op="close"]');
        this.$close.click(() => {
            this.close();
        });
    }

    _applyArguments (title, html) {
        this.$title.text(title);
        this.$content.html(html);
    }
})

// Non-blocking popup about an exception that occured
const WarningDialog = new (class extends Dialog {
    constructor () {
        super({
            key: 'warning',
            opacity: 0
        });
    }

    _createModal () {
        return `
            <div class="small inverted dialog">
                <div class="header"><i class="ui text-orange exclamation triangle icon"></i> ${this.intl('title')}</div>
                <div class="text-center" data-op="text">...</div>
                <button class="ui black fluid button" data-op="continue">${this.intl('continue')}</button>
            </div>
        `;
    }

    _createBindings () {
        this.$text = this.$parent.find('[data-op="text"]');
        this.$parent.find('[data-op="continue"]').click(() => this.close());
    }

    _applyArguments (error) {
        this.$text.text(error instanceof Error ? error.message : error);
    }
})();

// Blocking popup about an exception that occured and is blocking execution
const ErrorDialog = new (class extends Dialog {
    constructor () {
        super({
            key: 'error'
        });
    }

    _createModal () {
        return `
            <div class="small inverted bordered dialog">
                <div class="header"><i class="ui text-red times circle icon"></i> ${this.intl('title')}</div>
                <div class="text-center" data-op="text"></div>
                <h4 class="text-center">${this.intl('notice#')}</h4>
                <div class="ui two red fluid buttons">
                    <button class="ui button" data-op="continue">${this.intl('refresh')}</button>
                    <button class="ui button" data-op="continue-default">${this.intl('revert')}</button>
                </div>
            </div>
        `;
    }

    _createBindings () {
        this.$text = this.$parent.find('[data-op="text"]');
        this.$parent.find('[data-op="continue"]').click(() => {
            window.location.href = window.location.href;
        });

        this.$parent.find('[data-op="continue-default"]').click(() => {
            ProfileManager.setActiveProfile('default');
            window.location.href = window.location.href;
        });
    }

    _applyArguments (error) {
        this.$text.html(error instanceof Error ? error.message : error);
    }
})();

const FileEditDialog = new (class extends Dialog {
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
            const newTimestamp = Math.trunc(parseOwnDate(this.$timestamp.val()) / 60000);
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
        this.$timestamp.val(formatDate(timestamp));
    }
})();

const SaveOnlineScriptDialog = new (class extends Dialog {
    constructor () {
        super({
            key: 'save_online_script'
        });
    }

    _createModal () {
        return `
            <div class="small inverted dialog">
                <div class="header">${this.intl('title')}</div>
                <div>
                    <div class="ui inverted form">
                        <div class="ui active dimmer">
                            <div class="ui indeterminate text loader">${this.intl('loader')}</div>
                        </div>
                        <div class="two fields">
                            <div class="field">
                                <label>${this.intl('author')}:</label>
                                <div class="ui inverted input">
                                    <input data-op="author" type="text" disabled>
                                </div>
                            </div>
                            <div class="field">
                                <label>${this.intl('created_updated')}:</label>
                                <div class="ui inverted input">
                                    <input data-op="date" type="text" disabled>
                                </div>
                            </div>
                        </div>
                        <div class="field">
                            <label>${this.intl('name')}:</label>
                            <div class="ui inverted input">
                                <input data-op="name" type="text" placeholder="${this.intl('name_placeholder')}">
                            </div>
                        </div>
                    </div>
                    <div data-op="error" style="display: none;">
                        <h3 class="header text-orange text-center" style="margin-top: 4.125em; margin-bottom: 3.5em;">${this.intl('error')}</h3>
                    </div>
                </div>
                <div class="ui two fluid buttons">
                    <button class="ui black button disabled" data-op="cancel">${this.intl('cancel')}</button>
                    <button class="ui button disabled !text-black !background-orange" data-op="save">${this.intl('save')}</button>
                </div>
            </div>
        `;
    }

    _createBindings () {
        this.$name = this.$parent.find('[data-op="name"]');
        this.$date = this.$parent.find('[data-op="date"]');
        this.$author = this.$parent.find('[data-op="author"]');
        this.$form = this.$parent.find('.ui.form');
        this.$error = this.$parent.find('[data-op="error"]');

        this.$loader = this.$parent.find('.ui.dimmer');
        this.$cancel = this.$parent.find('[data-op="cancel"]').click(() => {
            this.close();
        });

        this.$save = this.$parent.find('[data-op="save"]').click(() => {
            let name = this.$name.val().trim();
            if (name.length) {
                Templates.save(name, this.data.content);

                // This dialog appears on page open, so it is necessary to refresh dropdowns
                if (UI.current.refreshTemplateDropdown) {
                    UI.current.refreshTemplateDropdown();
                }

                this.close();
            } else {
                this.$name.parent('.field').addClass('error').transition('shake');
            }
        });
    }

    setReady () {
        this.$loader.removeClass('active');
        this.$cancel.removeClass('disabled');
        this.$save.removeClass('disabled');
    }

    setUnavailable () {
        this.$form.hide();
        this.$error.show();
        this.$cancel.removeClass('disabled');
    }

    _applyArguments (code) {
        SiteAPI.get('script_get', { key: code.trim() }).then(({ script }) => {
            const { description, author, date } = script;

            this.data = script;

            this.$date.val(formatDate(new Date(date)));
            this.$name.val(description);
            this.$author.val(author);

            this.setReady();
        }).catch(() => {
            this.setUnavailable();
        })
    }
})();

const EditFileTagDialog = new (class extends Dialog {
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

const ProfileCreateDialog = new (class extends Dialog {
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
                            <div class="ta-wrapper" style="height: initial;">
                                <input class="ta-area" data-op="primary" type="text" placeholder="${this.intl('ast.primary')}">
                                <div data-op="primary-content" class="ta-content" style="width: 100%; margin-top: -2em; margin-left: 1em;"></div>
                            </div>
                        </div>
                        <div class="field">
                            <label>${this.intl('value')} 2:</label>
                            <div class="ta-wrapper" style="height: initial;">
                                <input class="ta-area" data-op="primary-2" type="text" placeholder="${this.intl('ast.primary')})">
                                <div data-op="primary-content-2" class="ta-content" style="width: 100%; margin-top: -2em; margin-left: 1em;"></div>
                            </div>
                        </div>
                    </div>
                    <h3 class="header mb-0">${this.intl('player.secondary')}</h3>
                    <div class="field">
                        <label>${this.intl('secondary')}:</label>
                        <div class="ta-wrapper">
                            <input class="ta-area" data-op="secondary" type="text" placeholder="${this.intl('ast.secondary')}">
                            <div data-op="secondary-content" class="ta-content" style="width: 100%; margin-top: -2em; margin-left: 1em;"></div>
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
                            <div class="ta-wrapper" style="height: initial;">
                                <input class="ta-area" data-op="primary-g" type="text" placeholder="${this.intl('ast.primary')}">
                                <div data-op="primary-content-g" class="ta-content" style="width: 100%; margin-top: -2em; margin-left: 1em;"></div>
                            </div>
                        </div>
                        <div class="field">
                            <label>${this.intl('value')} 2:</label>
                            <div class="ta-wrapper" style="height: initial;">
                                <input class="ta-area" data-op="primary-2-g" type="text" placeholder="${this.intl('ast.primary')})">
                                <div data-op="primary-content-2-g" class="ta-content" style="width: 100%; margin-top: -2em; margin-left: 1em;"></div>
                            </div>
                        </div>
                    </div>
                    <h3 class="header mb-0">${this.intl('group.secondary')}</h3>
                    <div class="field">
                        <label>${this.intl('secondary')}:</label>
                        <div class="ta-wrapper">
                            <input class="ta-area" data-op="secondary-g" type="text" placeholder="${this.intl('ast.secondary')}">
                            <div data-op="secondary-content-g" class="ta-content" style="width: 100%; margin-top: -2em; margin-left: 1em;"></div>
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
            this.$secondaryContent.html(Expression.format($(e.currentTarget).val() || '', undefined, PROFILES_PROPS));
        });

        this.$secondaryG = this.$parent.find('[data-op="secondary-g"]');
        this.$secondaryContentG = this.$parent.find('[data-op="secondary-content-g"]');

        this.$secondaryG.on('change input', (e) => {
            this.$secondaryContentG.html(Expression.format($(e.currentTarget).val() || '', undefined, PROFILES_GROUP_PROPS));
        });

        // Primary filter
        this.$primaryIndex = this.$parent.find('[data-op="primary-index"]');
        this.$primaryOperator = this.$parent.find('[data-op="primary-operator"]');
        this.$primary = this.$parent.find('[data-op="primary"]');
        this.$primaryContent = this.$parent.find('[data-op="primary-content"]');
        this.$primary2 = this.$parent.find('[data-op="primary-2"]');
        this.$primaryContent2 = this.$parent.find('[data-op="primary-content-2"]');

        this.$primary.on('change input', (e) => {
            this.$primaryContent.html(Expression.format($(e.currentTarget).val() || ''));
        });

        this.$primary2.on('change input', (e) => {
            this.$primaryContent2.html(Expression.format($(e.currentTarget).val() || ''));
        });

        this.$primaryIndex.dropdown({
            values: ['none', ...PROFILES_INDEXES].map(v => {
                return {
                    name: v === 'none' ? this.intl('none') : v.charAt(0).toUpperCase() + v.slice(1),
                    value: v,
                    selected: v === 'none'
                };
            })
        }).dropdown('setting', 'onChange', (value, text) => {
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

        this.$primaryOperator.dropdown('setting', 'onChange', (value, text) => {
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
            this.$primaryContentG.html(Expression.format($(e.currentTarget).val() || ''));
        });

        this.$primary2G.on('change input', (e) => {
            this.$primaryContent2G.html(Expression.format($(e.currentTarget).val() || ''));
        });

        this.$primaryIndexG.dropdown({
            values: ['none', ...PROFILES_GROUP_INDEXES].map(v => {
                return {
                    name: v === 'none' ? this.intl('none') : v.charAt(0).toUpperCase() + v.slice(1),
                    value: v,
                    selected: v === 'none'
                };
            })
        }).dropdown('setting', 'onChange', (value, text) => {
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

        this.$primaryOperatorG.dropdown('setting', 'onChange', (value, text) => {
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

const TemplateSaveDialog = new (class extends Dialog {
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

        return dropdownText.trim() || `New template (${formatDate(Date.now())})`;
    }

    _applyArguments (name, callback) {
        this.callback = callback;

        this.$dropdown.dropdown({
            allowAdditions: true,
            hideAdditions: false,
            placeholder: this.intl('select'),
            values: Templates.sortedList().map(({ name }) => {
                return {
                    value: name,
                    name
                }
            })
        }).dropdown('set selected', name || '');
    }
})();

const DataManageDialog = new (class extends Dialog {
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

            Loader.toggle(true);
            DatabaseManager._removeAuto(this.data).then(() => {
                Loader.toggle(false);
                this.callback()
            });
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
                        ${timestamps.map(ts => `<li style="margin-bottom: 5px;">${formatDate(ts)}</li>`).join('')}
                    </ul>
                </div>
            `;
        }

        let players = [];
        let groups = [];

        if (identifiers.length > 0) {
            players.push(
                ...identifiers.filter(id => DatabaseManager._isPlayer(id)).map(id => DatabaseManager.Players[id].Latest.Data).map(({ prefix, name, timestamp }) => ({ prefix: _pretty_prefix(prefix), name, timestamp: formatDate(timestamp) }))
            )

            groups.push(
                ...identifiers.filter(id => !DatabaseManager._isPlayer(id)).map(id => DatabaseManager.Groups[id].Latest.Data).map(({ prefix, name, timestamp }) => ({ prefix: _pretty_prefix(prefix), name, timestamp: formatDate(timestamp) }))
            )
        }

        if (instances.length > 0) {
            players.push(
                ...instances.filter(({ identifier }) => DatabaseManager._isPlayer(identifier)).map(({ prefix, name, timestamp }) => ({ prefix: _pretty_prefix(prefix), name, timestamp: formatDate(timestamp) }))
            )

            groups.push(
                ...instances.filter(({ identifier }) => !DatabaseManager._isPlayer(identifier)).map(({ prefix, name, timestamp }) => ({ prefix: _pretty_prefix(prefix), name, timestamp: formatDate(timestamp) }))
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

const InputDialog = new (class extends Dialog {
    constructor () {
        super({
            key: 'input'
        });
    }

    _createModal () {
        return `
            <div class="small bordered inverted dialog">
                <div class="left header" data-op="title"></div>
                <div class="ui inverted form">
                    <div class="field" data-op="field">
                        <label data-op="label"></label>
                        <div class="ui inverted input">
                            <input type="text" data-op="input">
                        </div>
                    </div>
                </div>
                <div class="ui two fluid buttons">
                    <button class="ui black button" data-op="cancel">${this.intl('cancel')}</button>
                    <button class="ui button !text-black !background-orange" data-op="ok">${this.intl('ok')}</button>
                </div>
            </div>
        `;
    }

    _callAndClose (callback, ...args) {
        if (callback) callback(...args);

        this.close();
    }

    _validate () {
        if (this.validationCallback && !this.validationCallback(this.$input.val())) {
            this.$field.addClass('error');
            this.$okButton.addClass('disabled');
        } else {
            this.$field.removeClass('error');
            this.$okButton.removeClass('disabled');
        }
    }

    _createBindings () {
        this.$cancelButton = this.$parent.find('[data-op="cancel"]');
        this.$okButton = this.$parent.find('[data-op="ok"]');

        this.$title = this.$parent.find('[data-op="title"]');
        this.$label = this.$parent.find('[data-op="label"]');
        this.$input = this.$parent.find('[data-op="input"]');
        this.$field = this.$parent.find('[data-op="field"]');

        this.$cancelButton.click(() => this._callAndClose(this.cancelCallback));
        this.$okButton.click(() => this._callAndClose(this.okCallback, this.$input.val()));
        this.$input.on('input change', () => this._validate());
    }

    _applyArguments (title, label, value, okCallback, cancelCallback, validationCallback) {
        this.okCallback = okCallback;
        this.cancelCallback = cancelCallback;
        this.validationCallback = validationCallback;

        this.$title.html(title);
        this.$label.html(label);

        this.$input.val(value);

        this._validate();
    }
})

const ConfirmDialog = new (class extends Dialog {
    constructor () {
        super({
            key: 'confirm'
        });
    }

    _createModal () {
        return `
            <div class="small bordered inverted dialog">
                <div class="left header" data-op="title"></div>
                <div class="text-center" data-op="text">...</div>
                <div class="ui two fluid buttons">
                    <button class="ui black button" data-op="cancel">${this.intl('cancel')}</button>
                    <button class="ui button !text-black !background-orange" data-op="ok">${this.intl('ok')}</button>
                </div>
            </div>
        `;
    }

    _callAndClose (callback) {
        if (callback) callback();

        this._closeTimer();
        this.close();
    }

    _closeTimer () {
        if (this.delayTimer) {
            clearInterval(this.delayTimer);
            this.delayTimer = null;
        }
    }

    _updateButton (delayLeft) {
        if (delayLeft > 0) {
            this.$okButton.addClass('disabled');
            this.$okButton.text(this.intl('wait_n_seconds').replace('%1', delayLeft));
        } else {
            this.$okButton.removeClass('disabled');
            this.$okButton.text(this.intl('ok'));
        }
    }

    _unblockButton () {
        this.$okButton.removeClass('disabled');
        this.$okButton.text(this.intl('ok'));
    }

    _blockButton () {
        this.$okButton.addClass('disabled');
    }

    _createBindings () {
        this.$cancelButton = this.$parent.find('[data-op="cancel"]');
        this.$okButton = this.$parent.find('[data-op="ok"]');

        this.$title = this.$parent.find('[data-op="title"]');
        this.$text = this.$parent.find('[data-op="text"]');

        this.$cancelButton.click(() => this._callAndClose(this.cancelCallback));
        this.$okButton.click(() => this._callAndClose(this.okCallback));
    }

    _applyArguments (title, text, okCallback, cancelCallback, darkBackground = false, delay = 0) {
        this.$title.html(title);
        this.$text.html(text);

        this.okCallback = okCallback;
        this.cancelCallback = cancelCallback;

        this.$parent.css('background', `rgba(0, 0, 0, ${darkBackground ? 0.85 : 0})`);

        this._updateButton(delay);
        if (delay > 0) {
            this.delayTimer = setInterval(() => {
                if (--delay <= 0) {
                    this._closeTimer();
                }

                this._updateButton(delay);
            }, 1000);
        }
    }
})();

const ImportSharedFileDialog = new (class extends Dialog {
    _createModal () {
        return `
            <div class="very small inverted dialog">
                <div class="left header">${intl('stats.files.online.title')}</div>
                <div class="text-center">
                    <p>${intl('stats.files.online.prompt')}</p>
                    <div class="ui fluid inverted input">
                        <input type="text" placeholder="" class="text-center" data-op="input">
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
                    this._update(file);
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

const ExportSharedFileDialog = new (class extends Dialog {
    _createModal () {
        return `
            <div class="very small inverted dialog">
                <div class="header">${intl('stats.share.title')}</div>
                <div class="height: 17em;">
                    <h4 class="ui inverted header">${intl('stats.share.options')}</h4>
                    <div class="mt-2">
                        <div class="ui inverted checkbox" data-op="once">
                            <input type="checkbox" name="checkbox_once">
                            <label for="checkbox_once"><span>${intl('stats.share.single_use')}</span>
                                <br>
                                <span class="text-gray">${intl('stats.share.single_use_notice')}</span>
                            </label>
                        </div>
                    </div>
                    <div data-op="block">
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
        this.$once = this.$parent.operator('once');

        this.$code = this.$parent.operator('code');
        this.$block = this.$parent.operator('block');
        
        this.$ok = this.$parent.operator('ok');
        this.$ok.click(() => {
            if (this.code) {
                this.close();
            } else {
                const once = this.$once.checkbox('is checked');
    
                this._setLoading(true);
                this._send(once);
            }
        });

        this.$cancel = this.$parent.operator('cancel');
        this.$cancel.click(() => {
            this.close();
        })
    }

    _applyArguments (data) {
        this.data = data;
        this.code = null;

        this.$once.checkbox('set checked');

        this.$block.hide();

        this.$ok.text(intl('stats.share.get'));
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

    _send (once) {
        SiteAPI.post('file_create', {
            content: JSON.stringify({ data: this.data }),
            multiple: !once
        }).then(({ file }) => {
            this._setLoading(false);

            if (file.key) {
                this.code = file.key;
    
                this.$block.show();
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

const ScriptRepositoryDialog = new (class extends Dialog {
    constructor () {
        super({
            key: 'script_repository',
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

    _createSegment (key, description, author, updatedAt) {
        return `
            <div data-script-key="${key}" class="!border-radius-1 border-gray p-4 background-dark:hover cursor-pointer flex gap-2 items-center">
                <i class="ui big ${DefaultScripts[key] ? 'archive' : 'globe'} disabled icon"></i>
                <div>    
                    <div>${description}</div>
                    <div class="text-gray">${intl(`dialog.script_repository.list.about${updatedAt ? '_with_date' : ''}`, { author, date: updatedAt ? formatDateOnly(Date.parse(updatedAt)) : null })}</div>
                </div>
            </div>
        `;
    }

    _showOnline (scripts) {
        let content = '';
        for (const { author, description, key, date } of _sort_des(scripts, (script) => Date.parse(script.date))) {
            content += this._createSegment(key, description, author, date);
        }

        this.$list.append(content);
        this._updateListeners();
    }

    _applyArguments (callback) {
        this.callback = callback;

        let content = '';
        for (const [type, { author, description }] of Object.entries(DefaultScripts)) {
            if (author) {
                content += this._createSegment(type, description, author, null);
            }
        }

        this.$list.html(content);
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
            if (DefaultScripts[key]) {
                this._applyScript(DefaultScripts[key].content);
            } else {
                const $icon = $(event.currentTarget).find('i').removeClass('archive globe').addClass('loading sync');
                this._fetchScript(key).catch(() => {
                    $icon.removeClass('loading sync').addClass('text-red warning');
                });
            }
        });
    }
})();

const ScriptArchiveDialog = new (class extends Dialog {
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
        } else {
            return 'question';
        }
    }

    _createSegment (type, name, version, timestamp, temporary) {
        return `
            <div data-archive-key="${timestamp}" class="!border-radius-1 border-gray p-4 background-dark:hover cursor-pointer flex gap-2 items-center">
                <i class="ui big ${this._getIcon(type.split('_')[0])} disabled icon"></i>
                <div>
                    <div>${this.intl(`types.${type}`)}${temporary ? ` ${this.intl('item.temporary')}` : ''}: ${name}</div>
                    <div class="text-gray">v${isNaN(version) ? 1 : version} - ${this.intl(`item.description`, { change: formatDate(timestamp), expire: formatDate(timestamp + ScriptArchive.dataExpiry) })}</div>
                </div>
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
    }
})();

const TemplateManageDialog = new (class extends Dialog {
    constructor () {
        super({
            key: 'template_manage',
            dismissable: true
        })
    }

    _createModal () {
        return `
            <div class="ui big bordered inverted dialog">
                <div class="header flex justify-content-between items-center">
                    <div>${this.intl('title')}</div>
                    <i class="ui small link close icon" data-op="close"></i>
                </div>
                <div class="flex gap-4">
                    <div class="flex flex-col overflow-y-scroll gap-2 pr-4" style="height: 65vh; width: 45em;" data-op="list"></div>
                    <div class="ui inverted form w-full pl-4 border-left-gray flex flex-col">
                        <div class="field">
                            <h3 class="ui inverted header">${this.intl('general')}</h3>
                        </div>
                        <div class="field">
                            <label>${this.intl('script.name')}</label>
                            <div class="ui inverted centered input">
                                <input type="text" readonly data-op="template_name">
                            </div>
                        </div>
                        <div class="two fields">
                            <div class="field">
                                <label>${this.intl('script.updated')}</label>
                                <div class="ui inverted centered input">
                                    <input type="text" readonly data-op="template_updated">
                                </div>
                            </div>
                            <div class="field">
                                <label>${this.intl('script.version')}</label>
                                <div class="ui inverted centered input">
                                    <input type="text" readonly data-op="template_version">
                                </div>
                            </div>
                        </div>
                        <div class="field !mt-8">
                            <h3 class="ui inverted header">${this.intl('online')}</h3>
                        </div>
                        <div class="field">
                            <label>${this.intl('script.published_key')}</label>
                            <div class="ui inverted centered input">
                                <input type="text" readonly data-op="template_key">
                            </div>
                        </div>
                        <div class="two fields">
                            <div class="field">
                                <label>${this.intl('script.published')}</label>
                                <div class="ui inverted centered input">
                                    <input type="text" readonly data-op="template_published">
                                </div>
                            </div>
                            <div class="field">
                                <label>${this.intl('script.published_version')}</label>
                                <div class="ui inverted centered input">
                                    <input type="text" readonly data-op="template_publishedVersion">
                                </div>
                            </div>
                        </div>
                        <div class="two fields">
                            <div class="field">
                                <div class="ui basic inverted fluid button" data-op="action_publish">
                                    <i class="ui cloud upload alternate icon"></i> ${this.intl('action.publish')}
                                </div>
                                <div class="ui basic inverted fluid button" data-op="action_republish">
                                    <i class="ui sync alternate icon"></i> ${this.intl('action.republish')}
                                </div>
                            </div>
                            <div class="field">
                                <div class="ui basic inverted fluid button" data-op="action_unpublish">
                                    <i class="ui cloud download alternate icon"></i> ${this.intl('action.unpublish')}
                                </div>
                            </div>
                        </div>
                        <div class="two fields !mb-0" style="margin-top: auto;">
                            <div class="field"></div>
                            <div class="field">
                                <div class="ui red basic inverted fluid button" data-op="action_remove">
                                    <i class="ui trash alternate icon"></i> ${this.intl('action.remove')}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    _createSegment ({ name, version, timestamp, online, favorite }) {
        return `
            <div data-template-name="${name}" data-template-favorite="${favorite}" class="!border-radius-1 border-gray p-4 background-dark:hover cursor-pointer flex gap-2 items-center">
                <i class="ui big ${online ? 'globe' : 'archive'} disabled icon"></i>
                <div>
                    <div>${name}</div>
                    <div class="text-gray">v${isNaN(version) ? 1 : version} - ${formatDate(timestamp)}</div>
                </div>
                <i class="ui thumbtack icon text-gray text-white:hover" style="margin-left: auto;"></i>
            </div>
        `;
    }

    _createBindings () {
        this.$close = this.$parent.operator('close');
        this.$close.click(() => {
            this.close();
        });
        
        this.$list = this.$parent.operator('list');
        this.$form = this.$parent.operator('form');

        this.$formFields = [];
        for (const operator of ['name', 'version', 'updated', 'published', 'publishedVersion', 'key']) {
            this.$formFields.push(this[`$template${operator.charAt(0).toUpperCase()}${operator.slice(1)}`] = this.$parent.operator(`template_${operator}`));
        }

        this.$formActions = [];
        for (const operator of ['publish', 'republish', 'unpublish', 'remove']) {
            this.$formActions.push(this[`$action${operator.charAt(0).toUpperCase()}${operator.slice(1)}`] = this.$parent.operator(`action_${operator}`));
        }

        // Bindings
        this.$actionPublish.click(() => {
            const { name, content, version } = this.template;

            this._setLoading();
            SiteAPI.post('script_create', { description: name, author: 'unknown', content }).then(({ script: { key, secret } }) => {
                Templates.markAsOnline(name, key, secret, version);
            }).catch(({ error }) => {
                this._error(error);
            }).finally(() => {
                this._resetList();
                this._selectTemplate(name);
            });
        });

        this.$actionRepublish.click(() => {
            const { name, content, version, online: { key, secret } } = this.template;

            this._setLoading();
            SiteAPI.post('script_update', { description: name, content, key, secret }).then(({ script: { key, secret } }) => {
                Templates.markAsOnline(name, key, secret, version);
            }).catch(({ error }) => {
                this._error(error);
            }).finally(() => {
                this._resetList();
                this._selectTemplate(name);
            });
        });

        this.$actionUnpublish.click(() => {
            const { name, online: { key, secret } } = this.template;

            this._setLoading();
            SiteAPI.get('script_delete', { key, secret }).then(() => {
                Templates.markAsOffline(name);
            }).catch(({ error }) => {
                this._error(error);
            }).finally(() => {
                this._resetList();
                this._selectTemplate(name);
            });
        });

        this.$actionRemove.click(() => {
            Templates.remove(this.template.name);

            this._clearForm();
            this._resetList();

            this.callback();
        });
    }

    _error (reason) {
        Toast.error(this.intl('error'), reason);
    }

    _setLoading () {
        this.$element.find('i').removeClass('globe archive').addClass('loading sync');
    }

    _selectTemplate (name) {
        this.$list.find('[data-template-name]').removeClass('background-dark');
        this.$element = this.$list.find(`[data-template-name="${name}"]`).addClass('background-dark');

        // Render template
        for (const $element of this.$formFields) {
            $element.val('');
        }
        
        const { version, timestamp, online } = (this.template = Templates.all()[name]);
        this.$templateName.val(name);
        this.$templateVersion.val(`v${isNaN(version) ? 1 : version}`);
        this.$templateUpdated.val(formatDate(timestamp));

        // Unlock buttons
        for (const $element of this.$formActions) {
            $element.removeClass('disabled');
        }

        if (online) {
            this.$actionPublish.hide();
            this.$actionRepublish.show();

            const { key, version, timestamp: _timestamp } = online;
            this.$templatePublished.val(formatDate(_timestamp));
            this.$templatePublishedVersion.val(`v${isNaN(version) ? 1 : version}`)
            this.$templateKey.val(key);
        } else {
            this.$actionPublish.show();
            this.$actionRepublish.hide();
            this.$actionUnpublish.addClass('disabled');
        }
    }

    _resetList () {
        let content = '';
        for (const data of Templates.sortedList()) {
            content += this._createSegment(data);
        }

        this.$list.html(content);
        this.$list.find('[data-template-name]').click((event) => {
            const name = event.currentTarget.dataset.templateName;
            if (event.target.classList.contains('thumbtack')) {
                Templates.toggleFavorite(name);

                this.callback();
                this._resetList();
            } else {                
                this._selectTemplate(name);
            }
        });
    }

    _clearForm () {
        this.$element = null;

        for (const $element of this.$formFields) {
            $element.val('');
        }

        for (const $element of this.$formActions) {
            $element.addClass('disabled');
        }

        this.$actionPublish.show();
        this.$actionRepublish.hide();
    }

    _applyArguments (name, callback) {
        this.callback = callback;

        this._clearForm();
        this._resetList();

        if (name) {
            this._selectTemplate(name);
        }
    }
})();

const Localization = new (class {
    _generateTranslation (base, object, ... path) {
        for (let [key, value] of Object.entries(object)) {
            if (typeof value === 'object') {
                this._generateTranslation(base, value, ... path, key);
            } else {
                base[`${path.join('.')}.${key}`] = value;
            }
        }

        return base;
    }

    async _fetchTranslation (locale) {
        if (Object.keys(this.locales()).includes(locale)) {
            let start = Date.now();

            let file = await fetch(this._translationUrl(locale));
            let data = await file.json();

            Logger.log('APPINFO', `Translation ready in ${Date.now() - start} ms`);

            return this._generateTranslation({}, data);
        } else {
            return {};
        }
    }

    _translationUrl (locale) {
        const useRemote = window.document.location.protocol === 'file:';
        return `${useRemote ? 'https://sftools.mar21.eu' : ''}/js/lang/${locale}.json`;
    }

    async translatePage () {
        const locale = this.getLocale();

        const $picker = $(`<div class="locale-picker"></div>`);
        const $dropdown = $(`<div class="ui dropdown"><img src="res/flags/${locale}.svg"></div>`).dropdown({
            transition: 'none',
            values: Object.entries(this.locales()).map(([value, name]) => ({ name: `<div data-inverted="" data-tooltip="${name}" data-position="left center"><img src="res/flags/${value}.svg"></div>`, value })),
            action: (text, value, element) => this.setLocale(value)
        });

        $picker.append($dropdown);

        $('.ui.huge.menu').append($picker);

        this.translation = await this._fetchTranslation(locale);

        window.document.querySelectorAll('[data-intl]').forEach(element => this.translateElement(element));
        window.document.querySelectorAll('[data-intl-tooltip]').forEach(element => this.translateTooltip(element));
        window.document.querySelectorAll('[data-intl-placeholder]').forEach(element => this.translatePlaceholder(element));
    }

    findTranslation (key) {
        let obj = this.translation[key];
        if (!obj) {
            Logger.log('IN_WARN', `Translation key ${key} not found!`);
        }

        return obj;
    }

    translatePlaceholder (node) {
        let key = node.getAttribute('data-intl-placeholder');
        let val = this.findTranslation(key);

        node.removeAttribute('data-intl-placeholder');
        node.setAttribute('placeholder', this.sanitize(val || key));
    }

    translateTooltip (node) {
        let key = node.getAttribute('data-intl-tooltip');
        let val = this.findTranslation(key);

        node.removeAttribute('data-intl-tooltip');
        node.setAttribute('data-tooltip', this.sanitize(val || key));
    }

    translateElement (node) {
        let key = node.getAttribute('data-intl');
        let val = this.findTranslation(key);

        node.removeAttribute('data-intl');

        if (val && key.endsWith('#')) {
            node.innerHTML = val;
        } else {
            node.innerText = val || key;
        }
    }

    locales () {
        return {
            'en': 'English',
            'de': 'Deutsch',
            'pl': 'Polski',
            'pt': 'Português',
            'cs': 'Česky',
            'fr': 'Français',
            'it': 'Italiano',
            'es': 'Español',
            'hu': 'Magyar',
            'ch': 'Schwyzerdüütsch',
            'pg': 'Pig Latin'
        };
    }

    getLocale () {
        return SiteOptions.locale || 'en';
    }

    setLocale (locale) {
        SiteOptions.locale = locale;

        window.location.href = window.location.href;
    }

    sanitize (val) {
        return val.replace(/"/g, '&quot;');
    }
})();

window.intl = (key, variables = undefined) => {
    let val = Localization.findTranslation(key);
    if (val) {
        if (typeof variables !== 'undefined') {
            for (const [key, vrl] of Object.entries(variables)) {
                val = val.replace(`#{${key}}`, vrl);
            }
        }

        return Localization.sanitize(val);
    } else {
        return key;
    }
}

// Automatically open Terms and Conditions if not accepted yet
window.addEventListener('DOMContentLoaded', async function () {
    await Localization.translatePage();

    if (StoreWrapper.isAvailable()) {
        if (!SiteOptions.terms_accepted) {
            DialogController.open(TermsAndConditionsDialog);
        }

        if (SiteOptions.version_accepted != MODULE_VERSION) {
            DialogController.open(ChangeLogDialog);
        }
    }

    Site.run();
});
