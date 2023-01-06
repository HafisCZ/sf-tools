class EndpointController {
    constructor ($iframe) {
        this.$iframe = $iframe;
    }

    load () {
        return new Promise((resolve) => {
            this.$iframe.attr('src', '/endpoint/index.html');
            this.$iframe.one('load', () => {
                this.window = this.$iframe.get(0).contentWindow;
                this.window.load(() => {
                    Logger.log('ECLIENT', 'Client started');
                    resolve(this);
                });
            });
        }) 
    }

    destroy () {
        this.window.destroy(() => {
            Logger.log('ECLIENT', 'Client stopped');
            this.$iframe.attr('src', '');
        });
    }

    login (server, username, password, callback, error) {
        this.window.callback['login'] = callback;
        this.window.error['login'] = error;

        Logger.log('ECLIENT', `Logging in as ${ username }@${ server }`);
        this.window.login(server, username, password);
    }

    login_query_only (server, username, password, callback, error) {
        // Bind error callbacks
        this.window.error['login'] = error;
        this.window.error['query'] = error;

        // Bind success callbacks
        this.window.callback['query'] = callback;
        this.window.callback['login'] = () => {
            // Fire collect on login success
            Logger.log('ECLIENT', `Collecting data`);
            this.window.query_collect();
        }

        // Login
        Logger.log('ECLIENT', `Logging in as ${ username }@${ server }`);
        this.window.login(server, username, password);
    }

    login_query_many (server, username, password, filter, callback, error, progress) {
        // Bind error callbacks
        this.window.error['login'] = error;
        this.window.error['query'] = error;

        // Bind success callbacks
        this.window.callback['progress'] = progress;
        this.window.callback['query'] = callback;
        this.window.callback['login'] = (text) => {
            // Query all
            Logger.log('ECLIENT', `Query many`);
            this.window.query_many(filter(text));
        }

        // Login
        Logger.log('ECLIENT', `Logging in as ${ username }@${ server }`);
        this.window.login(server, username, password);
    }

    login_query_hall_of_fame (server, username, password, callback, error, progress) {
        // Bind error callbacks
        this.window.error['login'] = error;
        this.window.error['query'] = error;

        // Bind success callbacks
        this.window.callback['progress'] = progress;
        this.window.callback['query'] = callback;
        this.window.callback['login'] = () => {
            // Query all
            Logger.log('ECLIENT', `Query HOF`);
            this.window.query_hall_of_fame();
        }

        // Login
        Logger.log('ECLIENT', `Logging in as ${ username }@${ server }`);
        this.window.login(server, username, password);
    }

    query_single (id, callback, error) {
        this.window.callback['query_single'] = callback;
        this.window.error['query'] = error;

        Logger.log('ECLIENT', `Querying character: ${ id }`);
        this.window.query_single(id);
    }

    query_collect (callback) {
        this.window.callback['query'] = callback;

        Logger.log('ECLIENT', `Collecting data`);
        this.window.query_collect();
    }
}

const ENDPOINT_MODES = ['own', 'default', 'guild', 'friends', 'hall_of_fame'];

const Endpoint = new (class extends Dialog {
    intl (key) {
        return intl(`endpoint.${key}`);
    }

    _canOpen () {
        return true;
    }

    _applyArguments () {
        this.$step1.show();
        this.$step2.hide();
        this.$step3.hide();
        this.$step4.hide();
        this.$step5.hide();
        this.$step6.hide();

        // Clear variables
        this.downloading = new Set();
    }

    _showError (text, hard = false) {
        this.$step6.show();

        this.$errorText.text(text);
        this.$errorButton.one('click', () => {
            this.$step6.hide();

            if (hard) {
                this.close(false);
            } else {
                this.$step1.show();
            }
        });
    }

    _setDownloading (name) {
        this.downloading.add(name);
        if (this.downloading.size > 0) {
            this.$import.attr('disabled', 'true');
            this.$import.addClass('loading');
        }
    }

    _removeDownloading (name) {
        this.downloading.delete(name);
        if (this.downloading.size == 0) {
            this.$import.removeAttr('disabled');
            this.$import.removeClass('loading');
        }
    }

    _createBindings () {
        // Login Form
        this.$step1 = this.$parent.find('[data-op="step1"]');
        // Unity Loader
        this.$step2 = this.$parent.find('[data-op="step2"]');
        // Player Selector
        this.$step3 = this.$parent.find('[data-op="step3"]');
        // Generic Loader
        this.$step4 = this.$parent.find('[data-op="step4"]');
        // Progress Bar
        this.$step5 = this.$parent.find('[data-op="step5"]');
        // Error
        this.$step6 = this.$parent.find('[data-op="step6"]');

        this.$progress = this.$step5.find('.ui.progress');

        this.$errorText = this.$parent.find('[data-op="error-text"]');
        this.$errorButton = this.$parent.find('[data-op="error-button"]');

        // Endpoint credentials
        this.$username = this.$parent.find('[data-op="username"]');
        this.$password = this.$parent.find('[data-op="password"]');

        // Endpoint mode
        this.$mode = this.$parent.operator('mode');
        this.$mode.dropdown({
            values: ENDPOINT_MODES.map((value) => ({
                value,
                name: this.intl(`mode.${value}`),
                selected: value === SharedPreferences.getRaw('endpoint_mode', 'default')
            })),
            onChange: (value) => {
                SharedPreferences.setRaw('endpoint_mode', value)
            }
        });

        // Capture mode
        this.$temporary = this.$parent.operator('temporary').checkbox();

        this.$iframe = this.$parent.find('[data-op="iframe"]');
        this.$list = this.$parent.find('[data-op="list"]');
        this.$import = this.$parent.find('[data-op="import"]');
        this.$login = this.$parent.find('[data-op="login"]');

        this.endpoint = undefined;

        this.$parent.find('[data-op="back"]').click(() => this.close(false));

        this.$import.click(() => {
            this.$step4.show();
            this.$step3.hide();
            this.endpoint.query_collect((text) => this._import(text));
        });

        const executeLogin = async () => {
            var username = this.$username.val();
            var password = this.$password.val();
            var server = '';

            if (/^(.{3,})@(.+\.sfgame\..+)$/.test(username)) {
                [, username, server, ] = username.split(/^(.{3,})@(.+\.sfgame\..+)$/);
            } else {
                Toast.warn(this.intl('user_error.title'), this.intl('user_error.message'));
                return;
            }

            if (username.length < 3 || password.length < 3 || !/\.sfgame\./.test(server)) {
                return;
            } else {
                this.$step1.hide();

                if (typeof this.endpoint === 'undefined') {
                    this.endpoint = new EndpointController(this.$iframe);

                    this.$step2.show();
                    await this.endpoint.load();

                    this.$step2.hide();
                }

                this.$step4.show();

                const mode = this.$mode.dropdown('get value');
                if (mode === 'own') {
                    this._funcLoginSingle(server, username, password);
                } else if (mode === 'members') {
                    this._funcLoginAll(server, username, password, 'members');
                } else if (mode === 'friends') {
                    this._funcLoginAll(server, username, password, 'friends');
                } else if (mode === 'hall_of_fame') {
                    this._funcLoginHOF(server, username, password);
                } else /* default */ {
                    this._funcLogin(server, username, password);
                }
            }
        }

        this.$login.click(() => executeLogin());
        this.$step1.on('keyup', (event) => {
            if (event.keyCode === 13 && !event.shiftKey && !event.ctrlKey && !event.altKey) {
                executeLogin();
            }
        });
    }

    _import (text) {
        DatabaseManager.import(text, Date.now(), new Date().getTimezoneOffset() * 60 * 1000, { temporary: this.$temporary.checkbox('is checked') }).catch((e) => {
            Toast.error(intl('database.import_error'), e.message);
            Logger.error(e, 'Error occured while trying to import a file!');
        }).then(() => {
            this.close(true);
        });
    }

    _funcLoginSingle (server, username, password) {
        this.endpoint.login_query_only(server, username, password, (text) => this._import(text), () => {
            this.$step4.hide();
            this._showError(this.intl('credentials_error'));
        });
    };

    _funcLoginHOF (server, username, password) {
        this.endpoint.login_query_hall_of_fame(server, username, password, (text) => this._import(text), () => {
            this.$step4.hide();
            this.$step5.hide();
            this._showError(this.intl('credentials_error'));
        }, (percent) => {
            this.$step4.hide();
            this.$step5.show();
            this.$progress.progress({ percent })
        });
    }

    _funcLoginAll (server, username, password, kind = 'members') {
        this.endpoint.login_query_many(server, username, password, (text) => text.split(';')[kind === 'members' ? 0 : 1], (text) => this._import(text), () => {
            this.$step4.hide();
            this.$step5.hide();
            this._showError(this.intl('credentials_error'));
        }, (percent) => {
            this.$step4.hide();
            this.$step5.show();
            this.$progress.progress({ percent })
        });
    };

    _funcLogin (server, username, password) {
        this.endpoint.login(server, username, password, (text) => {
            this.$step4.hide();
            this.$step3.show();

            let content = '';
            const [members, friends] = text.split(';');

            for (const name of members.split(',')) {
                content += `
                    <div class="item">
                        <div class="ui checkbox w-full">
                            <input type="checkbox" name="${ name }">
                            <label for="${ name }">
                                <div class="flex justify-content-between">
                                    ${ name }
                                    <i class="ui user circle icon"></i>
                                </div>
                            </label>
                        </div>
                    </div>
                `;
            }

            for (const name of friends.split(',').slice(1)) {
                content += `
                    <div class="item">
                        <div class="ui checkbox w-full">
                            <input type="checkbox" name="${ name }">
                            <label for="${ name }">
                                <div class="flex justify-content-between">
                                    ${ name }
                                    <i class="ui thumbs up icon"></i>
                                </div>
                            </label>
                        </div>
                    </div>
                `;
            }

            this.$list.html(content);
            $('.list .checkbox').checkbox({
                uncheckable: false
            }).first().checkbox('set checked', 'true').checkbox('set disabled');

            for (const checkbox of $('.list .checkbox').slice(1)) {
                const name = $(checkbox).find('input').attr('name');

                $(checkbox).checkbox('setting', 'onChecked', () => {
                    this._setDownloading(name);
                    this.endpoint.query_single(name, (value) => {
                        this._removeDownloading(name);
                    }, () => {
                        this.$step3.hide();
                        this._showError(this.intl('download_error'));
                    });
                })
            }
        }, () => {
            this.$step4.hide();
            this._showError(this.intl('credentials_error'));
        });
    }

    close (actionSuccess) {
        if (this.endpoint) {
            this.endpoint.destroy();
            this.endpoint = undefined;
        }

        super.close(actionSuccess);
    }

    _createModal () {
        return `
            <div class="very small basic dialog">
                <iframe class="opacity-0 pointer-events-none position-fixed" data-op="iframe"></iframe>
                <div data-op="step1">${this._createStep1()}</div>
                <div data-op="step2">${this._createStep2()}</div>
                <div data-op="step3">${this._createStep3()}</div>
                <div data-op="step4">${this._createStep4()}</div>
                <div data-op="step5">${this._createStep5()}</div>
                <div data-op="step6">${this._createStep6()}</div>
            </div>
        `;
    }

    // Login screen
    _createStep1 () {
        return `
            <div class="ui inverted form">
                <div class="field">
                    <label>${this.intl('username')}</label>
                    <div class="ui input">
                        <input type="text" autocomplete="username" data-op="username" name="username" placeholder="username@s1.sfgame.de" pattern="^(.{3,})@(.+\.sfgame\..+)$">
                    </div>
                </div>
                <div class="field">
                    <label>${this.intl('password')}</label>
                    <input type="password" autocomplete="current-password" name="password" data-op="password">
                </div>
                <div class="field">
                    <label>${this.intl('mode.title')}</label>
                    <div class="ui fluid selection dropdown" data-op="mode">
                        <div class="text"></div>
                        <i class="dropdown icon"></i>
                    </div>
                </div>
                <div class="field">
                    <div class="ui checkbox" data-op="temporary">
                        <input type="checkbox" class="hidden">
                        <label>${this.intl('temporary')}</label>
                    </div>
                </div>
                <div class="ui two buttons">
                    <button class="ui secondary button" data-op="back">${this.intl('cancel')}</button>
                    <button class="ui primary button" data-op="login">${this.intl('continue')}</button>
                </div>
            </div>
        `;
    }

    // Unity loader
    _createStep2 () {
        return `
            <img class="ui centered image unity-loading" src="/endpoint/logo.png">
            <h3 class="ui white centered header">${this.intl('step2.title')}</h3>
        `;
    }

    // Selection screen
    _createStep3 () {
        return `
            <h2 class="ui header centered white">${this.intl('step3.title')}</h2>
            <hr/>
            <div class="ui celled relaxed list text-white" data-op="list" style="height: 30em; overflow-y: auto; font-size: 110%;">

            </div>
            <div class="ui two buttons">
                <button class="ui secondary button" data-op="back">${this.intl('cancel')}</button>
                <button class="ui primary button" data-op="import">${this.intl('continue')}</button>
            </div>
        `;
    }

    // Loader
    _createStep4 () {
        return `
            <div class="ui large text-white active text loader">${this.intl('step4.title')}</div>
        `;
    }

    // Progress bar
    _createStep5 () {
        return `
            <h3 class="ui white centered header">${this.intl('step4.message')}</h3>
            <div class="ui green active progress" data-percent="0">
                <div class="bar"></div>
            </div>
        `;
    }

    // Error message
    _createStep6 () {
        return `
            <h2 class="ui white centered header" data-op="error-text"></h2>
            <br/>
            <br/>
            <button class="ui secondary button fluid" data-op="error-button">${this.intl('continue')}</button>
        `;
    }
})();

const StatisticsIntegrationOptionsDialog = new (class extends Dialog {
    _intl_key () {
        return 'statistics_integration_options';
    }

    _createModal () {
        return `
            <div class="small bordered dialog">
                <h2 class="header">${this.intl('title')}</h2>
                <div class="ui form">
                    <div class="field">
                        <label>${this.intl('slot')}:</label>
                        <div class="ui fluid selection dropdown" data-op="slot">
                            <div class="text"></div>
                            <i class="dropdown icon"></i>
                        </div>
                    </div>
                    <div class="field">
                        <label>${this.intl('limit.title')}:</label>
                        <input type="number" min="0" placeholder="${this.intl('limit.placeholder')}" data-op="limit">
                    </div>
                    <div class="field">
                        <label>${this.intl('ignored_duration.title')}:</label>
                        <div class="ui fluid search selection dropdown" data-op="ignored_duration">
                            <div class="text"></div>
                            <i class="dropdown icon"></i>
                        </div>
                    </div>
                    <div class="field">
                        <label>${this.intl('ignored_identifiers.title')}:</label>
                        <div class="flex flex-col gap-2 pr-2 overflow-y-scroll" style="height: 15em;" data-op="ignored_identifiers"></div>
                    </div>
                </div>
                <div class="ui two fluid buttons">
                    <button class="ui black button" data-op="cancel">${intl('dialog.shared.cancel')}</button>
                    <button class="ui button !text-black !background-orange" data-op="save">${intl('dialog.shared.save')}</button>
                </div>
            </div>
        `;
    }

    _createBindings () {
        this.$cancel = this.$parent.operator('cancel');
        this.$cancel.click(() => {
            this.close();
        });

        this.$save = this.$parent.operator('save');
        this.$save.click(() => {
            this.close();
            this.callback({
                slot: parseInt(this.$slot.dropdown('get value')),
                limit: parseInt(this.$limit.val()),
                ignored_duration: parseInt(this.$ignored_duration.dropdown('get value')),
                ignored_identifiers: this.$ignored_identifiers.children().toArray().map(x => x.dataset.identifier)
            });
        });

        this.$slot = this.$parent.operator('slot');
        this.$slot.dropdown({
            values: [0, 1, 2, 3, 4, 5].map((i) => ({
                name: i === 0 ? intl('dialog.profile_create.default') : i,
                value: i
            }))
        });

        this.$limit = this.$parent.operator('limit');

        this.$ignored_duration = this.$parent.operator('ignored_duration');
        this.$ignored_duration.dropdown({
            values: [0, 86400000, 604800000, 2592000000, 7776000000].map((i) => ({
                name: this.intl(`ignored_duration.${i}`),
                value: i
            }))
        });

        this.$ignored_identifiers = this.$parent.operator('ignored_identifiers');
    }

    _applyArguments (options, callback) {
        this.options = options;
        this.callback = callback;

        this.$slot.dropdown('set selected', String(options.slot));
        this.$limit.val(options.limit);
        this.$ignored_duration.dropdown('set selected', String(options.ignored_duration));

        this.$ignored_identifiers.empty();
        for (const identifier of options.ignored_identifiers) {
            const $item = $(`
                <div class="ui disabled icon input !opacity-100" data-identifier="${identifier}">
                    <input class="text-black" type="text" disabled="">
                    <i class="ui times link text-black icon"></i>
                </div>
            `);

            const data = _dig(DatabaseManager.getAny(identifier), 'Latest', 'Data');

            $item.find('input').val(data ? `${data.name} @ ${_pretty_prefix(data.prefix)}` : identifier);
            $item.find('i').click(() => {
                $item.remove();
            });

            this.$ignored_identifiers.append($item);
        }
    }
})();

const StatisticsIntegration = new (class {
    configure ({ profile, type, callback, scope, generator }) {
        this.type = type;
        this.profile = profile;
        this.callback = callback;
        this.scope = scope;
        this.generator = generator;

        // Parent
        this.$parent = $(this._html()).appendTo($(document.body));

        // Containers
        this.$container = this.$parent.operator('container');
        this.$list = this.$parent.operator('list');

        // Buttons
        this.$poll = this.$parent.operator('poll');
        this.$poll.click(() => this._poll());
        
        this.$importEndpoint = this.$parent.operator('import-endpoint');
        this.$importEndpoint.click(() => this._importEndpoint());
        
        this.$importFile = this.$parent.operator('import-file');
        this.$importFile.change((event) => this._importFile(event));

        this.$showOptions = this.$parent.operator('show-options');
        this.$showOptions.toggle(typeof this.generator === 'undefined');
        this.$showOptions.click(() => this._showOptions());

        // Integration options
        this.options = new OptionsHandler(
            'integration',
            {
                limit: 0,
                slot: 0,
                ignored_identifiers: [],
                ignored_duration: 0
            }
        )
    }

    _html () {
        return `
            <div class="position-absolute left-8 top-20 z-2" style="width: 18em;">
                <div class="ui fluid basic button" data-op="poll"><i class="sync alternate icon"></i>${intl(`simulator.poll.${this.type}`)}</div>
                <div data-op="container" style="display: none;">
                    <div data-op="list"></div>
                    <div class="mt-2 flex">
                        <div class="ui three basic tiny fluid buttons">
                            <div class="ui button" data-op="import-endpoint">Endpoint</div>
                            <label class="ui button" for="endpoint-button-upload">HAR</label>
                            <input type="file" multiple data-op="import-file" accept=".har,.json" class="ui invisible file input" id="endpoint-button-upload">
                            <div class="ui icon button !m-0" style="display: none; max-width: 3em;" data-op="show-options"><i class="ui cog icon"></i></div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    _showOptions () {
        DialogController.open(
            StatisticsIntegrationOptionsDialog,
            this.options,
            (options) => {
                const simpleChange = this.options.slot === options.slot;
                for (const key of this.options.keys()) {
                    if (Array.isArray(this.options[key]) ? (this.options[key].length !== options[key].length || options[key].some((v, i) => v !== this.options[key][i])) : (this.options[key] !== options[key])) {
                        this.options[key] = options[key];
                    }
                }

                if (simpleChange) {
                    this._generate();
                } else {
                    this._poll();
                }
            }
        )
    }

    _importEndpoint () {
        Endpoint.open().then((actionSuccess) => {
            if (actionSuccess) {
                this._poll();
            }
        });
    }

    _importFile (event) {
        Loader.toggle(true);

        const promises = [];
        for (const file of Array.from(event.target.files)) {
            promises.push(file.text().then((fileContent) => DatabaseManager.import(fileContent, file.lastModified)).catch((e) => {
                Toast.error(intl('database.import_error'), e.message);
                Logger.error(e, 'Error occured while trying to import a file!');
            }));
        }

        Promise.all(promises).then(() => this._poll());
    }

    _generateItem (item) {
        if (this.type === 'players') {
            return {
                visible: `${item.Name} @ ${item.Prefix}`,
                hidden: `${intl('editor.level')} ${item.Level} ${intl(`general.class${item.Class}`)}`
            };
        } else /* if (this.type === 'guilds') */ {
            return {
                visible: `${item.Name} @ ${item.Prefix}`,
                hidden: formatDate(item.Timestamp)
            };
        }
    }

    _prepare (scope) {
        _sort_des(scope, item => item.Timestamp);

        if (this.options.ignored_duration) {
            scope = scope.filter(item => item.Timestamp > (Date.now() - this.options.ignored_duration));
        }

        if (this.options.ignored_identifiers) {
            scope = scope.filter(item => !this.options.ignored_identifiers.includes(item.Identifier));
        }

        if (this.options.limit) {
            scope = scope.slice(0, this.options.limit);
        }

        return scope;
    }

    _generate () {
        this.$list.empty();

        if (typeof this.generator === 'undefined') {
            for (const item of this._prepare(this.scope(DatabaseManager))) {
                const { visible, hidden } = this._generateItem(item);

                const $button = $(`
                    <div class="ui small fluid basic vertical animated button !mt-2">
                        <div class="visible content text-black">${visible}</div>
                        <div class="hidden content text-black">
                            <div>
                                <span>${hidden}</span>
                                <div data-op="hide" class="ui basic mini icon button" style="position: absolute; right: 0; top: calc(-1em * 2 / 3);"><i class="ui eye slash icon"></i></div>
                            </div>
                        </div>
                    </div>
                `).click(() => this.callback(item));
                
                const $hide = $button.operator('hide');
                $hide.click((event) => {
                    event.preventDefault();
                    event.stopPropagation();

                    const index = this.options.ignored_identifiers.indexOf(item.Identifier);
                    if (index === -1) {
                        $button.addClass('opacity-50');
                        $hide.find('i').removeClass('slash');

                        this.options.ignored_identifiers.push(item.Identifier);
                    } else {
                        $button.removeClass('opacity-50');
                        $hide.find('i').addClass('slash');

                        this.options.ignored_identifiers.splice(index, 1);
                    }

                    this.options.ignored_identifiers = this.options.ignored_identifiers;
                })
    
                this.$list.append($button);
            }
        } else {
            this.generator(DatabaseManager, this.$list);
        }
    }

    _poll () {
        Loader.toggle(true);
        DatabaseManager.load(Object.assign({ slot: this.options.slot }, this.profile)).then(() => {
            this._generate();

            this.$container.show();
        }).catch((e) => {
            Toast.error(intl('database.open_error.title'), intl('database.open_error.message'));
            Logger.error(e, `Database could not be opened! Reason: ${e.message}`);
            
            this.$container.hide();
        }).finally(function () {
            Loader.toggle(false);
        });
    }
})();
