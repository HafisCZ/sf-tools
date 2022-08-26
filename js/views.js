class Dialog {
    constructor (opacity = 0.85) {
        this.opacity = opacity;
    }

    open (...args) {
        return new Promise((resolve, reject) => {
            if (this.shouldOpen) {
                this.resolve = resolve;

                if (!this._hasParent()) {
                    const modal = $(this._createModal()).addClass('active');
                    const container = $(`
                        <div style="display: none; z-index: 99999; position: fixed; width: 100vw; height: 100vh; left: 0; top: 0; display: flex; align-items: center; justify-content: center; background: rgba(0, 0, 0, ${this.opacity})">
                        </div>
                    `);

                    modal.appendTo(container);
                    container.appendTo($('body').first());
                    this.$parent = container;

                    this._createModal();
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
}

const Toast = new (class {
    constructor () {
        this.toasts = [];
    }

    info (title, message) {
        this._show(null, title, message);
    }

    warn (title, message) {
        this._show('exclamation triangle', title, message);
    }

    error (title, message) {
        this._show('red exclamation circle', title, message);
    }

    _mount () {
        if (this.$parent) {
            return;
        } else {
            this.$parent = $('<div style="position: fixed; left: 1rem; bottom: 1rem; pointer-events: none; z-index: 99998;"></div>').appendTo(document.body);
        }
    }

    _show (icon, title, message) {
        this._mount();

        let $toast = $(`
            <div data-toast="${SHA1(Math.random().toString())}" class="ui transition hidden" style="margin-top: 1rem; width: 350px; max-width: 100%; font-size: 1rem; pointer-events: none; background-clip: padding-box; box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.15); border-radius: 0.375rem;">
                <div style="display: flex; align-items: center; padding: 0.5rem 0.75rem; color: white; border-top-left-radius: calc(0.375rem - 1px); border-top-right-radius: calc(0.375rem - 1px); font-weight: bold; background-color: #212121; border: 1px solid #212121;">
                    ${icon ? `<i data-op="icon" class="${icon} icon" style="color: orange; line-height: 1rem; margin-right: 0.5rem;"></i>` : ''}${title}
                </div>
                <div style="padding: 0.75rem; word-wrap: break-word; background-color: rgba(255, 255, 255, 0.85); border-bottom-left-radius: calc(0.375rem - 1px); border-bottom-right-radius: calc(0.375rem - 1px); border: 1px solid rgba(0, 0, 0, 0.175);">
                    <code>${message}</code>
                </div>
            </div>
        `).appendTo(this.$parent);

        $toast.transition('fade');
        setTimeout(() => this._destroy($toast), 6000);

        // Add toast to the queue
        this.toasts.unshift($toast);

        // Check and remove last toast if there is more than fit on the screen
        if (this.$parent.height() > window.innerHeight - 100) {
            this._destroy(this.toasts.pop());
        }
    }

    _destroy ($toast) {
        $toast.transition('fade', 500, () => {
            let toastId = $toast.data('toast');
            if (this.toasts.length > 0 && this.toasts[this.toasts.length - 1].data('toast') == toastId) {
                this.toasts.pop();
            }

            $toast.remove();
        });
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
            <div class="ui basic tiny modal" style="background-color: #0b0c0c; padding: 1em; margin: -2em; border-radius: 0.5em;">
                <h2 class="ui centered header" style="padding-bottom: 0.5em; padding-top: 0; text-decoration: underline;">Terms and Conditions</h2>
                <div style="height: 65vh; overflow-y: auto;">
                    <h4 class="ui centered header" style="padding-top: 0; color: orange;">§1 General use</h4>
                    <ul style="margin-top: 0; line-height: 1.3em;">
                        <li>It is advised to never share HAR files as they <b>might</b> contain private data such as IP address and cookies.</li>
                        <li style="margin-top: 0.5em;">The site is distributed <b>AS IS</b> wthout any warranties. You are fully responsible for use of this site.</li>
                        <li style="margin-top: 0.5em;">You're free to share, copy and modify the site, but you are not allowed to distribute it or any of it's parts without explicit approval.</li>
                        <li style="margin-top: 0.5em;">You agree to limit data collection from the game to reasonable amounts.</li>
                        <li style="margin-top: 0.5em;">You agree to follow the Shakes & Fidget <a href="https://cdn.playa-games.com/res/sfgame3/legal/html/terms_en.html">Terms and Conditions</a></li>
                        <li style="margin-top: 0.5em;">You are not allowed to automate any part of this tool.</li>
                    </ul>
                    <h4 class="ui centered header" style="padding-top: 0; color: orange;">§2 Endpoint</h4>
                    <ul style="margin-top: 0; line-height: 1.3em;">
                        <li>Endpoint is a Unity application bundled with the tool that allows you to log into the game and collect limited data about yourself and your guild members without the lengthy process of creating a HAR file.</li>
                        <li style="margin-top: 0.5em;">It is not possible to capture any other players than those listed above.</li>
                        <li style="margin-top: 0.5em;">Everything happens locally in a identical way to playing the game through browser.</li>
                    </ul>
                    <h4 class="ui centered header" style="padding-top: 0; color: orange;">§3 Integrated share service</h4>
                    <ul style="margin-top: 0; line-height: 1.3em;">
                        <li>All data shared via the integrated share function is not protected in any other way other than the share key.</li>
                        <li style="margin-top: 0.5em;">The shared data might be deleted at any point of time, up to full 2 days.</li>
                    </ul>
                    <h4 class="ui centered header" style="padding-top: 0; color: orange;">§4 Sentry</h4>
                    <ul style="margin-top: 0; line-height: 1.3em;">
                        <li>All errors raised during use of this tool will be reported via Sentry.io tool.</li>
                        <li style="margin-top: 0.5em;">These reports are anonymous so that it's not possible to track their origin.</li>
                        <li style="margin-top: 0.5em;">Please note that certain ad-blockers might prevent Sentry from working.</li>
                        <li style="margin-top: 0.5em;">If you want to contribute to this project I recommend disabling ad-blockers for this site.</li>
                    </ul>
                </div>
                <button class="ui green fluid button" style="margin-top: 1em;" data-op="accept">I understand & accept these terms</button>
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
    _createModal () {
        const release = MODULE_VERSION;
        const entries = CHANGELOG[release];

        let content = '';
        if (Array.isArray(entries)) {
            for (const entry of entries) {
                content += `
                    <li style="margin-top: 0.5em;">${entry}</li>
                `
            }
        } else if (entries) {
            for (const [ category, changes ] of Object.entries(entries)) {
                content += `<h4 class="ui header" style="color: orange; margin-left: -1em; margin-bottom: 0;">${category}</h4>`
                for (const entry of changes) {
                    content += `
                        <li style="margin-top: 0.5em;">${entry}</li>
                    `
                }
            }
        } else {
            content = '<p style="text-align: center; margin-top: 20%; margin-bottom: 20%;"><b>Changes are yet to be announced</b></p>'
        }

        return `
            <div class="ui tiny basic modal" style="background-color: #0b0c0c; padding: 1em; margin: -2em; border-radius: 0.5em;">
                <h2 class="ui centered header" style="padding-top: 0; padding-bottom: 0.5em;">Release <span style="color: orange;">${release}</span></h2>
                <div style="text-align: left; line-height: 1.3em; margin-left: -18px; max-height: 50vh; overflow-y: scroll;">
                    <ul>
                        ${content}
                    </ul>
                </div>
                <button class="ui black fluid button" style="margin-top: 2em;" data-op="accept">Continue</button>
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
            <div class="ui basic modal" style="text-align: center;">
                <img src="res/favicon.png" class="sftools-loader" width="100">
            </div>
        `;
    }

    toggle (open) {
        DialogController[open ? 'open' : 'close'](Loader);
    }
})();

// Non-blocking popup about an exception that occured
const WarningDialog = new (class extends Dialog {
    constructor () {
        super(0);
    }

    _createModal () {
        return `
            <div class="ui basic tiny modal" style="background-color: #0b0c0c; padding: 1em; margin: -2em; border-radius: 0.5em;">
                <h2 class="ui centered header" style="padding-bottom: 0.5em; padding-top: 0;"><i class="exclamation triangle icon" style="color: orange; font-size: 1em; line-height: 0.75em;"></i> An issue has occured!</h2>
                <div class="text-center" style="text-align: justify; margin-top: 1em; line-height: 1.3em; margin-bottom: 2em;" data-op="text">
                    ...
                </div>
                <button class="ui black fluid button" data-op="continue">Continue</button>
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
    _createModal () {
        return `
            <div class="ui basic tiny modal" style="background-color: #0b0c0c; padding: 1em; margin: -2em; border-radius: 0.5em;">
                <h2 class="ui centered header" style="padding-bottom: 0.5em; padding-top: 0;"><i class="times circle icon" style="color: red; font-size: 1em; line-height: 0.75em;"></i> A fatal error has occured!</h2>
                <div class="text-center" style="text-align: justify; margin-top: 1em; line-height: 1.3em; margin-bottom: 2em;" data-op="text">
                    ...
                </div>
                <div style="margin-top: 2em;">
                    <div class="text-center" style="text-align: justify; margin-top: 1em; line-height: 1.3em; margin-bottom: 2em;">
                        <h4 class="ui white header">This error might have also been caused by your current profile.<br>
                        Click the revert button below to revert back to default profile.</h4>
                    </div>
                </div>
                <div class="ui two buttons">
                    <button class="ui red fluid button" data-op="continue">Click here or refresh the page</button>
                    <button class="ui red fluid button" data-op="continue-default">Revert back to default profile</button>
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

    _createModal () {
        return `
            <div class="ui basic tiny modal" style="background-color: #ffffff; padding: 1em; margin: -2em; border-radius: 0.5em; border: 1px solid #0b0c0c;">
                <h2 class="ui header" style="color: black; padding-bottom: 0.5em; padding-top: 0; padding-left: 0;">Edit file</h2>
                <div class="ui form" style="margin-top: 1em; line-height: 1.3em; margin-bottom: 2em;">
                    <div class="field">
                        <label>Timestamp</label>
                        <input data-op="timestamp" type="text">
                    </div>
                </div>
                <div class="ui three fluid buttons">
                    <button class="ui black fluid button" data-op="cancel">Cancel</button>
                    <button class="ui fluid button" style="background-color: orange; color: black;" data-op="save">Save</button>
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
    _createModal () {
        return `
            <div class="ui basic mini modal" style="background-color: #ffffff; padding: 1em; margin: -2em; border-radius: 0.5em; border: 1px solid #0b0c0c;">
                <h2 class="ui header" style="color: black; padding-bottom: 0.5em; padding-top: 0; padding-left: 0;">Import template</h2>
                <div class="ui form" style="margin-top: 1em; line-height: 1.3em; margin-bottom: 2em;">
                    <div class="ui inverted active dimmer">
                      <div class="ui indeterminate text loader">Preparing Files</div>
                    </div>
                    <div class="two fields">
                        <div class="field">
                            <label>Author:</label>
                            <input data-op="author" type="text" disabled>
                        </div>
                        <div class="field">
                            <label>Created/Updated:</label>
                            <input data-op="date" type="text" disabled>
                        </div>
                    </div>
                    <div class="field">
                        <label>Name:</label>
                        <input data-op="name" type="text" placeholder="Template name">
                    </div>
                </div>
                <div data-op="error" style="display: none;">
                    <h3 class="ui header text-center" style="color: orange; margin-top: 4.25em; margin-bottom: 4.275em;">The requested template is not available!</h3>
                </div>
                <div class="ui three fluid buttons">
                    <button class="ui black fluid button disabled" data-op="cancel">Cancel</button>
                    <button class="ui fluid button disabled" style="background-color: orange; color: black;" data-op="save">Save</button>
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
        $.ajax({
            url: `https://sftools-api.herokuapp.com/scripts?key=${code.trim()}`,
            type: 'GET'
        }).done((message) => {
            if (message.success) {
                let { description, author, date } = message;

                this.data = message;
                this.$date.val(formatDate(new Date(date)));
                this.$name.val(description);
                this.$author.val(author);

                this.setReady();
            } else {
                this.setUnavailable();
            }
        }).fail(() => {
            this.setUnavailable();
        });
    }
})();

const EditFileTagDialog = new (class extends Dialog {
    constructor () {
        super(0);
    }

    _createModal () {
        return `
            <div class="ui basic mini modal" style="background-color: #ffffff; padding: 1em; margin: -2em; border-radius: 0.5em; border: 1px solid #0b0c0c;">
                <h2 class="ui header" style="color: black; padding-bottom: 0.5em; padding-top: 0; padding-left: 0;">Edit tags</h2>
                <div class="ui form" style="margin-top: 1em; line-height: 1.3em; margin-bottom: 2em;">
                    <div class="field">
                        <label>Current tags:</label>
                        <input data-op="old-tags" type="text" placeholder="None" disabled>
                    </div>
                    <div class="field">
                        <label>Replacement tag:</label>
                        <input data-op="new-tags" type="text" placeholder="None">
                    </div>
                </div>
                <div class="ui three fluid buttons">
                    <button class="ui black fluid button" data-op="cancel">Cancel</button>
                    <button class="ui fluid button" style="background-color: orange; color: black;" data-op="save">Save</button>
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
            this.$oldTags.val(tags.map(([key, count]) => `${key === 'undefined' ? 'None' : key} (${count})`).join(', '));
        }

        this.$newTags.val('');
    }
})();

const ProfileCreateDialog = new (class extends Dialog {

    constructor () {
        super(0);
    }

    _createModal () {
        return `
            <div class="ui small modal" style="background-color: #ffffff; padding: 1em; margin: -2em; border-radius: 0.5em; border: 1px solid #0b0c0c;">
                <h2 class="ui header" style="color: black; padding-bottom: 0.5em; padding-top: 0; padding-left: 0;">Create/Edit profile</h2>
                <div class="ui form" style="margin-top: 1em; line-height: 1.3em; margin-bottom: 2em;">
                    <div class="two fields">
                        <div class="four wide field">
                            <label>ID:</label>
                            <input class="text-center" data-op="id" type="text" disabled>
                        </div>
                        <div class="eight wide field">
                            <label>Name:</label>
                            <input data-op="name" type="text">
                        </div>
                        <div class="four wide field">
                            <label>Slot:</label>
                            <div class="ui fluid selection dropdown" data-op="slot">
                                <div class="text"></div>
                                <i class="dropdown icon"></i>
                            </div>
                        </div>
                    </div>
                    <h3 class="ui header" style="margin-bottom: 0.5em; margin-top: 0;">Primary filter configuration</h3>
                    <div class="two fields">
                        <div class="field">
                            <label>Index:</label>
                            <div class="ui fluid search selection dropdown" data-op="primary-index">
                                <div class="text"></div>
                                <i class="dropdown icon"></i>
                            </div>
                        </div>
                        <div class="field">
                            <label>Operation:</label>
                            <select class="ui fluid search selection dropdown" data-op="primary-operator">
                                <option value="equals">Equals</option>
                                <option value="above">Above</option>
                                <option value="below">Below</option>
                                <option value="between">Between</option>
                            </select>
                        </div>
                    </div>
                    <div class="two fields">
                        <div class="field">
                            <label>Value 1:</label>
                            <div class="ta-wrapper" style="height: initial;">
                                <input class="ta-area" data-op="primary" type="text" placeholder="Primary AST expression">
                                <div data-op="primary-content" class="ta-content" style="width: 100%; margin-top: -2em; margin-left: 1em;"></div>
                            </div>
                        </div>
                        <div class="field">
                            <label>Value 2:</label>
                            <div class="ta-wrapper" style="height: initial;">
                                <input class="ta-area" data-op="primary-2" type="text" placeholder="Primary AST expression (optional)">
                                <div data-op="primary-content-2" class="ta-content" style="width: 100%; margin-top: -2em; margin-left: 1em;"></div>
                            </div>
                        </div>
                    </div>
                    <h3 class="ui header" style="margin-bottom: 0.5em; margin-top: 0;">Secondary filter configuration</h3>
                    <div class="field">
                        <label>Secondary filter:</label>
                        <div class="ta-wrapper">
                            <input class="ta-area" data-op="secondary" type="text" placeholder="Secondary AST expression">
                            <div data-op="secondary-content" class="ta-content" style="width: 100%; margin-top: -2em; margin-left: 1em;"></div>
                        </div>
                    </div>
                    <h3 class="ui header" style="margin-bottom: 0.5em; margin-top: 0;">Primary group filter configuration</h3>
                    <div class="two fields">
                        <div class="field">
                            <label>Index:</label>
                            <div class="ui fluid search selection dropdown" data-op="primary-index-g">
                                <div class="text"></div>
                                <i class="dropdown icon"></i>
                            </div>
                        </div>
                        <div class="field">
                            <label>Operation:</label>
                            <select class="ui fluid search selection dropdown" data-op="primary-operator-g">
                                <option value="equals">Equals</option>
                                <option value="above">Above</option>
                                <option value="below">Below</option>
                                <option value="between">Between</option>
                            </select>
                        </div>
                    </div>
                    <div class="two fields">
                        <div class="field">
                            <label>Value 1:</label>
                            <div class="ta-wrapper" style="height: initial;">
                                <input class="ta-area" data-op="primary-g" type="text" placeholder="Primary AST expression">
                                <div data-op="primary-content-g" class="ta-content" style="width: 100%; margin-top: -2em; margin-left: 1em;"></div>
                            </div>
                        </div>
                        <div class="field">
                            <label>Value 2:</label>
                            <div class="ta-wrapper" style="height: initial;">
                                <input class="ta-area" data-op="primary-2-g" type="text" placeholder="Primary AST expression (optional)">
                                <div data-op="primary-content-2-g" class="ta-content" style="width: 100%; margin-top: -2em; margin-left: 1em;"></div>
                            </div>
                        </div>
                    </div>
                    <h3 class="ui header" style="margin-bottom: 0.5em; margin-top: 0;">Secondary group filter configuration</h3>
                    <div class="field">
                        <label>Secondary filter:</label>
                        <div class="ta-wrapper">
                            <input class="ta-area" data-op="secondary-g" type="text" placeholder="Secondary AST expression">
                            <div data-op="secondary-content-g" class="ta-content" style="width: 100%; margin-top: -2em; margin-left: 1em;"></div>
                        </div>
                    </div>
                </div>
                <div class="ui three fluid buttons">
                    <button class="ui black fluid button" data-op="cancel">Cancel</button>
                    <button class="ui fluid button" style="background-color: orange; color: black;" data-op="save">Save</button>
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
                    name: v.charAt(0).toUpperCase() + v.slice(1),
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
                    name: 'Default',
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
                    name: v.charAt(0).toUpperCase() + v.slice(1),
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
                name: this.$name.val() || `Profile ${this.id}`,
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
            this.$name.val(name || `Profile ${id}`);
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
    _createModal () {
        return `
            <div class="ui basic tiny modal" style="background-color: #ffffff; padding: 1em; margin: -2em; border-radius: 0.5em; border: 1px solid #0b0c0c;">
                <h2 class="ui header" style="color: black; padding-bottom: 0.5em; padding-top: 0; padding-left: 0;">Save template</h2>
                <div class="ui form" style="margin-top: 1em; line-height: 1.3em; margin-bottom: 2em;">
                    <div class="field">
                        <label>Select existing template:</label>
                        <div class="ui search selection compact dropdown" data-op="dropdown">
                            <div class="text"></div>
                            <i class="dropdown icon"></i>
                        </div>
                    </div>
                    <div class="field text-center"><label>or</label></div>
                    <div class="field">
                        <label>Create new template:</label>
                        <input type="text" placeholder="Template name" data-op="input">
                    </div>
                </div>
                <div class="ui two fluid buttons">
                    <button class="ui black fluid button" data-op="cancel">Cancel</button>
                    <button class="ui fluid button" style="background-color: orange; color: black;" data-op="save">Save</button>
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

        this.$input.val('');
        this.$dropdown.dropdown({
            values: Templates.getKeys().map(key => {
                return {
                    name: key,
                    value: key
                }
            })
        }).dropdown('setting', 'onChange', () => {
            this.$input.val('');
        }).dropdown('set selected', parentName || '');
    }
})();

const ConfirmDialog = new (class extends Dialog {
    _createModal () {
        return `
            <div class="ui basic tiny modal" style="background-color: #ffffff; padding: 1em; margin: -2em; border-radius: 0.5em; border: 1px solid #0b0c0c;">
                <h2 class="ui header" style="color: black; padding-bottom: 0.5em; padding-top: 0; padding-left: 0;" data-op="title"></h2>
                <div class="text-center" style="color: black; text-align: justify; margin-top: 1em; margin-bottom: 2em;" data-op="text">
                    ...
                </div>
                <div class="ui three fluid buttons">
                    <button class="ui black fluid button" data-op="cancel">Cancel</button>
                    <button class="ui fluid button" style="background-color: orange; color: black;" data-op="ok">Ok</button>
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
            this.$okButton.text(`Wait ${delayLeft} seconds ...`);
        } else {
            this.$okButton.removeClass('disabled');
            this.$okButton.text('Ok');
        }
    }

    _unblockButton () {
        this.$okButton.removeClass('disabled');
        this.$okButton.text('Ok');
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
    async _fetchTranslation (locale, noServer = false) {
        if (Site.locales().includes(locale)) {
            let file = await fetch(`${noServer ? 'https://sftools.mar21.eu' : ''}/js/lang/${locale}.json?v=${Site.localesVersion()}`);
            return await file.json();
        } else {
            return null;
        }
    }

    _registerObserver () {
        this.observer = new MutationObserver((mutations, observer) => {
            for (let { addedNodes } of mutations) {
                addedNodes.forEach(element => {
                    if (element.nodeType === 1) {
                        this.translate(element);
                    }
                });
            }
        });

        this.observer.observe(window.document, {
            subtree: true,
            childList: true
        });
    }

    async translatePage () {
        let locale = Site.getLocale();

        this.translation = await this._fetchTranslation(
            locale,
            window.document.location.protocol === 'file:'
        )

        this.translate();
        this._registerObserver();
    }

    findTranslation (key) {
        let pth = key.split('.');
        let obj = this.translation;

        for (let i = 0; obj && i < pth.length; i++) {
            obj = obj[pth[i]];
        }

        return obj;
    }

    translate (node = window.document) {
        if (node.querySelector('[data-intl]')) {
            node.querySelectorAll('[data-intl]').forEach(element => this.translateElement(element));
        }
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
})();

window.intl = Localization.findTranslation.bind(Localization);

// Automatically open Terms and Conditions if not accepted yet
window.addEventListener('load', async function () {
    await Localization.translatePage();

    if (PreferencesHandler._isAccessible()) {
        if (!SiteOptions.terms_accepted) {
            DialogController.open(TermsAndConditionsDialog);
        }

        if (SiteOptions.version_accepted != MODULE_VERSION) {
            DialogController.open(ChangeLogDialog);
        }
    }

    Site.run();
});
