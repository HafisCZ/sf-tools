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
        for (const [name, config] of Object.entries(configs)) {
            const tab = (this[name] = config.tab);

            tab._registeredName = name;

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

    static show (tab, args) {
        const origin = this.current;
        if (origin) origin.hide({ target: tab });

        this.#showScreen(tab);
        tab.show(Object.assign({ origin }, args));
    }

    static returnTo (tab) {
        const origin = this.current;
        if (origin) origin.hide({ target: tab });

        this.#showScreen(tab);
        tab.reload();
    }

    static #showScreen (tab) {
        this.current = tab;

        window.scrollTo(0, 0);

        $('.ui.container').hide();
        tab.$parent.show();

        if (this.#tabs[tab._registeredName].buttonElement) {
            for (const { buttonElement } of Object.values(this.#tabs)) {
                if (buttonElement) {
                    buttonElement.classList.remove('!text-orange');
                }
            }

            this.#tabs[tab._registeredName].buttonElement.classList.add('!text-orange');
        }
    }
}
