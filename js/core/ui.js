class View {
    constructor (parent) {
        this.sha = SHA1(String(Math.random()));
        this.$parent = $(`#${ parent }`);
    }

    show () {

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

        this.views = {};
    }

    init (controllers) {
        for (const [key, controller] of Object.entries(controllers)) {
            this[key] = controller;
        }
    }

    show (screen, args) {
        const origin = this.current;

        this._showScreen(screen);
        screen.show(Object.assign({ origin }, args));
    }

    returnTo (screen) {
        this._showScreen(screen);
        screen.reload();
    }

    register (view, id, metadata = {}) {
        const element = document.getElementById(id);

        if (element) {
            const object = Object.assign(
                {
                    buttonElement: element,
                    buttonClickable: true
                },
                metadata
            )

            if (object.buttonClickable) {
                element.addEventListener('click', () => {
                    this.show(view);
                });
            }

            this.views[view.sha] = object
        }
    }

    _showScreen (screen) {
        this.current = screen;

        window.scrollTo(0, 0);

        $('.ui.container').hide();
        screen.$parent.show();

        const name = screen.sha;
        if (this.views[name]) {
            for (const { buttonElement } of Object.values(this.views)) {
                buttonElement.classList.remove('!text-orange');
            }
            this.views[name].buttonElement.classList.add('!text-orange');
        }
    }
})();
