class Dialog {
    constructor (options) {
        this.options = Object.assign({
            opacity: 0.85,
            dismissable: false,
            key: '',
            containerClass: '',
            containerStyle: ''
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
                    const $container = $(`<div class="dialog container ${this.options.containerClass}" style="display: none; background: rgba(0, 0, 0, ${this.options.opacity}); ${this.options.containerStyle}"></div>`);

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

class Toast {
    static info (title, message, requireClick) {
        this.#show(null, title, message, requireClick);
    }

    static warn (title, message, requireClick) {
        this.#show('orange exclamation triangle', title, message, requireClick);
    }

    static error (title, message, requireClick) {
        this.#show('red exclamation circle', title, message, requireClick);
    }

    static #show (icon, title, message, requireClick) {
        $.toast({
            title: icon ? `<i class="ui ${icon} icon"></i> ${title}` : title,
            message,
            position: 'bottom left',
            displayTime: requireClick ? 0 : 6000,
            class: 'custom-toast'
        })
    }
}

class DialogController {
    static #promise = Promise.resolve();

    static open (popup, ...args) {
        popup.requestOpen();
        return (this.#promise = this.#promise.then(() => popup.open(...args)));
    }

    static close (popup) {
        popup.close();
    }
}

const TermsAndConditionsDialog = new (class extends Dialog {
    intl (heading, clause = null) {
        if (clause === null) {
            return intl(`terms.general.heading${heading}.title`);
        } else {
            return intl(`terms.general.heading${heading}.clause${clause}`);
        }
    }

    _createModal () {
        return `
            <div class="small inverted dialog">
                <div class="header"><u>${intl('terms.title')}</u></div>
                <div class="overflow-y-scroll" style="max-height: 65vh;">
                    <h4 class="text-center text-orange">§1 ${this.intl(0)}</h4>
                    <ul>
                        <li>${this.intl(0, 0)}</li>
                        <li class="mt-2">${this.intl(0, 1)}</li>
                        <li class="mt-2">${this.intl(0, 2)}</li>
                        <li class="mt-2">${this.intl(0, 3)}</li>
                        <li class="mt-2">${this.intl(0, 4)}</li>
                        <li class="mt-2">${this.intl(0, 5)}</li>
                    </ul>
                    <h4 class="text-center text-orange">§2 ${this.intl(1)}</h4>
                    <ul>
                        <li>${this.intl(1, 0)}</li>
                        <li class="mt-2">${this.intl(1, 1)}</li>
                        <li class="mt-2">${this.intl(1, 2)}</li>
                    </ul>
                    <h4 class="text-center text-orange">§3 ${this.intl(2)}</h4>
                    <ul>
                        <li>${this.intl(2, 0)}</li>
                        <li class="mt-2">${this.intl(2, 1)}</li>
                    </ul>
                    <h4 class="text-center text-orange">§4 ${this.intl(3)}</h4>
                    <ul>
                        <li>${this.intl(3, 0)}</li>
                        <li class="mt-2">${this.intl(3, 1)}</li>
                        <li class="mt-2">${this.intl(3, 2)}</li>
                        <li class="mt-2">${this.intl(3, 3)}</li>
                    </ul>
                </div>
                <button class="ui green fluid button" data-op="accept">${intl('terms.button.accept_full')}</button>
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

const SimulatorShopDialog = new (class extends Dialog {
    _createModal () {
        const packs = [
            {
                icon: 'white wallet',
                title: 'Saver Pack',
                items: ['1 simulation', '1 character scan'],
                value: 1
            },
            {
                icon: 'blue fish',
                title: 'Starter Pack',
                items: ['10 simulations', '2 character scans'],
                value: 5
            },
            {
                icon: 'green frog',
                title: 'F2P Pack',
                items: ['100 simulations', '10 character scans'],
                value: 10
            },
            {
                icon: 'brown horse',
                title: 'Casual Pack',
                items: ['1000 simulations', '25 character scans'],
                value: 25
            },
            {
                icon: 'red dragon',
                title: 'Dragon Pack for big spenders',
                items: ['10000 simulations', '100 character scans'],
                value: 99
            },
            {
                icon: 'yellow hat wizard',
                title: 'Shakes\'s Dream Pack',
                items: ['Unlimited simulations', '1000 character scans'],
                value: 149
            }
        ]

        let content = '';
        for (const { icon, title, items, value } of packs) {
            content += `
                <div data-op="close" class="!border-radius-1 border-gray p-4 background-dark:hover cursor-pointer flex gap-4 items-center">
                    <i class="ui big ${icon} icon"></i>
                    <div>    
                        <div>${title}</div>
                        <div class="text-gray">${items.join(', ')}</div>
                    </div>
                    <div class="ml-auto">${value} €</div>
                </div>
            `
        }

        return `
            <div class="inverted small bordered dialog">
                <div class="header">SFTools Shop</div>
                <div class="text-center">Oops, it looks like you ran out of your free simulations. To continue please purchase a simulation pack below:</div>
                <div class="flex flex-col gap-2">
                    ${content}
                </div>
            </div>
        `
    }

    _createBindings () {
        const $close = this.$parent.operator('close');
        $close.click(() => {
            this.close();
        })
    }
})

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
            for (const category of Object.keys(entries)) {
                content += `<h4 class="text-orange text-center">${category}</h4><ul>`
                for (const entry of entries[category]) {
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

class Localization {
    static #LOCALES = {
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
    }

    static generateTranslation (base, object, ... path) {
        for (const key of Object.keys(object)) {
            if (typeof object[key] === 'object') {
                this.generateTranslation(base, object[key], ... path, key);
            } else {
                base[`${path.join('.')}.${key}`] = object[key];
            }
        }

        return base;
    }

    static async #fetchTranslation (locale) {
        if (Object.keys(this.#LOCALES).includes(locale)) {
            let start = Date.now();

            let file = await fetch(this.#translationUrl(locale));
            let data = await file.json();

            Logger.log('APPINFO', `Translation ready in ${Date.now() - start} ms`);

            return this.generateTranslation({}, data);
        } else {
            return {};
        }
    }

    static #translationUrl (locale) {
        const useRemote = window.document.location.protocol === 'file:';
        return `${useRemote ? 'https://sftools.mar21.eu' : ''}/js/lang/${locale}.json`;
    }

    static async translatePage () {
        const locale = this.#getLocale();

        const $picker = $(`<div class="locale-picker"></div>`);
        const $dropdown = $(`<div class="ui dropdown"><img src="res/flags/${locale}.svg"></div>`).dropdown({
            transition: 'none',
            values: Object.entries(this.#LOCALES).map(([value, name]) => ({ name: `<div data-inverted="" data-tooltip="${name}" data-position="left center"><img src="res/flags/${value}.svg"></div>`, value })),
            action: (text, value, element) => this.#setLocale(value)
        });

        $picker.append($dropdown);

        $('.ui.huge.menu').append($picker);

        this.translation = await this.#fetchTranslation(locale);

        window.document.querySelectorAll('[data-intl]').forEach(element => this.#translateElement(element));
        window.document.querySelectorAll('[data-intl-tooltip]').forEach(element => this.#translateTooltip(element));
        window.document.querySelectorAll('[data-intl-placeholder]').forEach(element => this.#translatePlaceholder(element));
        window.document.querySelectorAll('[data-intl-title]').forEach(element => this.#translateTitle(element));
    }

    static hasTranslation (key) {
        return key in this.translation;
    }

    static #findTranslation (key) {
        let obj = this.translation[key];
        if (!obj) {
            Logger.log('IN_WARN', `Translation key ${key} not found!`);
        }

        return obj;
    }

    static #translatePlaceholder (node) {
        let key = node.getAttribute('data-intl-placeholder');
        let val = this.#findTranslation(key);

        node.removeAttribute('data-intl-placeholder');
        node.setAttribute('placeholder', this.#sanitize(val || key));
    }

    static #translateTooltip (node) {
        let key = node.getAttribute('data-intl-tooltip');
        let val = this.#findTranslation(key);

        node.removeAttribute('data-intl-tooltip');
        node.setAttribute('data-tooltip', this.#sanitize(val || key));
    }

    static #translateTitle (node) {
        let key = node.getAttribute('data-intl-title');
        let val = this.#findTranslation(key);

        node.removeAttribute('data-intl-title');
        node.setAttribute('title', this.#sanitize(val || key));
    }

    static #translateElement (node) {
        let key = node.getAttribute('data-intl');
        let val = this.#findTranslation(key);

        node.removeAttribute('data-intl');

        if (val && key.endsWith('#')) {
            node.innerHTML = val;
        } else {
            node.innerText = val || key;
        }
    }

    static #getLocale () {
        return SiteOptions.locale || 'en';
    }

    static #setLocale (locale) {
        SiteOptions.locale = locale;

        window.location.href = window.location.href;
    }

    static #sanitize (val) {
        return val.replace(/"/g, '&quot;');
    }

    static intl (key, variables = undefined) {
        let val = this.#findTranslation(key);
        if (val) {
            if (typeof variables !== 'undefined') {
                for (const [key, vrl] of Object.entries(variables)) {
                    val = val.replace(`#{${key}}`, vrl);
                }
            }
    
            return this.#sanitize(val);
        } else {
            return key;
        }
    }
};

window.intl = Localization.intl.bind(Localization);

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

        if (Site.is('simulator')) {
            if (Site.isEvent('april_fools_day')) {
                DialogController.open(SimulatorShopDialog);
            }
        }
    }

    Site.run();
});
