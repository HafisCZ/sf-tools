class Loader {
    static #wrapper = null;

    static #create () {
        this.#wrapper = document.createElement('div')
        this.#wrapper.setAttribute('data-dialog-name', 'loader');
        this.#wrapper.setAttribute('class', 'dialog container');
        this.#wrapper.setAttribute('style', 'background: rgba(0, 0, 0, 0);');
        this.#wrapper.innerHTML = `
            <div class="basic dialog">
                <div class="flex flex-col gap-8 items-center">
                    <img src="res/favicon.png" class="loader" width="100">
                    <div class="ui active tiny progress" data-percent="0" style="width: 200px;">
                        <div class="bar" style="background: #888 !important;"></div>
                    </div>
                </div>
            </div>
        `

        document.body.append(this.#wrapper);

        this.$progress = $(this.#wrapper).find('.progress');
    }

    static progress (percent) {
        this.$progress.progress({ percent: Math.trunc(100 * percent) });
    }

    static toggle (open, options = null) {
        if (this.#wrapper === null) this.#create();
        if (open) {
            if (options && options.progress) {
                this.$progress.show();
                this.$progress.progress({ percent: 0 });
            } else {
                this.$progress.hide();
            }

            this.#wrapper.style.display = '';
        } else {
            this.#wrapper.style.display = 'none';
        }
    }
}

class Dialog {
    static DEFAULT_OPTIONS = {
        opacity: 0.85,
        dismissable: false,
        key: '',
        containerClass: '',
        containerStyle: '',
        draggable: false
    }

    static #promise = Promise.resolve();

    static async open (klass, ...params) {
        const dialog = new klass(klass.OPTIONS || Dialog.DEFAULT_OPTIONS);

        return (this.#promise = this.#promise.then(() => dialog.open(params)));
    }

    constructor (options) {
        this.options = Object.assign({}, Dialog.DEFAULT_OPTIONS, options);
    }

    open (params) {
        return new Promise((resolve) => {
            this.wrapper = document.createElement('div')
            this.wrapper.setAttribute('data-dialog-name', this.options.key);
            this.wrapper.setAttribute('class', `dialog container ${this.options.containerClass}`);
            this.wrapper.setAttribute('style', `background: rgba(0, 0, 0, ${this.options.opacity}); ${this.options.containerStyle}`);

            this.wrapper.innerHTML = this.render(...params);

            document.body.append(this.wrapper);

            const dialog = this.wrapper.querySelector('.dialog.container > .dialog');

            this.close = (...values) => {
                this.hide();

                resolve(values);
            }

            this.replace = (replaceParams, thenMethod = null) => {
                const [klass, ...params2] = replaceParams;

                this.hide();

                const dialog = new klass(klass.OPTIONS || Dialog.DEFAULT_OPTIONS);

                let promise = dialog.open(params2)
                if (thenMethod) {
                    promise = promise.then(thenMethod);
                }

                promise.then((values) => resolve(values));
            }

            this.hide = () => {
                this.wrapper.remove();
            }

            this.$parent = $(dialog);

            this.handle(...params);

            if (this.options.draggable) {
                this.#setDraggable(this.wrapper);
            }

            if (this.options.dismissable) {
                this.wrapper.addEventListener('click', (event) => {
                    if (event.target.classList.contains('container')) {
                        this.close(false)
                    }
                })
            }
        })
    }

    intl (key, args = {}) {
        return intl(`dialog.${this.options.key}.${key}`, args);
    }

    #setDraggable (element) {
        let pos1 = 0;
        let pos2 = 0;
        let pos3 = 0;
        let pos4 = 0;

        const dialog = element.querySelector('.dialog.container > .dialog');
        const handle = element.querySelector('.dialog.container > .dialog > .header');

        function dragMouseDown(e) {
            e = e || window.event;
            e.preventDefault();

            pos3 = e.clientX;
            pos4 = e.clientY;

            dialog.classList.add('dragging');

            document.onmouseup = closeDragElement;
            document.onmousemove = elementDrag;
        }
        
        function elementDrag(e) {
            e = e || window.event;
            e.preventDefault();

            pos1 = pos3 - e.clientX;
            pos2 = pos4 - e.clientY;
            pos3 = e.clientX;
            pos4 = e.clientY;

            const newY = (dialog.offsetTop - pos2);
            const newX = (dialog.offsetLeft - pos1);

            dialog.style.position = 'absolute';
            dialog.style.left = `${newX}px`;
            dialog.style.top = `${newY}px`;
        }
    
        function closeDragElement() {
            document.onmouseup = null;
            document.onmousemove = null;

            dialog.classList.remove('dragging');
        }

        handle.onmousedown = dragMouseDown;

        dialog.classList.add('draggable');
    }

    handle () {
        throw 'not implemented'
    }

    render () {
        throw 'not implemented'
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

class ReportDialog extends Dialog {
    static OPTIONS = {
        key: 'report'
    }

    render () {
        return `
            <div class="small bordered inverted dialog">
                <div class="header">${this.intl('title')}</div>
                <div class="ui inverted form">
                    <div class="field">
                        <label>${this.intl('field.tool')}</label>
                        <div class="ui selection inverted dropdown" data-op="field-tool">
                            <div class="text"></div>
                            <i class="dropdown icon"></i>
                        </div>
                    </div>
                    <div class="field">
                        <label>${this.intl('field.type')}</label>
                        <div class="ui selection inverted dropdown" data-op="field-type">
                            <div class="text"></div>
                            <i class="dropdown icon"></i>
                        </div>
                    </div>
                    <div class="field">
                        <label>${this.intl('field.email')}</label>
                        <div class="ui inverted input" data-op="field-email">
                            <input type="email" maxlength="50" placeholder="${this.intl('field.email')}">
                        </div>
                    </div>
                    <div class="field">
                        <label>${this.intl('field.description')}</label>
                        <div class="ui inverted input" data-op="field-description">
                            <textarea rows="7" maxlength="1000" style="resize: none;" placeholder="${this.intl('field.description')}"></textarea>
                        </div>
                    </div>
                </div>
                <div class="ui two fluid buttons">
                    <button class="ui black button" data-op="cancel">${intl('dialog.shared.cancel')}</button>
                    <button class="ui button !text-black !background-orange" data-op="submit">${intl('dialog.shared.submit')}</button>
                </div>
            </div>
        `;
    }

    handle (tool = 'general') {
        this.$submit = this.$parent.find('[data-op="submit"]');
        this.$submit.click(() => {
            const tool = this.$fieldTool.dropdown('get value');
            const type = this.$fieldType.dropdown('get value');
            const email = this.$fieldEmail.val();
            const description = this.$fieldDescription.val();

            if (this.$submit.hasClass('disabled')) {
                return;
            }

            Loader.toggle(true);

            SiteAPI.post('feedback', { tool, type, email, description }).then(() => {
                this.close(true);

                Toast.info(
                    this.intl('toast.success.title'),
                    this.intl('toast.success.message')
                )
            }).catch(() => {
                Toast.error(
                    this.intl('toast.error.title'),
                    this.intl('toast.error.message')
                )
            }).finally(() => {
                Loader.toggle(false);
            })
        });

        this.$cancel = this.$parent.find('[data-op="cancel"]');
        this.$cancel.click(() => {
            this.close(false);
        });

        this.$fieldTool = this.$parent.find('[data-op="field-tool"]');
        this.$fieldType = this.$parent.find('[data-op="field-type"]');
        this.$fieldEmail = this.$parent.find('[data-op="field-email"] > input');
        this.$fieldDescription = this.$parent.find('[data-op="field-description"] > textarea');

        const updateFields = () => {
            const tool = this.$fieldTool.dropdown('get value');
            const type = this.$fieldType.dropdown('get value');
            // const email = this.$fieldEmail.val();
            const description = this.$fieldDescription.val();
    
            if (tool && type && description) {
                this.$submit.removeClass('disabled');
            } else {
                this.$submit.addClass('disabled');
            }
        }

        this.$fieldTool.dropdown({
            values: [
                {
                    value: 'general',
                    name: '-'
                },
                ...['analyzer', 'attributes', 'blacksmith', 'calendar', 'dungeons', 'fortress', 'guilds', 'hellevator', 'hydra', 'idle', 'inventory', 'pets', 'simulator', 'stats', 'underworld'].map((value) => ({
                    value,
                    name: intl(`index.${value}.title`)
                }))
            ],
            onChange: () => updateFields()
        }).dropdown('set selected', tool);

        this.$fieldType.dropdown({
            values: ['issue', 'suggestion'].map((value) => ({
                value,
                name: this.intl(`type.${value}`)
            })),
            onChange: () => updateFields()
        }).dropdown('set selected', 'issue');

        this.$fieldEmail.on('change input', () => updateFields());
        this.$fieldDescription.on('change input', () => updateFields());
    }
}

class TermsAndConditionsDialog extends Dialog {
    static OPTIONS = {
        key: 'terms_and_conditions'
    }
    
    static VERSION = 2;

    render () {
        return `
            <div class="small inverted dialog">
                <div class="header"><u>${intl('terms.title')}</u></div>
                <div class="overflow-y-scroll pr-2" style="max-height: 65vh; line-height: 1.5em;">
                    <h4 class="text-center text-orange">§1 General use</h4>
                    <ul>
                        <li>It is advised to never share HAR files as they <b>might</b> contain private data such as IP address and cookies.</li>
                        <li class="mt-2">The site is distributed <b>AS IS</b> without any warranties. You are fully responsible for use of this site.</li>
                        <li class="mt-2">You're free to share, copy and modify the site, but you are not allowed to distribute it or any of it's parts without explicit approval.</li>
                        <li class="mt-2">You agree to limit data collection from the game to reasonable amounts.</li>
                        <li class="mt-2">You agree to follow the Shakes & Fidget <a href="https://cdn.playa-games.com/res/sfgame3/legal/html/terms_en.html" target="_blank">Terms and Conditions</a></li>
                        <li class="mt-2">You are not allowed to automate any part of this tool.</li>
                    </ul>
                    <h4 class="text-center text-orange">§2 Endpoint</h4>
                    <ul>
                        <li>Endpoint is a Unity application bundled with the tool that allows you to log into the game and collect limited data about yourself, your guild members and your friends without the lengthy process of creating a HAR file.</li>
                        <li class="mt-2">It is not possible to capture any other players than those listed above.</li>
                        <li class="mt-2">Everything happens locally in a identical way to playing the game through browser.</li>
                    </ul>
                    <h4 class="text-center text-orange">§3 File sharing and script publishing</h4>
                    <ul>
                        <li>All data shared via the above functions is not protected in any other way other than the share key.</li>
                        <li class="mt-2">Shared content might be deleted at any point of time, additionally shared files may be used only up to full 2 days.</li>
                    </ul>
                    <h4 class="text-center text-orange">§4 Sentry</h4>
                    <ul>
                        <li>All errors raised during use of this tool will be reported to the developer via Sentry.io tool.</li>
                        <li class="mt-2">These reports are anonymous so that it is not possible to track their origin.</li>
                        <li class="mt-2">Please note that certain ad blockers might prevent Sentry from working.</li>
                        <li class="mt-2">If you want to contribute to this project it is recommend keeping ad blockers disabled for this site.</li>
                    </ul>
                </div>
                <button class="ui green fluid button" data-op="accept">${intl('terms.button.accept_full')}</button>
            </div>
        `;
    }

    handle () {
        this.$parent.find('[data-op="accept"]').click(() => {
            Site.options.terms_accepted = TermsAndConditionsDialog.VERSION;

            this.close(true);
        });
    }
}

class SimulatorShopDialog extends Dialog {
    static OPTIONS = {
        key: 'simulator_shop'
    }

    render () {
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

    handle () {
        this.$parent.find('[data-op="close"]').click(() => {
            this.close(false)
        })
    }
}

class AnnouncementDialog extends Dialog {
    static OPTIONS = {
        key: 'announcement'
    }

    render () {
        return `
            <div class="small bordered inverted dialog">
                <div class="header text-orange" data-op="title"></div>
                <div class="text-center mb-4 mt-4" data-op="content" style="max-height: 50vh; line-height: 1.5em;"></div>
                <button class="ui black fluid button" data-op="accept">${intl('dialog.shared.continue')}</button>
            </div>
        `;
    }

    handle () {
        const $title = this.$parent.find('[data-op="title"]');
        const $content = this.$parent.find('[data-op="content"]');

        // Find announcement that was not viewed before and can be viewed on this page
        const { title, content, id } = ANNOUNCEMENTS.find((announcement) => !announcement.disabled && !Site.options.announcements_viewed.includes(announcement.id) && (!announcement.for || announcement.for.some((page) => Site.is(page))))

        this.$parent.find('[data-op="accept"]').click(() => {
            Site.options.announcements_viewed = [...Site.options.announcements_viewed, id];

            // Show next possible announcement, or hide dialog
            if (ANNOUNCEMENTS.some((announcement) => !announcement.disabled && !Site.options.announcements_viewed.includes(announcement.id) && (!announcement.for || announcement.for.some((page) => Site.is(page))))) {
                this.replace(
                    [
                        AnnouncementDialog
                    ]
                );
            } else {
                this.close(true);
            }
        });

        $title.html(title);
        $content.html(content);
    }
}

class ChangelogDialog extends Dialog {
    static OPTIONS = {
        key: 'changelog'
    }

    render () {
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

    handle () {
        this.$parent.find('[data-op="accept"]').click(() => {
            Site.options.version_accepted = MODULE_VERSION;

            this.close(true);
        });
    }
}

// Non-blocking popup about an exception that occured
class WarningDialog extends Dialog {
    static OPTIONS = {
        key: 'warning',
        opacity: 0
    }

    render () {
        return `
            <div class="small inverted dialog">
                <div class="header"><i class="ui text-orange exclamation triangle icon"></i> ${this.intl('title')}</div>
                <div class="text-center" data-op="text">...</div>
                <button class="ui black fluid button" data-op="continue">${this.intl('continue')}</button>
            </div>
        `;
    }

    handle (error) {
        this.$parent.find('[data-op="continue"]').click(() => {
            this.close(true);
        });

        this.$parent.find('[data-op="text"]').text(error instanceof Error ? error.message : error);
    }
}

// Blocking popup about an exception that occured and is blocking execution
class ErrorDialog extends Dialog {
    static OPTIONS = {
        key: 'error'
    }

    render () {
        return `
            <div class="small inverted bordered dialog">
                <div class="header"><i class="ui text-red times circle icon"></i> ${this.intl('title')}</div>
                <div class="text-center" data-op="text"></div>
                <h4 class="text-center">${this.intl('notice#')}</h4>
                <div class="ui three red fluid buttons">
                    <button class="ui button" data-op="continue">${this.intl('refresh')}</button>
                    <button class="ui button" data-op="continue-default">${this.intl('revert')}</button>
                    <button class="ui button" data-op="continue-temporary">${this.intl('temporary')}</button>
                </div>
            </div>
        `;
    }

    handle (error) {
        this.$parent.find('[data-op="continue"]').click(() => {
            window.location.href = window.location.href;
        });

        this.$parent.find('[data-op="continue-temporary"]').click(() => {
            window.location.href = `/stats.html?temp`;
        });

        this.$parent.find('[data-op="continue-default"]').click(() => {
            ProfileManager.setActiveProfile('default');

            window.location.href = window.location.href;
        });

        this.$parent.find('[data-op="text"]').html(error instanceof Error ? error.message : error);
    }
}

class ConfirmationDialog extends Dialog {
    static OPTIONS = {
        key: 'confirm'
    }

    render () {
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

    #closeTimer () {
        if (this.delayTimer) {
            clearInterval(this.delayTimer);
            this.delayTimer = null;
        }
    }

    #updateButton (delayLeft) {
        if (delayLeft > 0) {
            this.$okButton.addClass('disabled');
            this.$okButton.text(this.intl('wait_n_seconds').replace('%1', delayLeft));
        } else {
            this.$okButton.removeClass('disabled');
            this.$okButton.text(this.intl('ok'));
        }
    }

    handle (title, text, darkBackground = false, delay = 0) {
        this.$cancelButton = this.$parent.find('[data-op="cancel"]');
        this.$okButton = this.$parent.find('[data-op="ok"]');

        this.$title = this.$parent.find('[data-op="title"]');
        this.$text = this.$parent.find('[data-op="text"]');

        this.$cancelButton.click(() => {
            this.#closeTimer();
            this.close(false);
        });

        this.$okButton.click(() => {
            this.#closeTimer();
            this.close(true);
        });

        this.$title.html(title);
        this.$text.html(text);

        this.$parent.css('background', `rgba(0, 0, 0, ${darkBackground ? 0.85 : 0})`);

        this.#updateButton(delay);
        if (delay > 0) {
            this.delayTimer = setInterval(() => {
                if (--delay <= 0) {
                    this.#closeTimer();
                }

                this.#updateButton(delay);
            }, 1000);
        }
    }
}

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
        'ch': 'Schwyzerdüütsch'
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

    static async #fetchTranslation (locale, path, translationPath = []) {
        if (Object.keys(this.#LOCALES).includes(locale)) {
            const start = Date.now();

            const file = await fetch(this.#translationUrl(locale, path));
            const data = await file.json();

            Logger.log('APPINFO', `Translation (locale: ${locale}, ${path}) ready in ${Date.now() - start} ms`);

            return this.generateTranslation({}, data, ...translationPath);
        } else {
            return {};
        }
    }

    static #translationUrl (locale, path) {
        const useRemote = window.document.location.protocol === 'file:';

        return `${useRemote ? 'https://sftools.mar21.eu' : ''}${path.replace('{{locale}}', locale)}`;
    }

    static async translatePage (injections) {
        const locale = this.#getLocale();

        const $picker = $(`<div class="locale-picker"></div>`);
        const $dropdown = $(`<div class="ui dropdown"><img src="res/flags/${locale}.svg"></div>`).dropdown({
            transition: 'none',
            values: Object.entries(this.#LOCALES).map(([value, name]) => ({ name: `<div data-inverted="" data-tooltip="${name}" data-position="left center"><img src="res/flags/${value}.svg"></div>`, value })),
            action: (text, value, element) => this.#setLocale(value)
        });

        $picker.append($dropdown);

        $('.ui.huge.menu').append($picker);

        this.translation = await this.#fetchTranslation(locale, '/js/lang/{{locale}}.json');

        for (const [path, translationPath] of injections) {
            Object.assign(this.translation, await this.#fetchTranslation(locale, path, translationPath));
        }

        window.document.querySelectorAll('[data-intl]').forEach(element => this.#translateElement(element));
        window.document.querySelectorAll('[data-intl-tooltip]').forEach(element => this.#translateTooltip(element));
        window.document.querySelectorAll('[data-intl-placeholder]').forEach(element => this.#translatePlaceholder(element));
        window.document.querySelectorAll('[data-intl-title]').forEach(element => this.#translateTitle(element));
    }

    static hasTranslation (key) {
        return key in this.translation;
    }

    static #findTranslation (key) {
        const obj = this.translation[key];
        if (!obj) {
            Logger.log('IN_WARN', `Translation key ${key} not found!`);
        }

        return obj;
    }

    static #translatePlaceholder (node) {
        const key = node.getAttribute('data-intl-placeholder');
        const val = this.#findTranslation(key);

        node.removeAttribute('data-intl-placeholder');
        node.setAttribute('placeholder', this.#sanitize(val || key));
    }

    static #translateTooltip (node) {
        const key = node.getAttribute('data-intl-tooltip');
        const val = this.#findTranslation(key);

        node.removeAttribute('data-intl-tooltip');
        node.setAttribute('data-tooltip', this.#sanitize(val || key));
    }

    static #translateTitle (node) {
        const key = node.getAttribute('data-intl-title');
        const val = this.#findTranslation(key);

        node.removeAttribute('data-intl-title');
        node.setAttribute('title', this.#sanitize(val || key));
    }

    static #translateElement (node) {
        const key = node.getAttribute('data-intl');
        const val = this.#findTranslation(key);

        node.removeAttribute('data-intl');

        if (val && key.endsWith('#')) {
            node.innerHTML = val;
        } else {
            node.innerText = val || key;
        }
    }

    static #getLocale () {
        return Site.options.locale || 'en';
    }

    static #setLocale (locale) {
        Site.options.locale = locale;

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
                    val = val.replace(`#{${key}}`, String(vrl).replace(/\$/g, '$$$$'));
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
    const injections = []

    if (Site.requires('translations_general')) injections.push(['/js/playa/lang/{{locale}}/general.json', ['general']])
    if (Site.requires('translations_monsters')) injections.push(['/js/playa/lang/{{locale}}/monsters.json', ['monsters']])
    if (Site.requires('translations_items')) injections.push(['/js/playa/lang/{{locale}}/items.json', ['items']])

    await Localization.translatePage(injections);

    if (StoreWrapper.isAvailable()) {
        if (Site.options.terms_accepted !== TermsAndConditionsDialog.VERSION) {
            Dialog.open(TermsAndConditionsDialog);
        }

        if (Site.options.version_accepted != MODULE_VERSION) {
            Dialog.open(ChangelogDialog);
        }

        if (Site.options.announcement_accepted > 0) {
            // Update viewed announcements from the legacy setting
            Site.options.announcements_viewed = ANNOUNCEMENTS.slice(0, Site.options.announcement_accepted).map((announcement) => announcement.id);
            Site.options.announcement_accepted = -1;
        }

        if (ANNOUNCEMENTS.some((announcement) => !announcement.disabled && !Site.options.announcements_viewed.includes(announcement.id) && (!announcement.for || announcement.for.some((page) => Site.is(page))))) {
            Dialog.open(AnnouncementDialog);
        }

        if (Site.isType('simulator')) {
            if (Site.isEvent('april_fools_day')) {
                Dialog.open(SimulatorShopDialog);
            }
        }
    }

    Site.run();
});
