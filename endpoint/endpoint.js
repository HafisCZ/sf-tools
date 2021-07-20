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

    login_querry_only (server, username, password, callback, error) {
        // Bind error callbacks
        this.window.error['login'] = error;
        this.window.error['querry'] = error;

        // Bind success callbacks
        this.window.callback['querry'] = callback;
        this.window.callback['login'] = () => {
            // Fire collect on login success
            Logger.log('ECLIENT', `Collecting data`);
            this.window.querry_collect();
        }

        // Login
        Logger.log('ECLIENT', `Logging in as ${ username }@${ server }`);
        this.window.login(server, username, password);
    }

    login_querry_all (server, username, password, callback, error, progress) {
        // Bind error callbacks
        this.window.error['login'] = error;
        this.window.error['querry'] = error;

        // Bind success callbacks
        this.window.callback['progress'] = progress;
        this.window.callback['querry'] = callback;
        this.window.callback['login'] = (text) => {
            // Querry all
            Logger.log('ECLIENT', `Querry all`);
            this.window.querry_all();
        }

        // Login
        Logger.log('ECLIENT', `Logging in as ${ username }@${ server }`);
        this.window.login(server, username, password);
    }

    querry_single (id, callback, error) {
        this.window.callback['querry_single'] = callback;
        this.window.error['querry'] = callback;

        Logger.log('ECLIENT', `Querrying character: ${ id }`);
        this.window.querry_single(id);
    }

    querry_collect (callback) {
        this.window.callback['querry'] = callback;

        Logger.log('ECLIENT', `Collecting data`);
        this.window.querry_collect();
    }
}

const Endpoint = new ( class {
    start () {
        if (!this.$parent) {
            this._createModal();
            this._addBindings();
        }

        this._show();
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
        let selectionMode = window.localStorage['endpoint_mode'] || 'default';
        switch (selectionMode) {
            case 'own': {
                this.$modeOwn.checkbox('set checked');
                break;
            }
            case 'all': {
                this.$modeAll.checkbox('set checked');
                break;
            }
            default: {
                this.$modeDefault.checkbox('set checked');
            }
        }

        this.$modeDefault.checkbox({ onChecked: () => { window.localStorage['endpoint_mode'] = 'default' } });
        this.$modeOwn.checkbox({ onChecked: () => { window.localStorage['endpoint_mode'] = 'own' } });
        this.$modeAll.checkbox({ onChecked: () => { window.localStorage['endpoint_mode'] = 'all' } });
    }

    _showError (text, hard = false) {
        this.$error.show();
        this.$errorText.text(text);
        this.$errorButton.one('click', () => {
            this.$error.hide();
            if (hard) {
                this._funcShutdown();
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

    _hide () {
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
        this.$modeAll = this.$parent.find('[data-op="modeAll"]').checkbox();
        this._setModeSelection();

        this.$iframe = this.$parent.find('[data-op="iframe"]');
        this.$list = this.$parent.find('[data-op="list"]');
        this.$import = this.$parent.find('[data-op="import"]');

        this.endpoint = undefined;
        this.downloading = [];

        this.$parent.find('[data-op="back"]').click(() => this._funcShutdown());

        this.$import.click(() => {
            this.$step4.show();
            this.$step3.hide();
            this.endpoint.querry_collect((text) => {
                DatabaseManager.import(text, Date.now(), new Date().getTimezoneOffset() * 60 * 1000);
                this._funcShutdown();
                UI.current.show();
            });
        });

        this.$login = this.$parent.find('[data-op="login"]').click(() => {
            var username = this.$username.val();
            var password = this.$password.val();
            var server = '';

            var own = this.$modeOwn.checkbox('is checked');
            var all = this.$modeAll.checkbox('is checked');

            if (/^(.{4,})@(.+\.sfgame\..+)$/.test(username)) {
                [, username, server, ] = username.split(/^(.{4,})@(.+\.sfgame\..+)$/);
            } else {
                return;
            }

            if (username.length < 3 || password.length < 3 || !/\.sfgame\./.test(server)) {
                return;
            } else {
                if (this.endpoint) {
                    this.$step1.hide();
                    this.$step4.show();

                    if (own) {
                        this._funcLoginSingle(server, username, password);
                    } else if (all) {
                        this._funcLoginAll(server, username, password);
                    } else {
                        this._funcLogin(server, username, password);
                    }
                } else {
                    this.$step1.hide();
                    this.$step2.show();
                    this.endpoint = new EndpointController(this.$iframe, () => {
                        this.$step2.hide();
                        this.$step4.show();

                        if (own) {
                            this._funcLoginSingle(server, username, password);
                        } else if (all) {
                            this._funcLoginAll(server, username, password);
                        } else {
                            this._funcLogin(server, username, password);
                        }
                    });
                }
            }
        });
    }

    _funcLoginSingle (server, username, password) {
        this.endpoint.login_querry_only(server, username, password, (text) => {
            DatabaseManager.import(text, Date.now(), new Date().getTimezoneOffset() * 60 * 1000);
            this._funcShutdown();
            UI.current.show();
        }, () => {
            this.$step4.hide();
            this._showError('Wrong username or password');
        });
    };

    _funcLoginAll (server, username, password) {
        this.endpoint.login_querry_all(server, username, password, (text) => {
            DatabaseManager.import(text, Date.now(), new Date().getTimezoneOffset() * 60 * 1000);
            this._funcShutdown();
            UI.current.show();
        }, () => {
            this.$step4.hide();
            this.$step5.hide();
            this._showError('Wrong username or password');
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

            var content = '';
            for (var name of text.split(',')) {
                content += `
                    <div class="item">
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

            $('.list .checkbox').slice(1).checkbox('setting', 'onChecked', () => {
                var name = $(event.target).attr('for') || this.customTarget;
                this.customTarget = null;

                this._setDownloading(name);
                this.endpoint.querry_single(name, (value) => {
                    this._removeDownloading(name);
                }, () => {
                    this.$step3.hide();
                    this._showError('Download failed', true);
                });
            });
        }, () => {
            this.$step4.hide();
            this._showError('Wrong username or password');
        });
    }

    _funcShutdown () {
        if (this.endpoint) {
            this.endpoint.destroy();
            this.endpoint = undefined;
        }

        this._hide();
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
                                <label style="color: white;">Username</label>
                                <input type="text" autocomplete="username" data-op="textUsername" name="username" placeholder="username@s1.sfgame.de">
                            </div>
                            <div class="field">
                                <label style="color: white;">Password</label>
                                <input type="password" autocomplete="current-password" name="password" data-op="textPassword">
                            </div>
                            <div class="grouped fields">
                                <div class="field">
                                    <div class="ui radio checkbox" data-op="modeDefault">
                                        <input type="radio" name="endpointMode" checked="checked">
                                        <label style="color: white;">Capture own + selected characters</label>
                                    </div>
                                </div>
                                <div class="field">
                                    <div class="ui radio checkbox" data-op="modeOwn">
                                        <input type="radio" name="endpointMode">
                                        <label style="color: white;">Capture own character</label>
                                    </div>
                                </div>
                                <div class="field">
                                    <div class="ui radio checkbox" data-op="modeAll">
                                        <input type="radio" name="endpointMode">
                                        <label style="color: white;">Capture all characters</label>
                                    </div>
                                </div>
                            </div>
                            <br/>
                            <div class="ui two buttons">
                                <button class="ui secondary button fluid" data-op="back">Cancel</button>
                                <button class="ui primary button fluid" data-op="login">Continue</button>
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
                        <h3 class="ui header centered white">Loading Endpoint</h3>
                    </div>
                </div>
                <div class="ui grid" data-op="step3" style="display: none; margin-top: -14em;">
                    <div class="five wide column"></div>
                    <div class="six wide column">
                        <h2 class="ui header centered white">Select players to be imported</h2>
                        <hr/>
                        <div class="ui celled relaxed list" data-op="list" style="height: 30em; overflow-y: auto;">

                        </div>
                        <div class="ui two buttons">
                            <button class="ui secondary button fluid" data-op="back">Cancel</button>
                            <button class="ui primary button fluid" data-op="import">Continue</button>
                        </div>
                    </div>
                    <div class="five wide column"></div>
                </div>
                <div class="ui grid" data-op="step4" style="display: none;">
                    <div class="ui large text loader">Contacting the server for information</div>
                </div>
                <div class="ui grid" data-op="step5" style="display: none; margin-top: -14em;">
                    <div class="five wide column"></div>
                    <div class="six wide column">
                        <h3 class="ui header centered white">Fetching data</h3>
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
                        <button class="ui secondary button fluid" data-op="error-button">Continue</button>
                    </div>
                    <div class="five wide column"></div>
                </div>
            </div>
        `).appendTo($('body').first());
    }
})();
