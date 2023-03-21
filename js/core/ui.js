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

const UI = new (class {
    constructor () {
        this.current = null;

        this.tabs = {};
    }

    register (configs) {
        for (const [name, config] of Object.entries(configs)) {
            const tab = (this[name] = config.tab);

            tab._registeredName = name;

            if ('buttonId' in config) {
                const buttonElement = document.getElementById(config.buttonId);

                Object.assign(config, {
                    buttonElement
                })

                if (config.buttonClickable !== false) {
                    config.buttonElement.addEventListener('click', () => {
                        this.show(tab);
                    });
                }
            }

            this.tabs[tab._registeredName] = config;
        }
    }

    show (tab, args) {
        const origin = this.current;
        if (origin) origin.hide({ target: tab });

        this._showScreen(tab);
        tab.show(Object.assign({ origin }, args));
    }

    returnTo (tab) {
        const origin = this.current;
        if (origin) origin.hide({ target: tab });

        this._showScreen(tab);
        tab.reload();
    }

    _showScreen (tab) {
        this.current = tab;

        window.scrollTo(0, 0);

        $('.ui.container').hide();
        tab.$parent.show();

        if (this.tabs[tab._registeredName].buttonElement) {
            for (const { buttonElement } of Object.values(this.tabs)) {
                if (buttonElement) {
                    buttonElement.classList.remove('!text-orange');
                }
            }

            this.tabs[tab._registeredName].buttonElement.classList.add('!text-orange');
        }
    }
})();
