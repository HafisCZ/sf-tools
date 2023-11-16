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

    static #tabs = Object.create(null);

    static register (configs) {
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
                        this.show(tab);
                    });
                }
            }

            this.#tabs[tab._registeredName] = config;
        }
    }

    static showInitial (name, defaultName) {
        const tab = this.#tabs[name];
        if (tab && tab.buttonClickable !== false) {
            this.show(tab.tab);
        } else {
            this.show(this.#tabs[defaultName].tab);
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
        const tab = this.#tabs[this.current._registeredName];

        if (tab && tab.buttonClickable !== false) {
            const urlParams = new URLSearchParams(window.location.search);
            urlParams.set('tab', this.current._registeredName);
    
            window.history.replaceState({}, document.title, `${window.location.origin}${window.location.pathname}?${urlParams.toString().replace(/=&/g, '&').replace(/=$/, '')}`);
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
