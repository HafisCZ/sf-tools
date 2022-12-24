class EndpointController {
    constructor ($iframe, callback) {
        this.$iframe = $iframe;
        this.$iframe.attr('src', '/endpoint/index.html');
        this.$iframe.one('load', () => {
            this.window = this.$iframe.get(0).contentWindow;
            this.window.load(() => {
                Logger.log('ECLIENT', 'Client started');
                callback(this);
            });
        });
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
        this.window.error['query'] = callback;

        Logger.log('ECLIENT', `Querying character: ${ id }`);
        this.window.query_single(id);
    }

    query_collect (callback) {
        this.window.callback['query'] = callback;

        Logger.log('ECLIENT', `Collecting data`);
        this.window.query_collect();
    }
}

const Endpoint = new ( class {
    start () {
        return new Promise(resolve => {
            if (!this.$parent) {
                this._createModal();
                this._addBindings();
            }

            this.resolveFunction = resolve;
            this._show();
        })
    }

    intl (key) {
        return intl(`endpoint.${key}`);
    }

    _show () {
        this.$step1.show();
        this.$step2.hide();
        this.$step3.hide();
        this.$step4.hide();
        this.$step5.hide();

        this.$error.hide();

        this.$parent.modal({
            centered: true,
            closable: false,
            transition: 'fade'
        }).modal('show');
    }

    _setModeSelection () {
        let selectionMode = SharedPreferences.getRaw('endpoint_mode', 'default');
        switch (selectionMode) {
            case 'own': {
                this.$modeOwn.checkbox('set checked');
                break;
            }
            case 'all':
            case 'all_members': {
                this.$modeAllMembers.checkbox('set checked');
                break;
            }
            case 'all_friends': {
                this.$modeAllFriends.checkbox('set checked');
                break;
            }
            case 'hall_of_fame': {
                this.$modeHallOfFame.checkbox('set checked');
                break;
            }
            default: {
                this.$modeDefault.checkbox('set checked');
            }
        }

        this.$modeDefault.checkbox({ onChecked: () => SharedPreferences.setRaw('endpoint_mode', 'default') });
        this.$modeOwn.checkbox({ onChecked: () => SharedPreferences.setRaw('endpoint_mode', 'own') });
        this.$modeAllMembers.checkbox({ onChecked: () => SharedPreferences.setRaw('endpoint_mode', 'all_members') });
        this.$modeAllFriends.checkbox({ onChecked: () => SharedPreferences.setRaw('endpoint_mode', 'all_friends') });
        this.$modeHallOfFame.checkbox({ onChecked: () => SharedPreferences.setRaw('endpoint_mode', 'hall_of_fame') });
    }

    _showError (text, hard = false) {
        this.$error.show();
        this.$errorText.text(text);
        this.$errorButton.one('click', () => {
            this.$error.hide();
            if (hard) {
                this._funcShutdown(false);
            } else {
                this.$step1.show();
            }
        });
    }

    _setDownloading (name) {
        this.downloading.push(name);
        if (this.downloading.length > 0) {
            this.$import.attr('disabled', 'true');
            this.$import.addClass('loading');
        }
    }

    _removeDownloading (name) {
        this.downloading.splice(this.downloading.indexOf(name), 1);
        if (this.downloading.length == 0) {
            this.$import.removeAttr('disabled');
            this.$import.removeClass('loading');
        }
    }

    _hide (actionSuccess) {
        this.resolveFunction(actionSuccess);
        this.$parent.modal('hide');
    }

    _addBindings () {
        this.$step1 = this.$parent.find('[data-op="step1"]');
        this.$step2 = this.$parent.find('[data-op="step2"]');
        this.$step3 = this.$parent.find('[data-op="step3"]');
        this.$step4 = this.$parent.find('[data-op="step4"]');
        this.$step5 = this.$parent.find('[data-op="step5"]');

        this.$progress = this.$step5.find('.ui.progress');

        this.$error = this.$parent.find('[data-op="error"]');
        this.$errorText = this.$parent.find('[data-op="error-text"]');
        this.$errorButton = this.$parent.find('[data-op="error-button"]');

        this.$username = this.$parent.find('[data-op="textUsername"]');
        this.$password = this.$parent.find('[data-op="textPassword"]');

        this.$modeDefault = this.$parent.find('[data-op="modeDefault"]').checkbox();
        this.$modeOwn = this.$parent.find('[data-op="modeOwn"]').checkbox();
        this.$modeAllMembers = this.$parent.find('[data-op="modeAllMembers"]').checkbox();
        this.$modeAllFriends = this.$parent.find('[data-op="modeAllFriends"]').checkbox();
        this.$modeHallOfFame = this.$parent.find('[data-op="modeHallOfFame"]').checkbox();
        this._setModeSelection();

        this.$iframe = this.$parent.find('[data-op="iframe"]');
        this.$list = this.$parent.find('[data-op="list"]');
        this.$import = this.$parent.find('[data-op="import"]');
        this.$login = this.$parent.find('[data-op="login"]');

        this.endpoint = undefined;
        this.downloading = [];

        this.$parent.find('[data-op="back"]').click(() => this._funcShutdown(false));

        this.$import.click(() => {
            this.$step4.show();
            this.$step3.hide();
            this.endpoint.query_collect((text) => {
                DatabaseManager.import(text, Date.now(), new Date().getTimezoneOffset() * 60 * 1000).catch((e) => {
                    Toast.error(intl('database.import_error'), e.message);
                    Logger.error(e, 'Error occured while trying to import a file!');
                }).then(() => {
                    this._funcShutdown(true);
                });
            });
        });

        const executeLogin = () => {
            var username = this.$username.val();
            var password = this.$password.val();
            var server = '';

            const mode_own = this.$modeOwn.checkbox('is checked');
            const mode_all_members = this.$modeAllMembers.checkbox('is checked');
            const mode_all_friends = this.$modeAllFriends.checkbox('is checked');
            const mode_hall_of_fame = this.$modeHallOfFame.checkbox('is checked');

            if (/^(.{3,})@(.+\.sfgame\..+)$/.test(username)) {
                [, username, server, ] = username.split(/^(.{3,})@(.+\.sfgame\..+)$/);
            } else {
                Toast.warn(this.intl('user_error.title'), this.intl('user_error.message'));
                return;
            }

            if (username.length < 3 || password.length < 3 || !/\.sfgame\./.test(server)) {
                return;
            } else {
                if (this.endpoint) {
                    this.$step1.hide();
                    this.$step4.show();

                    if (mode_own) {
                        this._funcLoginSingle(server, username, password);
                    } else if (mode_all_members) {
                        this._funcLoginAll(server, username, password, 'members');
                    } else if (mode_all_friends) {
                        this._funcLoginAll(server, username, password, 'friends');
                    } else if (mode_hall_of_fame) {
                        this._funcLoginHOF(server, username, password);
                    } else {
                        this._funcLogin(server, username, password);
                    }
                } else {
                    this.$step1.hide();
                    this.$step2.show();
                    this.endpoint = new EndpointController(this.$iframe, () => {
                        this.$step2.hide();
                        this.$step4.show();

                        if (mode_own) {
                            this._funcLoginSingle(server, username, password);
                        } else if (mode_all_members) {
                            this._funcLoginAll(server, username, password, 'members');
                        } else if (mode_all_friends) {
                            this._funcLoginAll(server, username, password, 'friends');
                        } else if (mode_hall_of_fame) {
                            this._funcLoginHOF(server, username, password);
                        } else {
                            this._funcLogin(server, username, password);
                        }
                    });
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

    _funcLoginSingle (server, username, password) {
        this.endpoint.login_query_only(server, username, password, (text) => {
            DatabaseManager.import(text, Date.now(), new Date().getTimezoneOffset() * 60 * 1000).catch((e) => {
                Toast.error(intl('database.import_error'), e.message);
                Logger.error(e, 'Error occured while trying to import a file!');
            }).then(() => {
                this._funcShutdown(true);
            });
        }, () => {
            this.$step4.hide();
            this._showError(this.intl('credentials_error'));
        });
    };

    _funcLoginHOF (server, username, password) {
        this.endpoint.login_query_hall_of_fame(server, username, password, (text) => {
            DatabaseManager.import(text, Date.now(), new Date().getTimezoneOffset() * 60 * 1000).catch((e) => {
                Toast.error(intl('database.import_error'), e.message);
                Logger.error(e, 'Error occured while trying to import a file!');
            }).then(() => {
                this._funcShutdown(true);
            });
        }, () => {
            this.$step4.hide();
            this.$step5.hide();
            this._showError(this.intl('credentials_error'));
        }, percentDone => {
            this.$step4.hide();
            this.$step5.show();
            this.$progress.progress({
                percent: percentDone
            })
        });
    }

    _funcLoginAll (server, username, password, kind = 'members') {
        this.endpoint.login_query_many(server, username, password, (text) => {
            const [members, friends] = text.split(';');
            return kind == 'members' ? members : friends;
        }, (text) => {
            DatabaseManager.import(text, Date.now(), new Date().getTimezoneOffset() * 60 * 1000).catch((e) => {
                Toast.error(intl('database.import_error'), e.message);
                Logger.error(e, 'Error occured while trying to import a file!');
            }).then(() => {
                this._funcShutdown(true);
            });
        }, () => {
            this.$step4.hide();
            this.$step5.hide();
            this._showError(this.intl('credentials_error'));
        }, percentDone => {
            this.$step4.hide();
            this.$step5.show();
            this.$progress.progress({
                percent: percentDone
            })
        });
    };

    _funcLogin (server, username, password) {
        this.endpoint.login(server, username, password, (text) => {
            this.$step4.hide();
            this.$step3.show();

            let content = '';
            let [members, friends] = text.split(';');

            for (var name of members.split(',')) {
                content += `
                    <div class="item item-member">
                        <div class="ui checkbox">
                            <input type="checkbox" name="${ name }">
                            <label for="${ name }" style="color: white; font-size: 110%;">${ name }</label>
                        </div>
                    </div>
                `;
            }

            for (var name of friends.split(',').slice(1)) {
                content += `
                    <div class="item item-friend">
                        <div class="ui checkbox">
                            <input type="checkbox" name="${ name }">
                            <label for="${ name }" style="color: white; font-size: 110%;">${ name }</label>
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

    _funcShutdown (actionSuccess) {
        if (this.endpoint) {
            this.endpoint.destroy();
            this.endpoint = undefined;
        }

        this._hide(actionSuccess);
    }

    _createModal () {
        this.$parent = $(`
            <div id="endpoint-modal" class="ui basic modal">
                <iframe style="opacity: 0%;" data-op="iframe"></iframe>
                <div class="ui grid" data-op="step1" style="margin-top: -14em;">
                    <div class="five wide column"></div>
                    <div class="six wide column">
                        <div class="ui form darker-placeholder">
                            <div class="field">
                                <label style="color: white;">${this.intl('username')}</label>
                                <input type="text" autocomplete="username" data-op="textUsername" name="username" placeholder="username@s1.sfgame.de">
                            </div>
                            <div class="field">
                                <label style="color: white;">${this.intl('password')}</label>
                                <input type="password" autocomplete="current-password" name="password" data-op="textPassword">
                            </div>
                            <div class="grouped fields">
                                <div class="field">
                                    <div class="ui radio checkbox" data-op="modeOwn">
                                        <input type="radio" name="endpointMode">
                                        <label style="color: white;">${this.intl('mode.own')}</label>
                                    </div>
                                </div>
                                <div class="field">
                                    <div class="ui radio checkbox" data-op="modeDefault">
                                        <input type="radio" name="endpointMode" checked="checked">
                                        <label style="color: white;">${this.intl('mode.default')}</label>
                                    </div>
                                </div>
                                <div class="field">
                                    <div class="ui radio checkbox" data-op="modeAllMembers">
                                        <input type="radio" name="endpointMode">
                                        <label style="color: white;">${this.intl('mode.guild')}</label>
                                    </div>
                                </div>
                                <div class="field">
                                    <div class="ui radio checkbox" data-op="modeAllFriends">
                                        <input type="radio" name="endpointMode">
                                        <label style="color: white;">${this.intl('mode.friends')}</label>
                                    </div>
                                </div>
                                <div class="field">
                                    <div class="ui radio checkbox" data-op="modeHallOfFame">
                                        <input type="radio" name="endpointMode">
                                        <label style="color: white;">${this.intl('mode.hall_of_fame')}</label>
                                    </div>
                                </div>
                            </div>
                            <br/>
                            <div class="ui two buttons">
                                <button class="ui secondary button fluid" data-op="back">${this.intl('cancel')}</button>
                                <button class="ui primary button fluid" data-op="login">${this.intl('continue')}</button>
                            </div>
                        </div>
                    </div>
                    <div class="five wide column"></div>
                </div>
                <div class="ui grid" data-op="step2" style="display: none; margin-top: -14em;">
                    <div class="sixteen wide column">
                        <img src="/endpoint/logo.png" class="unity-loading">
                    </div>
                    <div class="sixteen wide column">
                        <h3 class="ui header centered white">${this.intl('step2.title')}</h3>
                    </div>
                </div>
                <div class="ui grid" data-op="step3" style="display: none; margin-top: -14em;">
                    <div class="five wide column"></div>
                    <div class="six wide column">
                        <h2 class="ui header centered white">${this.intl('step3.title')}</h2>
                        <hr/>
                        <div class="ui celled relaxed list" data-op="list" style="height: 30em; overflow-y: auto;">

                        </div>
                        <div class="ui two buttons">
                            <button class="ui secondary button fluid" data-op="back">${this.intl('cancel')}</button>
                            <button class="ui primary button fluid" data-op="import">${this.intl('continue')}</button>
                        </div>
                    </div>
                    <div class="five wide column"></div>
                </div>
                <div class="ui grid" data-op="step4" style="display: none;">
                    <div class="ui large active text loader">${this.intl('step4.title')}</div>
                </div>
                <div class="ui grid" data-op="step5" style="display: none; margin-top: -14em;">
                    <div class="five wide column"></div>
                    <div class="six wide column">
                        <h3 class="ui header centered white">${this.intl('step4.message')}</h3>
                        <div class="ui green active progress" data-percent="0">
                            <div class="bar">
                            </div>
                        </div>
                    </div>
                    <div class="five wide column"></div>
                </div>
                <div class="ui grid" data-op="error" style="display: none; margin-top: -14em;">
                    <div class="five wide column"></div>
                    <div class="six wide column">
                        <h2 class="ui header centered white" data-op="error-text"></h2>
                        <br/>
                        <br/>
                        <button class="ui secondary button fluid" data-op="error-button">${this.intl('continue')}</button>
                    </div>
                    <div class="five wide column"></div>
                </div>
            </div>
        `).appendTo($('body').first());
    }
})();

const StatisticsIntegration = new (class {
    configure (profile, pollLabel, callback) {
        let $statsModule = $(`<div class="statistics-module" id="stats-module"></div>`).appendTo($(document.body));
        let $statsLoad = $(`<div class="ui fluid basic gray button" id="load-stats"><i class="sync alternate icon"></i>${pollLabel}</div>`).appendTo($statsModule);
        let $statsList = $(`<div id="stats-list"></div>`).appendTo($statsModule);

        $statsLoad.click(() => {
            Loader.toggle(true);
            DatabaseManager.load(profile).then(function () {
                $statsList.empty();
                callback($statsList);

                $statsList.append(
                    $('<div style="margin-top: 0.5em;"></div>').append(
                        $('<div class="ui two basic tiny gray buttons"></div>').append(
                            $(`
                                <div class="ui fluid button vertical">
                                    <div class="visible content">
                                        <span style="color: gray;">Endpoint<span>
                                    </div>
                                </div>
                            `).click(() => {
                                Endpoint.start().then((actionSuccess) => {
                                    if (actionSuccess) {
                                        $statsLoad.trigger('click');
                                    }
                                });
                            }),
                            $(`
                                <label class="ui fluid button vertical" for="endpoint-button-upload">
                                    <span style="color: gray;">HAR<span>
                                </label>
                                <input type="file" multiple data-op="upload" accept=".har,.json" class="ui invisible file input" id="endpoint-button-upload">
                            `).change((fileEvent) => {
                                Loader.toggle(true);

                                let pendingPromises = [];
                                Array.from(fileEvent.target.files).forEach(file => {
                                    pendingPromises.push(file.text().then(fileContent => {
                                        return DatabaseManager.import(fileContent, file.lastModified);
                                    }).catch(function (e) {
                                        Toast.error(intl('database.import_error'), e.message);
                                        Logger.error(e, 'Error occured while trying to import a file!');
                                    }));
                                });

                                Promise.all(pendingPromises).then(() => {
                                    $statsLoad.trigger('click');
                                });
                            })
                        )
                    )
                );

                Loader.toggle(false);
            }).catch(function (e) {
                Loader.toggle(false);

                Toast.error(intl('database.open_error.title'), intl('database.open_error.message'));
                Logger.error(e, `Database could not be opened! Reason: ${e.message}`);

                $statsList.empty();
            });
        });
    }
})();
