class Dialog {
    constructor (opacity = 0.85) {
        this.opacity = opacity;
    }

    _intl_key () {
        return '';
    }

    intl (key) {
        return intl(`dialog.${this._intl_key()}.${key}`);
    }

    open (...args) {
        return new Promise((resolve) => {
            if (this.shouldOpen) {
                this.resolve = resolve;

                if (!this._hasParent()) {
                    Dialog._injectStyles();

                    const $modal = $(this._createModal()).addClass('active');
                    const $container = $(`<div class="dialog container" style="display: none; background: rgba(0, 0, 0, ${this.opacity})"></div>`);

                    $container.append($modal);
                    $(document.body).append($container);

                    this.$parent = $container;

                    this._createBindings();
                }

                this._applyArguments(...args);
                this.$parent.show();
            } else {
                resolve();
            }
        });
    }

    close (value) {
        this.shouldOpen = false;
        if (this._hasParent() && this.resolve) {
            this.$parent.hide();
            this.resolve(value);
            this.resolve = undefined;
        }
    }

    openable () {
        this.shouldOpen = true;
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

    static _injectStyles () {
        return new Promise((resolve) => {
            if (document.head.querySelector('link[href*="dialog"]')) {
                resolve();
            } else {
                const el = document.createElement('link');
                el.type = 'text/css';
                el.rel = 'stylesheet';

                el.onload = () => resolve();
                el.onerror = () => resolve();
                el.href = `/css/dialogs.css?r=${Math.random()}`;

                document.head.insertAdjacentElement('beforeend', el);
            }
        });
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
        popup.openable();
        return (this.promise = this.promise.then(() => popup.open(...args)));
    }

    close (popup) {
        popup.close();
    }
})();

const TermsAndConditionsDialog = new (class extends Dialog {
    _createModal () {
        return `
            <div class="small dark dialog">
                <h2 class="header"><u>Terms and Conditions</u></h2>
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
    _intl_key () {
        return 'changelog';
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
            <div class="small dark dialog">
                <h2 class="header">${this.intl('release')} <span class="text-orange">${release}</span></h2>
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
        super(0);
    }

    _createModal () {
        return `
            <div class="basic dialog">
                <img src="res/favicon.png" class="loader" width="100">
                <div class="ui active tiny progress" data-percent="0" style="width: 200px;">
                    <div class="bar" style="background: #888 !important;"></div>
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
            <div class="big dialog">
                <h2 class="header flex justify-content-between">
                    <div></div>
                    <span data-op="title"></span>
                    <i class="ui small link close icon" data-op="close"></i>
                </h2>
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
        super(0);
    }

    _intl_key () {
        return 'warning';
    }

    _createModal () {
        return `
            <div class="small dark dialog">
                <h2 class="header"><i class="ui text-orange exclamation triangle icon"></i> ${this.intl('title')}</h2>
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
    _intl_key () {
        return 'error';
    }

    _createModal () {
        return `
            <div class="small dark dialog">
                <h2 class="header"><i class="ui text-red times circle icon"></i> ${this.intl('title')}</h2>
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
        super(0);
    }

    _intl_key () {
        return 'file_edit';
    }

    _createModal () {
        return `
            <div class="small bordered dialog">
                <h2 class="left header">${this.intl('title')}</h2>
                <div class="ui form">
                    <div class="field">
                        <label>${this.intl('timestamp')}</label>
                        <input data-op="timestamp" type="text">
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
    _intl_key () {
        return 'save_online_script';
    }

    _createModal () {
        return `
            <div class="small dialog">
                <h2 class="header">${this.intl('title')}</h2>
                <div>
                    <div class="ui form">
                        <div class="ui inverted active dimmer">
                            <div class="ui indeterminate text loader">${this.intl('loader')}</div>
                        </div>
                        <div class="two fields">
                            <div class="field">
                                <label>${this.intl('author')}:</label>
                                <input data-op="author" type="text" disabled>
                            </div>
                            <div class="field">
                                <label>${this.intl('created_updated')}:</label>
                                <input data-op="date" type="text" disabled>
                            </div>
                        </div>
                        <div class="field">
                            <label>${this.intl('name')}:</label>
                            <input data-op="name" type="text" placeholder="${this.intl('name_placeholder')}">
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
        super(0);
    }

    _intl_key () {
        return 'edit_file_tag';
    }

    _createModal () {
        return `
            <div class="small bordered dialog">
                <h2 class="header">${this.intl('title')}</h2>
                <div class="ui form">
                    <div class="field">
                        <label>${this.intl('current')}:</label>
                        <input data-op="old-tags" type="text" placeholder="${this.intl('none')}" disabled>
                    </div>
                    <div class="field">
                        <label>${this.intl('replacement')}:</label>
                        <input data-op="new-tags" type="text" placeholder="${this.intl('none')}">
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
        super(0);
    }

    _intl_key () {
        return 'profile_create';
    }

    _createModal () {
        return `
            <div class="bordered dialog">
                <h2 class="left separated header">${this.intl('title')}</h2>
                <div class="ui form">
                    <div class="two fields">
                        <div class="four wide field">
                            <label>${this.intl('id')}:</label>
                            <input class="text-center" data-op="id" type="text" disabled>
                        </div>
                        <div class="eight wide field">
                            <label>${this.intl('name')}:</label>
                            <input data-op="name" type="text">
                        </div>
                        <div class="four wide field">
                            <label>${this.intl('slot')}:</label>
                            <div class="ui fluid selection dropdown" data-op="slot">
                                <div class="text"></div>
                                <i class="dropdown icon"></i>
                            </div>
                        </div>
                    </div>
                    <h3 class="header mb-0">${this.intl('player.primary')}</h3>
                    <div class="two fields">
                        <div class="field">
                            <label>${this.intl('index')}:</label>
                            <div class="ui fluid search selection dropdown" data-op="primary-index">
                                <div class="text"></div>
                                <i class="dropdown icon"></i>
                            </div>
                        </div>
                        <div class="field">
                            <label>${this.intl('operation')}:</label>
                            <select class="ui fluid search selection dropdown" data-op="primary-operator">
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
                            <div class="ui fluid search selection dropdown" data-op="primary-index-g">
                                <div class="text"></div>
                                <i class="dropdown icon"></i>
                            </div>
                        </div>
                        <div class="field">
                            <label>${this.intl('operation')}:</label>
                            <select class="ui fluid search selection dropdown" data-op="primary-operator-g">
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
    _intl_key () {
        return 'template_save';
    }

    _createModal () {
        return `
            <div class="small bordered dialog">
                <h2 class="header">${this.intl('title')}</h2>
                <div class="ui form">
                    <div class="field">
                        <label>${this.intl('select_existing')}:</label>
                        <div class="ui search selection dropdown" data-op="dropdown">
                            <div class="text"></div>
                            <i class="dropdown icon"></i>
                        </div>
                    </div>
                    <div class="field text-center"><label>${this.intl('or')}</label></div>
                    <div class="field">
                        <label>${this.intl('select_new')}:</label>
                        <input type="text" placeholder="${this.intl('name')}" data-op="input">
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
        this.$input = this.$parent.find('[data-op="input"]');
    }

    _getName () {
        let inputText = this.$input.val();
        let dropdownText = this.$dropdown.dropdown('get value');

        return inputText.trim() || dropdownText.trim() || `New template (${formatDate(Date.now())})`;
    }

    _applyArguments (parentName, callback) {
        this.callback = callback;
        this.supressNext = false;

        this.$input.off('input').val('').on('input', (event) => {
            this.supressNext = true;
            this.$dropdown.dropdown('clear');
        });

        this.$dropdown.dropdown({
            placeholder: this.intl('select_existing'),
            values: Templates.getKeys().map(key => {
                return {
                    name: key,
                    value: key
                }
            })
        }).dropdown('setting', 'onChange', () => {
            if (!this.supressNext) {
                this.$input.val('');
            }

            this.supressNext = false;
        }).dropdown('set selected', parentName || '');
    }
})();

const DataManageDialog = new (class extends Dialog {
    _intl_key () {
        return 'data_manage';
    }

    _createModal () {
        return `
            <div class="small bordered dialog">
                <h2 class="header">${this.intl('title')}</h2>
                <div class="overflow-y-auto" style="max-height: 60vh;">
                    <div class="ui form" data-op="content"></div>
                </div>
                <div class="ui checkbox ml-8" data-op="checkbox">
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
    _intl_key () {
        return 'input';
    }

    _createModal () {
        return `
            <div class="small bordered dialog">
                <h2 class="left header" data-op="title"></h2>
                <div class="ui form">
                    <div class="field" data-op="field">
                        <label data-op="label"></label>
                        <input type="text" data-op="input">
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
    _intl_key () {
        return 'confirm';
    }

    _createModal () {
        return `
            <div class="small bordered dialog">
                <h2 class="left header" data-op="title"></h2>
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
        return `${useRemote ? 'https://sftools.mar21.eu' : ''}/js/lang/${locale}.json?v=${LOCALES_VERSION}`;
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

        $('.css-menu').append($picker);

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

    if (PreferencesHandler._isAccessible()) {
        if (!SiteOptions.terms_accepted) {
            DialogController.open(TermsAndConditionsDialog);
        }

        if (SiteOptions.version_accepted != MODULE_VERSION) {
            DialogController.open(ChangeLogDialog);
        }
    }

    DialogController.open(ConfirmDialog, 'DDA', 'DAD', 'DD');

    Site.run();
});
