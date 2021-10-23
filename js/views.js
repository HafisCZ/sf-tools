class FloatingPopup {
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
                        <div style="display: none; z-index: 999; position: fixed; width: 100vw; height: 100vh; left: 0; top: 0; display: flex; align-items: center; justify-content: center; background: rgba(0, 0, 0, ${this.opacity})">
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

    close () {
        this.shouldOpen = false;
        if (this._hasParent() && this.resolve) {
            this.$parent.hide();
            this.resolve();
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

const PopupController = new (class {
    constructor () {
        this.queue = [];
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

const TermsAndConditionsPopup = new (class extends FloatingPopup {
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

const ChangeLogPopup = new (class extends FloatingPopup {
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

const PendingMigrationPopup = new (class extends FloatingPopup {
    _createModal () {
        return `
            <div class="ui basic mini modal" style="background-color: #0b0c0c; padding: 1em; margin: -2em; border-radius: 0.5em;">
                <h2 class="ui centered header" style="padding-bottom: 0.5em; padding-top: 0;">Migrate your data over to <span style="color: orange;">SFTools V5</span></h2>
                <div style="text-align: justify; margin-top: 1em; line-height: 1.3em;">
                    A migration is needed in order for you to be able to use your previously stored data.
                </div>
                <div style="text-align: justify; margin-top: 1em; line-height: 1.3em;">
                    If you want to attempt the migration without possibly causing any permanent damage, press the Try button. After you verify that everything is in order you can relaunch the tool and press Continue.
                </div>
                <div style="text-align: justify; margin-top: 1em; line-height: 1.3em;">
                    To proceed with the migration fully, click Continue button. Be aware that this is a destructive operation and after the migration finishes you won't be able to use your data with the previous versions of this tool.
                </div>
                <div style="text-align: justify; margin-top: 1em; line-height: 1.3em; margin-bottom: 2em;">
                    If the migration fails, please reload the site and click the Skip button. You will gain access to the site and your data won't be affected. You will need to wait until the issue is resolved or contact the support at support@mar21.eu.
                </div>
                <div class="ui three fluid buttons">
                    <button class="ui black fluid button" data-op="skip">Skip</button>
                    <button class="ui orange fluid button" data-op="try">Try</button>
                    <button class="ui red fluid button" data-op="accept">Continue</button>
                </div>
            </div>
        `;
    }

    _createBindings () {
        this.$parent.find('[data-op="try"]').click(() => {
            SiteOptions.migration_allowed = true;
            SiteOptions.migration_accepted = false;
            this.close();
        });

        this.$parent.find('[data-op="accept"]').click(() => {
            SiteOptions.migration_allowed = true;
            SiteOptions.migration_accepted = true;
            this.close();
        });

        this.$parent.find('[data-op="skip"]').click(() => {
            SiteOptions.migration_allowed = false;
            SiteOptions.migration_accepted = false;
            this.close();
        });
    }
})();

const LoaderPopup = new (class extends FloatingPopup {
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
})();

// Non-blocking popup about an exception that occured
const WarningPopup = new (class extends FloatingPopup {
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
const ErrorPopup = new (class extends FloatingPopup {
    _createModal () {
        return `
            <div class="ui basic tiny modal" style="background-color: #0b0c0c; padding: 1em; margin: -2em; border-radius: 0.5em;">
                <h2 class="ui centered header" style="padding-bottom: 0.5em; padding-top: 0;"><i class="times circle icon" style="color: red; font-size: 1em; line-height: 0.75em;"></i> A fatal error has occured!</h2>
                <div class="text-center" style="text-align: justify; margin-top: 1em; line-height: 1.3em; margin-bottom: 2em;" data-op="text">
                    ...
                </div>
                <button class="ui red fluid button" data-op="continue">Click here or refresh the page</button>
            </div>
        `;
    }

    _createBindings () {
        this.$text = this.$parent.find('[data-op="text"]');
        this.$parent.find('[data-op="continue"]').click(() => {
            window.location.href = window.location.href;
        });
    }

    _applyArguments (error) {
        this.$text.html(error instanceof Error ? error.message : error);
    }
})();

// Automatically open Terms and Conditions if not accepted yet
window.addEventListener('load', function() {
    if (PreferencesHandler._isAccessible()) {
        if (!SiteOptions.terms_accepted) {
            PopupController.open(TermsAndConditionsPopup);
        }

        if (SiteOptions.version_accepted != MODULE_VERSION) {
            PopupController.open(ChangeLogPopup);
        }
    }
});
