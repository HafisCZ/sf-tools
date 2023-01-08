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
        this.current = screen;

        window.scrollTo(0, 0);

        $('.ui.container').hide();
        screen.$parent.show();

        screen.show(... args);
        const name = screen.sha;
        if (this.buttons[name]) {
            for (const [, el] of Object.entries(this.buttons)) {
                el.classList.remove('!text-orange');
            }
            this.buttons[name].classList.add('!text-orange');
        }
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
})();
