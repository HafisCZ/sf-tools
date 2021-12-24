class View {
    constructor (parent) {
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

        $('.ui.container').addClass('css-hidden');
        screen.$parent.removeClass('css-hidden');

        screen.show(... args);
        const name = screen.constructor.name;
        if (this.buttons[name]) {
            for (const [, el] of Object.entries(this.buttons)) {
                el.classList.remove('title-active');
            }
            this.buttons[name].classList.add('title-active');
        }
    }

    register (view, id) {
        const element = document.getElementById(id);
        this.buttons[view.constructor.name] = element;
        if (element) {
            element.addEventListener('click', () => {
                this.show(view);
            });
        }
    }
})();
