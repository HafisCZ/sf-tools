class Tab {
    constructor (parent) {
        this.$parent = $(`#${ parent }`);
    }

    show () {

    }

    hide () {

    }

    load () {

    }

    refresh () {

    }

    reload () {

    }
}

class UI {
    static current = null;

    static #options = Object.create(null);
    static #tabs = Object.create(null);

    static register (configs, options = null) {
        if (options) this.#options = options;

        for (const config of configs) {
            const tab = (this[config.tabName] = config.tab);

            tab._registeredName = config.tabName;

            if ('buttonId' in config) {
                const buttonElement = document.getElementById(config.buttonId);

                Object.assign(config, {
                    buttonElement
                })

                if (config.buttonDisabled) {
                    config.buttonElement.classList.add('disabled');
                }

                if (config.buttonClickable !== false) {
                    config.buttonElement.addEventListener('click', () => {
                        if (config.buttonReturn && this.previous && config.buttonReturn[this.current._registeredName] === this.previous._registeredName) {
                            this.show(this.previous);
                        } else {
                            this.show(tab);
                        }
                    });
                }
            }

            this.#tabs[tab._registeredName] = config;
        }

        this.#showInitial();
    }

    static #showInitial () {
        const tab = this.#tabs[this.#options.activeTab];
        if (tab && tab.buttonClickable !== false) {
            this.show(tab.tab);
        } else {
            this.show(this.#tabs[this.#options.defaultTab].tab);
        }
    }

    static show (tab, args) {
        const origin = this.current;
        if (origin) origin.hide({ target: tab });

        this.#showScreen(tab);
        tab.show(Object.assign({ origin }, args));

        this.#updateURL();
    }

    static returnTo (tab) {
        const origin = this.current;
        if (origin) origin.hide({ target: tab });

        this.#showScreen(tab);
        tab.reload();
    }

    static #updateURL () {
        const tabName = this.current._registeredName;
        const tab = this.#tabs[tabName];

        if (tab && tab.buttonClickable !== false) {
           this.#options.onTabChange?.(tabName);
        }
    }

    static #showScreen (tab) {
        this.previous = this.current;
        this.current = tab;

        window.scrollTo(0, 0);

        $('.ui.container').hide();
        tab.$parent.show();

        if (this.#tabs[tab._registeredName].buttonElement) {
            for (const { buttonElement } of Object.values(this.#tabs)) {
                if (buttonElement) {
                    buttonElement.style.color = '';
                }
            }

            this.#tabs[tab._registeredName].buttonElement.style.color = 'orange';

            if (this.previous && this.#tabs[this.previous._registeredName].buttonHistory === tab._registeredName) {
                this.#tabs[this.previous._registeredName].buttonElement.style.color = '#ffd17c';
            }
        }
    }
}
