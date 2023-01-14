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
        this.buttons = {};
    }

    init (controllers) {
        for (const [key, controller] of Object.entries(controllers)) {
            this[key] = controller;
        }
    }

    show (screen, ... args) {
        this._showScreen(screen);
        screen.show(... args);
    }

    returnTo (screen) {
        this._showScreen(screen);
        screen.reload();
    }

    register (view, id) {
        const element = document.getElementById(id);
        this.buttons[view.sha] = element;
        if (element) {
            element.addEventListener('click', () => {
                this.show(view);
            });
        }
    }

    _showScreen (screen) {
        this.current = screen;

        window.scrollTo(0, 0);

        $('.ui.container').hide();
        screen.$parent.show();

        const name = screen.sha;
        if (this.buttons[name]) {
            for (const [, el] of Object.entries(this.buttons)) {
                el.classList.remove('!text-orange');
            }
            this.buttons[name].classList.add('!text-orange');
        }
    }
})();
