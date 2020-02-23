(function ($) {

    $.fn.context = function (command, param) {
        return this.each(function () {
            var menu = $(this);

            if (command == 'create' && param && param.items) {
                menu.addClass('css-context-menu');

                for (let item of param.items) {
                    menu.append($(`<div class="ui fluid basic button css-context-menu-item">${ item.label }</div>`).click(() => {
                        menu.context('hide');
                        item.action(this.source);
                    }));
                }

                $(window).click(() => {
                    if (this.shown) {
                        menu.context('hide');
                    }
                });

                this.startTimer = () => {
                    if (!this.timer) {
                        this.timer = setTimeout(() => menu.context('hide'), 1500);
                    }
                };

                this.stopTimer = () => {
                    if (this.timer) {
                        clearTimeout(this.timer);
                        this.timer = null;
                    }
                };

                menu.mouseenter(() => {
                    this.stopTimer();
                });

                menu.mouseleave(() => {
                    this.startTimer();
                });
            } else if (command == 'bind' && param instanceof jQuery) {
                param.contextmenu((event) => {
                    event.preventDefault();
                    event.stopPropagation();

                    var bounds = event.currentTarget.getBoundingClientRect();
                    menu.context('show', {
                        x: window.scrollX + bounds.left + bounds.width,
                        y: window.scrollY + bounds.top,
                        source: $(event.currentTarget)
                    });
                });
            } else if (command == 'show' && param.x && param.y && param.source) {
                this.source = param.source;
                menu.css('top', `${ param.y }px`).css('left', `${ param.x }px`);

                if (!this.shown) {
                    this.shown = true;
                    menu.transition('stop').transition('fade');
                }

                this.stopTimer();
                this.startTimer();
            } else if (command == 'hide' && this.shown) {
                this.shown = false;
                this.stopTimer();
                menu.transition('stop').transition('fade');
            }
        });
    };

}(jQuery));
